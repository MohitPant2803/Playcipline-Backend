import mongoose from 'mongoose';

const activitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['checkin', 'completed_challenge', 'badge_earned', 'post'], required: true },
  challengeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Challenge' },
  text: String,
  image: String,
  visibility: { type: String, enum: ['personal', 'friends', 'global'], default: 'global' },
  meta: mongoose.Schema.Types.Mixed,
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    text: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export default mongoose.model('Activity', activitySchema);
