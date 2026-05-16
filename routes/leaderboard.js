import express from 'express';
import User from '../models/User.js';
import { verifyJWT } from '../middleware/auth.js';
import { getWeekStart, shouldResetWeekly } from '../utils/weeklyReset.js';

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

// Reset weekly XP for all users (admin/scheduled task)
// Can be called via cron job or admin panel
router.post('/reset-weekly', async (req, res) => {
  try {
    const currentWeekStart = getWeekStart();
    
    // Update all users' weekly XP to 0 and set lastWeeklyReset to current week start
    const result = await User.updateMany(
      {},
      { 
        $set: { 
          weeklyXP: 0,
          lastWeeklyReset: currentWeekStart
        }
      }
    );

    console.log(`Weekly leaderboard reset: ${result.modifiedCount} users updated`);
    
    res.json({ 
      message: 'Weekly XP reset for all users',
      usersReset: result.modifiedCount,
      resetTime: currentWeekStart
    });
  } catch (err) {
    console.error('Error resetting weekly leaderboard:', err.message);
    res.status(500).json({ error: 'Failed to reset weekly leaderboard', details: err.message });
  }
});

// Check if reset is needed and perform it
router.post('/check-and-reset', async (req, res) => {
  try {
    const users = await User.find({}, { _id: 1, lastWeeklyReset: 1 }).lean();
    let usersNeedingReset = 0;

    for (const user of users) {
      if (shouldResetWeekly(user.lastWeeklyReset)) {
        usersNeedingReset++;
      }
    }

    if (usersNeedingReset > 0) {
      const currentWeekStart = getWeekStart();
      await User.updateMany(
        { lastWeeklyReset: { $lt: currentWeekStart } },
        { 
          $set: { 
            weeklyXP: 0,
            lastWeeklyReset: currentWeekStart
          }
        }
      );
      console.log(`Weekly reset check: ${usersNeedingReset} users reset`);
    }

    res.json({ 
      message: usersNeedingReset > 0 ? 'Weekly reset performed' : 'No reset needed',
      usersReset: usersNeedingReset
    });
  } catch (err) {
    console.error('Error in check-and-reset:', err.message);
    res.status(500).json({ error: 'Failed to check and reset', details: err.message });
  }
});

// Get reset endpoint (legacy support)
router.get('/reset', async (req, res) => {
  try {
    const currentWeekStart = getWeekStart();
    
    const result = await User.updateMany({}, { $set: { weeklyXP: 0, lastWeeklyReset: currentWeekStart } });
    res.json({ message: 'Weekly XP reset for all users', usersReset: result.modifiedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Hard reset all users to level 0 and 0 XP (For development/admin purposes)
router.post('/hard-reset-all', async (req, res) => {
  try {
    const result = await User.updateMany(
      {},
      { 
        $set: { 
          totalXP: 0,
          weeklyXP: 0,
          level: 0,
          globalStreak: 0,
          longestStreak: 0
        }
      }
    );
    res.json({ message: 'All users have been reset to level 0', usersReset: result.modifiedCount });
  } catch (err) {
    console.error('Error resetting users:', err.message);
    res.status(500).json({ error: 'Failed to reset users', details: err.message });
  }
});

export default router;
