# Playcipline Backend

A gamified productivity backend built with Express.js and MongoDB, featuring challenge tracking, check-ins, leaderboards, and user progression systems.

## Features

- 🔐 User Authentication (Google OAuth + JWT)
- 🎯 Challenge Management
- ✅ Daily Check-in System
- 🏆 Leaderboards
- 📊 Activity Feed
- 🎮 Gamification (XP, Levels, Badges, Streaks)

## Tech Stack

- **Runtime:** Node.js (ES Modules)
- **Framework:** Express.js
- **Database:** MongoDB (with Mongoose ODM)
- **Authentication:** Passport.js, JWT
- **Deployment:** Vercel (Serverless)

## Quick Start

### Prerequisites

- Node.js 18+ 
- MongoDB connection string (MongoDB Atlas recommended)
- Google OAuth credentials (for Google Sign-In)

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   - `MONGODB_URI` - Your MongoDB connection string
   - `JWT_SECRET` - Secret key for JWT tokens
   - `GOOGLE_CLIENT_ID` - Google OAuth client ID
   - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
   - `ALLOWED_ORIGINS` - Comma-separated list of allowed frontend origins

3. **Run the development server**
   ```bash
   npm run dev
   ```
   Server will start on `http://localhost:5000`

4. **Seed mock data (optional)**
   ```bash
   npm run seed
   ```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/google` | GET | Initiate Google OAuth |
| `/api/auth/google/callback` | GET | Google OAuth callback |
| `/api/auth/dev-login` | POST | Development login (disabled in production) |
| `/api/auth/me` | GET | Get current user |
| `/api/auth/me` | PUT | Update user profile |
| `/api/challenges` | GET/POST | Manage challenges |
| `/api/checkin` | POST | Daily check-in |
| `/api/leaderboard` | GET | View leaderboards |
| `/api/feed` | GET | Activity feed |
| `/api/users` | GET | User management |

## Deployment to Vercel

This project is configured for seamless Vercel deployment.

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel --prod
```

### Option 2: Deploy via Vercel Dashboard

1. Push your code to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Import your repository
4. Configure environment variables in Vercel project settings:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `ALLOWED_ORIGINS`
   - `CLIENT_URL`
5. Deploy

### Environment Variables for Vercel

Set these in your Vercel project settings (Settings → Environment Variables):

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string (use MongoDB Atlas for cloud DB) |
| `JWT_SECRET` | Secret key for JWT token signing |
| `GOOGLE_CLIENT_ID` | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth 2.0 Client Secret |
| `GOOGLE_CALLBACK_URL` | OAuth callback URL (e.g., `https://your-app.vercel.app/api/auth/google/callback`) |
| `ALLOWED_ORIGINS` | Comma-separated list of allowed CORS origins |
| `CLIENT_URL` | Frontend URL for OAuth redirects |
| `NODE_ENV` | Set to `production` (auto-set by Vercel) |

### Serverless Considerations

This app is optimized for Vercel's serverless environment:

- **MongoDB Connection Caching:** Uses global connection reuse to avoid connection limits
- **Session Handling:** Express-session is automatically disabled in serverless mode (uses JWT instead)
- **Cold Start Optimization:** Lazy database connections

## Project Structure

```
├── index.js              # Main Express app entry point
├── vercel.json           # Vercel deployment configuration
├── .env.example          # Environment variables template
├── routes/               # API route handlers
│   ├── auth.js          # Authentication routes
│   ├── challenges.js    # Challenge management
│   ├── checkin.js       # Daily check-ins
│   ├── feed.js          # Activity feed
│   ├── leaderboard.js   # Leaderboard
│   ├── users.js         # User management
│   └── mockData.js      # Mock data endpoints
├── models/               # MongoDB schemas
│   ├── User.js
│   ├── Challenge.js
│   ├── Activity.js
│   └── Completion.js
├── middleware/           # Express middleware
│   └── auth.js          # JWT authentication middleware
├── utils/                # Utility functions
│   └── leveling.js      # XP/Level calculations
└── scripts/              # Utility scripts
    └── seed.js          # Database seeding
```

## Development Commands

```bash
npm run dev      # Start development server with nodemon
npm start        # Start production server
npm run seed     # Seed database with mock data
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

MIT