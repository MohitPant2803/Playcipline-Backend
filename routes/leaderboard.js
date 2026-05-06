import express from 'express';
import User from '../models/User.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get global leaderboard (weekly XP)
router.get('/global', verifyJWT, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    
    // Get top 50 users by weeklyXP
    const topUsers = await User.find({}, { name: 1, avatar: 1, weeklyXP: 1, level: 1, totalXP: 1 })
      .sort({ weeklyXP: -1 })
      .limit(50)
      .lean();

    // Add rank
    const leaderboard = topUsers.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    // Find current user's rank
    const allUsers = await User.find({}, { _id: 1, weeklyXP: 1 })
      .sort({ weeklyXP: -1 })
      .lean();
    const userRank = allUsers.findIndex(u => u._id.toString() === currentUserId) + 1;

    // If user not in top 50, append them
    let finalLeaderboard = leaderboard;
    if (userRank > 50) {
      const currentUser = await User.findById(currentUserId).lean();
      finalLeaderboard.push({
        ...currentUser,
        rank: userRank
      });
    }

    res.json({
      leaderboard: finalLeaderboard,
      currentUserRank: userRank
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/friends', verifyJWT, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
    const friendIds = [currentUserId, ...(currentUser?.following || [])];

    const users = await User.find(
      { _id: { $in: friendIds } },
      { name: 1, avatar: 1, weeklyXP: 1, level: 1, totalXP: 1 }
    )
      .sort({ weeklyXP: -1 })
      .lean();

    const leaderboard = users.map((user, index) => ({
      ...user,
      rank: index + 1
    }));

    const userRank = leaderboard.findIndex(user => user._id.toString() === currentUserId) + 1;

    res.json({
      leaderboard,
      currentUserRank: userRank
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reset weekly XP (cron job)
router.get('/reset', async (req, res) => {
  try {
    await User.updateMany({}, { $set: { weeklyXP: 0 } });
    res.json({ message: 'Weekly XP reset for all users' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
