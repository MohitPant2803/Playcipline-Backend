import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import passport from 'passport';

import authRoutes from './routes/auth.js';
import challengeRoutes from './routes/challenges.js';
import checkinRoutes from './routes/checkin.js';
import leaderboardRoutes from './routes/leaderboard.js';
import feedRoutes from './routes/feed.js';
import mockDataRoutes from './routes/mockData.js';
import userRoutes from './routes/users.js';
import { initializeJobs, stopJobs } from './jobs/scheduler.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
let databaseReady = false;

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

// Connection caching for serverless environments to avoid reconnecting
const globalAny = global;
if (!globalAny.__mongo_cache) globalAny.__mongo_cache = { promise: null };

async function ensureMongo() {
  if (isDatabaseConnected()) return;
  
  const mongoUri = process.env.MONGODB_URI;
  
  if (!mongoUri || mongoUri.includes('<')) {
    console.warn('MongoDB URI not configured, skipping connection');
    return;
  }

  if (!globalAny.__mongo_cache.promise) {
    globalAny.__mongo_cache.promise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000
      })
      .then((client) => {
        databaseReady = true;
        console.log('MongoDB connected (cached)');
        return client;
      })
      .catch((err) => {
        console.error('MongoDB connection error:', err && err.message ? err.message : err);
        globalAny.__mongo_cache.promise = null;
        throw err;
      });
  }

  await globalAny.__mongo_cache.promise;
}

// Async middleware that ensures DB is connected before route handlers that need it.
async function requireDatabase(req, res, next) {
  try {
    if (!isDatabaseConnected()) {
      await ensureMongo();
    }

    if (isDatabaseConnected()) return next();

    return res.status(503).json({
      error: 'Database unavailable',
      message: 'MongoDB is not connected. Check MONGODB_URI and make sure MongoDB is running.'
    });
  } catch (err) {
    return res.status(503).json({
      error: 'Database connection failed',
      message: err && err.message ? err.message : String(err)
    });
  }
}
app.use((req, res, next) => {
  const origin = req.headers.origin;
  // Use your logic or just allow your specific frontend
  res.setHeader('Access-Control-Allow-Origin', origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  // Immediately respond to OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// Middleware
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, cURL, Postman, etc.)
    if (!origin) return callback(null, true);
    
    // Build allowed origins from environment variables
    let allowedOrigins = [];
    
    // Add frontend URL
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    } else if (process.env.CLIENT_URL) {
      allowedOrigins.push(process.env.CLIENT_URL);
    }
    
    // Add default development URL if not already present
    if (!allowedOrigins.includes('http://localhost:5173')) {
      allowedOrigins.push('http://localhost:5173');
    }
    if (!allowedOrigins.includes('http://localhost:3000')) {
      allowedOrigins.push('http://localhost:3000');
    }
    
    // Parse additional origins if provided
    if (process.env.ALLOWED_ORIGINS) {
      const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim());
      allowedOrigins = [...new Set([...allowedOrigins, ...additionalOrigins])]; // Remove duplicates
    }
    
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, true); // Allow all for development debugging
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(cookieParser());

const isServerless = !!process.env.VERCEL;

if (!isServerless) {
  app.use(session({
    secret: process.env.JWT_SECRET || 'dev-secret',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, secure: isProduction, sameSite: 'lax' }
  }));
  app.use(passport.initialize());
  app.use(passport.session());
} else {
  app.use(passport.initialize());
  console.warn('Running in Vercel serverless mode: express-session skipped. Use JWT or external session store for persistent sessions.');
}

// Connect to MongoDB lazily via ensureMongo() to support serverless environments.
const mongoUri = process.env.MONGODB_URI;
if (!mongoUri || mongoUri.includes('<')) {
  console.warn('MongoDB not configured: set MONGODB_URI to enable database-backed features.');
} else {
  // Attempt initial connection on startup
  ensureMongo().catch(err => {
    console.error('Failed to connect to MongoDB on startup:', err.message);
  });
}

// Apply database middleware to all routes
app.use(requireDatabase);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api', mockDataRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/checkin', checkinRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/feed', feedRoutes);
app.use('/api/users', userRoutes);

// Initialize scheduled jobs (for non-serverless environments)
if (!process.env.VERCEL) {
  try {
    initializeJobs();
  } catch (err) {
    console.error('Failed to initialize scheduled jobs:', err.message);
  }
}

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: databaseReady && isDatabaseConnected() ? 'connected' : 'not_connected'
  });
});

// For local development
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  const server = app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Stop the existing process or set PORT to another value in server/.env.`);
      process.exit(1);
    }

    throw err;
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully...');
    stopJobs();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully...');
    stopJobs();
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}

// Export for Vercel serverless
export default app;
