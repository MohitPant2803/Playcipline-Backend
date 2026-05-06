import mongoose from 'mongoose';

const completionSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  challengeId: mongoose.Schema.Types.ObjectId,
  userChallengeId: mongoose.Schema.Types.ObjectId,
  date: String, // ISO date "YYYY-MM-DD"
  xpEarned: Number,
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Completion', completionSchema);
