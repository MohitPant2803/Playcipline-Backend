import mongoose from 'mongoose';

const userChallengeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge', required: true },
  mode: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
  startDate: { type: Date, default: Date.now },
  completedDays: { type: Number, default: 0 },
  requiredDays: { type: Number, required: true },
  currentStreak: { type: Number, default: 0 },
  longestStreak: { type: Number, default: 0 },
  lastCheckIn: Date,
  status: { type: String, enum: ['active', 'completed', 'failed', 'abandoned'], default: 'active' },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('UserChallenge', userChallengeSchema);
