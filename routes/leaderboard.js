import express from 'express';
import User from '../models/User.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get current user's rank in global leaderboard - REQUIRES LOGIN
// MUST be before '/global' route to be matched first
router.get('/global/my-rank', verifyJWT, async (req, res) => {
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
    console.error('Error fetching user rank:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard', details: err.message });
  }
});

// Get global leaderboard (weekly XP) - PUBLIC, no auth required
// PLACED AFTER '/global/my-rank' so it doesn't interfere
router.get('/global', async (req, res) => {
  try {
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

    res.json({
      leaderboard: leaderboard,
      currentUserRank: null
    });
  } catch (err) {
    console.error('Error fetching global leaderboard:', err.message);
    res.status(500).json({ error: 'Failed to load leaderboard', details: err.message });
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
    console.error('Error fetching friends leaderboard:', err.message);
    res.status(500).json({ error: 'Failed to load friends leaderboard', details: err.message });
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
