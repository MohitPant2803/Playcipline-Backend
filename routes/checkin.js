import express from 'express';
import UserChallenge from '../models/UserChallenge.js';
import Completion from '../models/Completion.js';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import Challenge from '../models/Challenge.js';
import { verifyJWT } from '../middleware/auth.js';
import { getLevelInfo } from '../utils/leveling.js';

const router = express.Router();

// Helper function to compute today's date string
// Reset happens at 12:01 AM, so before that, it's still "yesterday"
function getTodayStr() {
  const now = new Date();
  let dateToUse = new Date(now);
  
  // If we're before 12:01 AM, use yesterday's date
  if (now.getHours() === 0 && now.getMinutes() < 1) {
    dateToUse.setDate(dateToUse.getDate() - 1);
  }
  
  return dateToUse.toISOString().slice(0, 10);
}

// Helper function to get yesterday's date string (relative to getTodayStr logic)
function getYesterdayStr() {
  const today = getTodayStr();
  const todayDate = new Date(today + 'T00:00:00Z');
  const yesterday = new Date(todayDate);
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday.toISOString().slice(0, 10);
}

// Helper function to award badges
function awardBadge(user, userChallenge, challenge) {
  const badges = [];
  badges.push(`${challenge.duration}-day`);
  if (userChallenge.mode === 'hard') badges.push('hard-mode');
  if (userChallenge.currentStreak === challenge.duration) badges.push('perfect-streak');
  user.badges = [...new Set([...(user.badges || []), ...badges])];
}

// Check-in endpoint
router.post('/', verifyJWT, async (req, res) => {
  try {
    const { userChallengeId } = req.body;
    const userId = req.user._id;

    // Step 1: Load UserChallenge and verify ownership and status
    const userChallenge = await UserChallenge.findById(userChallengeId);
    if (!userChallenge) {
      return res.status(404).json({ error: 'UserChallenge not found' });
    }
    if (userChallenge.userId.toString() !== userId) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (userChallenge.status !== 'active') {
      return res.status(400).json({ error: 'Challenge is not active' });
    }

    // Step 2: Compute today's date string
    const todayStr = getTodayStr();

    // Step 3: Check if already checked in today
    const alreadyCheckedIn = await Completion.findOne({
      userId,
      userChallengeId,
      date: todayStr
    });
    if (alreadyCheckedIn) {
      return res.status(400).json({ error: 'Already checked in today' });
    }

    // Step 4: Calculate XP earned
    const XP_MAP = { easy: 10, medium: 20, hard: 30 };
    let xpEarned = XP_MAP[userChallenge.mode];

    // Step 5: Update streak
    const yesterdayStr = getYesterdayStr();
    const lastCheckInStr = userChallenge.lastCheckIn 
      ? userChallenge.lastCheckIn.toISOString().slice(0, 10)
      : null;

    if (lastCheckInStr === yesterdayStr) {
      userChallenge.currentStreak++;
    } else if (lastCheckInStr !== todayStr) {
      userChallenge.currentStreak = 1;
    }
    userChallenge.longestStreak = Math.max(userChallenge.longestStreak, userChallenge.currentStreak);

    // Step 6: Increment completed days
    userChallenge.completedDays++;

    // Step 7: Update lastCheckIn
    userChallenge.lastCheckIn = new Date();

    // Step 8: Check for hard mode failure (missed days)
    const daysSinceStart = Math.floor((Date.now() - userChallenge.startDate.getTime()) / 86400000);
    const expectedDays = daysSinceStart + 1;
    if (userChallenge.mode === 'hard' && userChallenge.completedDays < expectedDays) {
      userChallenge.status = 'failed';
    }

    // Step 9: Check for completion
    let completionActivity = null;
    if (userChallenge.completedDays >= userChallenge.requiredDays && userChallenge.status !== 'failed') {
      userChallenge.status = 'completed';
      const BONUS_MAP = { easy: 50, medium: 100, hard: 250 };
      xpEarned += BONUS_MAP[userChallenge.mode];

      // Award badges
      const challenge = await Challenge.findById(userChallenge.challengeId);
      const user = await User.findById(userId);
      awardBadge(user, userChallenge, challenge);
      await user.save();

      // Create completion activity
      completionActivity = new Activity({
        userId,
        type: 'completed_challenge',
        challengeId: userChallenge.challengeId,
        meta: { mode: userChallenge.mode, duration: challenge.duration }
      });
      await completionActivity.save();
    }

    // Step 10: Save UserChallenge
    await userChallenge.save();

    // Step 11: Update User XP and level
    const user = await User.findById(userId);
    user.totalXP += xpEarned;
    user.weeklyXP += xpEarned;
    user.level = getLevelInfo(user.totalXP).level;

    // User-level streak: one completed task can extend the user's daily streak.
    const lastActiveDateStr = user.lastActiveDate
      ? user.lastActiveDate.toISOString().slice(0, 10)
      : null;
    if (lastActiveDateStr === yesterdayStr) {
      user.globalStreak = (user.globalStreak || 0) + 1;
    } else if (lastActiveDateStr !== todayStr) {
      user.globalStreak = 1;
    }
    user.longestStreak = Math.max(user.longestStreak || 0, user.globalStreak || 0);
    user.lastActiveDate = new Date();
    await user.save();

    // Step 12: Save Completion doc
    const completion = new Completion({
      userId,
      challengeId: userChallenge.challengeId,
      userChallengeId,
      date: todayStr,
      xpEarned
    });
    await completion.save();

    // Step 13: Create checkin activity
    const checkinActivity = new Activity({
      userId,
      type: 'checkin',
      challengeId: userChallenge.challengeId,
      meta: { day: userChallenge.completedDays, mode: userChallenge.mode }
    });
    await checkinActivity.save();

    // Step 14: Return response
    res.json({
      xpEarned,
      currentStreak: userChallenge.currentStreak,
      completedDays: userChallenge.completedDays,
      longestStreakChallenge: userChallenge.longestStreak,
      status: userChallenge.status,
      totalXP: user.totalXP,
      level: user.level,
      globalStreak: user.globalStreak,
      longestStreak: user.longestStreak,
      lastActiveDate: user.lastActiveDate
    });

  } catch (err) {
    console.error('Error during check-in:', err.message);
    res.status(500).json({ error: 'Failed to check in', details: err.message });
  }
});

// Get today's check-in status
router.get('/today-status', verifyJWT, async (req, res) => {
  try {
    const todayStr = getTodayStr();
    const completions = await Completion.find({
      userId: req.user._id,
      date: todayStr
    });
    const checkedInIds = completions.map(c => c.userChallengeId.toString());
    res.json(checkedInIds);
  } catch (err) {
    console.error('Error fetching check-in status:', err.message);
    res.status(500).json({ error: 'Failed to load check-in status', details: err.message });
  }
});

export default router;
