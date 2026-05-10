import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  googleId: String,
  name: String,
  email: { type: String, unique: true },
  avatar: String,
  googleName: String,
  googleAvatar: String,
  location: String,
  bio: String,
  totalXP: { type: Number, default: 0 },
  weeklyXP: { type: Number, default: 0 },
  level: { type: Number, default: 1 },
  globalStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastActiveDate: Date,
  badges: [{ type: String }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('User', userSchema);
