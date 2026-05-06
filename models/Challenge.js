import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  title: String,
  description: String,
  duration: { type: Number, enum: [7, 21, 75] },
  baseDifficulty: { type: Number, min: 1, max: 3 },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPublic: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Challenge', challengeSchema);
