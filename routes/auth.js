import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { verifyJWT } from '../middleware/auth.js';
import mongoose from 'mongoose';
import { getLevelInfo } from '../utils/leveling.js';

const router = express.Router();
const isProduction = process.env.NODE_ENV === 'production';
const jwtSecret = () => process.env.JWT_SECRET || 'dev-secret';

// Connection caching for serverless environments
const globalAny = global;
if (!globalAny.__mongo_cache) globalAny.__mongo_cache = { promise: null };

// Initialize passport strategy only once
let strategyInitialized = false;

function isDatabaseConnected() {
  return mongoose.connection.readyState === 1;
}

async function ensureMongo() {
  if (isDatabaseConnected()) return;
  
  const mongoUri = process.env.MONGODB_URI;
  
  console.log('Attempting MongoDB connection...');
  console.log('mongoUri exists:', !!mongoUri);
  console.log('mongoUri length:', mongoUri ? mongoUri.length : 0);
  
  if (!mongoUri) {
    console.error('MONGODB_URI is not set in environment variables');
    throw new Error('MONGODB_URI environment variable is missing');
  }
  
  if (mongoUri.includes('<')) {
    console.error('MONGODB_URI contains template brackets: ' + mongoUri);
    throw new Error('MONGODB_URI is a template, not a valid connection string');
  }
  
  if (!mongoUri.startsWith('mongodb://') && !mongoUri.startsWith('mongodb+srv://')) {
    console.error('Invalid MONGODB_URI format:', mongoUri.substring(0, 50) + '...');
    throw new Error('MONGODB_URI must start with mongodb:// or mongodb+srv://');
  }

  if (!globalAny.__mongo_cache.promise) {
    globalAny.__mongo_cache.promise = mongoose
      .connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 5000
      })
      .then((client) => {
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

// Async middleware that ensures DB is connected before route handlers
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

function ensureStrategyInitialized() {
  if (!strategyInitialized) {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
    
    console.log('=== Google OAuth Configuration ===');
    console.log('Client ID:', clientId ? `${clientId.substring(0, 10)}...` : 'NOT SET');
    console.log('Client Secret:', clientSecret ? 'SET' : 'NOT SET');
    console.log('Callback URL:', callbackUrl);
    console.log('Frontend URL:', process.env.FRONTEND_URL || 'http://localhost:5173');
    console.log('==================================');
    
    if (!clientId || !clientSecret) {
      console.warn('⚠️ Warning: GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not set');
    }
    
    passport.use(new GoogleStrategy({
      clientID: clientId || '',
      clientSecret: clientSecret || '',
      callbackURL: callbackUrl
    }, async (accessToken, refreshToken, profile, done) => {
      try {
        // Extract email safely
        const email = profile.emails?.[0]?.value;
        
        console.log('Google user authenticated:');
        console.log('  - Display Name:', profile.displayName);
        console.log('  - Email:', email);
        console.log('  - Google ID:', profile.id);
        
        if (!email) {
          const err = new Error('Email not provided by Google OAuth');
          console.error(err.message);
          return done(err, null);
        }
        
        // Ensure MongoDB is connected before processing the user
        await ensureMongo();
        
        if (!isDatabaseConnected()) {
          return done(new Error('MongoDB is not connected after connection attempt'), null);
        }

        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
          console.log('Creating new user:', email);
          user = new User({
            googleId: profile.id,
            name: profile.displayName,
            googleName: profile.displayName,
            email: email,
            avatar: profile.photos?.[0]?.value || '',
            googleAvatar: profile.photos?.[0]?.value || ''
          });
          await user.save();
          console.log('User created successfully:', user._id);
        } else {
          console.log('User already exists:', email);
          user.googleName = profile.displayName;
          user.googleAvatar = profile.photos?.[0]?.value || user.googleAvatar || '';
          if (!user.name) user.name = user.googleName;
          if (!user.avatar) user.avatar = user.googleAvatar;
          await user.save();
          console.log('User updated successfully:', user._id);
        }
        return done(null, user);
      } catch (err) {
        console.error('Passport strategy error:', err.message || err);
        return done(err, null);
      }
    }));

    passport.serializeUser((user, done) => {
      done(null, user.id);
    });

    passport.deserializeUser(async (id, done) => {
      try {
        if (!isDatabaseConnected()) {
          return done(null, null);
        }

        const user = await User.findById(id);
        done(null, user);
      } catch (err) {
        done(err, null);
      }
    });

    strategyInitialized = true;
  }
}

function serializeUserForClient(user) {
  const levelInfo = getLevelInfo(user.totalXP || 0);

  return {
    _id: user._id,
    name: user.name || user.googleName,
    email: user.email,
    avatar: user.avatar || user.googleAvatar,
    location: user.location,
    totalXP: user.totalXP || 0,
    weeklyXP: user.weeklyXP || 0,
    level: levelInfo.level,
    globalStreak: user.globalStreak || 0,
    badges: user.badges || [],
    followerCount: user.followers?.length || 0,
    followingCount: user.following?.length || 0
  };
}

// Initialize on first request
router.use((req, res, next) => {
  ensureStrategyInitialized();
  next();
});

// Google OAuth initiate
router.get('/google', passport.authenticate('google', {
  scope: ['profile', 'email'],
  prompt: 'select_account'
}));

// Google OAuth callback with proper error handling
router.get('/google/callback', requireDatabase, (req, res, next) => {
  console.log('OAuth callback route hit');
  passport.authenticate('google', { session: false }, (err, user, info) => {
    console.log('Passport callback:');
    console.log('  - Error:', err ? err.message : 'none');
    console.log('  - User:', user ? user._id : 'none');
    console.log('  - Info:', info);
    
    if (err) {
      console.error('Passport authentication error:', err);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?error=${encodeURIComponent(err.message)}`);
    }
    
    if (!user) {
      console.error('No user returned from Google:', info);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/?error=Authentication failed`);
    }
    
    try {
      const payload = serializeUserForClient(user);
      const token = jwt.sign(payload, jwtSecret(), { expiresIn: '7d' });
      
      console.log('Token generated successfully, redirecting to:', process.env.FRONTEND_URL);
      
      // Use environment variable - works for both development and production
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/dashboard?token=${token}`);
    } catch (tokenErr) {
      console.error('Token generation error:', tokenErr);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      res.redirect(`${frontendUrl}/?error=Token generation failed`);
    }
  })(req, res, next);
});

// Test endpoint to verify backend is working
router.get('/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Backend is working',
    frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    time: new Date().toISOString()
  });
});

// Local development login. This keeps the UI usable before Google OAuth is configured.
router.post('/dev-login', (req, res) => {
  if (isProduction && process.env.ENABLE_DEV_LOGIN !== 'true') {
    return res.status(404).json({ error: 'Not found' });
  }

  const user = {
    _id: '000000000000000000000001',
    name: 'Demo User',
    email: 'demo@streakify.local',
    avatar: '',
    location: '',
    totalXP: 120,
    weeklyXP: 120,
    level: getLevelInfo(120).level,
    globalStreak: 3,
    badges: [],
    followerCount: 0,
    followingCount: 0
  };

  const token = jwt.sign(user, jwtSecret(), { expiresIn: '7d' });
  res.json({ user, token });
});

// Get current user
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization header' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, jwtSecret());

    if (mongoose.connection.readyState !== 1) {
      return res.json(decoded);
    }

    const user = await User.findById(decoded._id).lean();
    if (!user) {
      return res.json(decoded);
    }

    res.json(serializeUserForClient(user));
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

router.put('/me', requireDatabase, verifyJWT, async (req, res) => {
  const allowedUpdates = {
    name: String(req.body.name || '').trim(),
    avatar: String(req.body.avatar || '').trim(),
    location: String(req.body.location || '').trim()
  };

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.name = allowedUpdates.name || user.googleName || user.name;
    user.avatar = allowedUpdates.avatar || user.googleAvatar || user.avatar;
    user.location = allowedUpdates.location;
    await user.save();

    const payload = serializeUserForClient(user);
    const token = jwt.sign(payload, jwtSecret(), { expiresIn: '7d' });
    res.json({ user: payload, token });
  } catch (err) {
    console.error('Error updating user profile:', err.message);
    res.status(500).json({ error: 'Failed to update profile', details: err.message });
  }
});

export default router;
