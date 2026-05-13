import express from 'express';
import mongoose from 'mongoose';
import { verifyJWT } from '../middleware/auth.js';
import { getLevelInfo } from '../utils/leveling.js';

const router = express.Router();

const demoUser = {
  _id: '000000000000000000000001',
  name: 'Demo User',
  email: 'demo@streakify.local',
  avatar: '',
  googleName: 'Demo User',
  googleAvatar: '',
  location: '',
  totalXP: 120,
  weeklyXP: 120,
  level: getLevelInfo(120).level,
  globalStreak: 3,
  longestStreak: 3,
  lastActiveDate: null,
  badges: [],
  following: [],
  followers: []
};

const demoUsers = [
  demoUser,
  {
    _id: '000000000000000000000002',
    name: 'Sample Streaker',
    email: 'sample@streakify.local',
    avatar: '',
    googleName: 'Sample Streaker',
    googleAvatar: '',
    location: 'Mumbai, India',
    totalXP: 90,
    weeklyXP: 90,
    level: getLevelInfo(90).level,
    globalStreak: 2,
    longestStreak: 2,
    lastActiveDate: null,
    badges: [],
    following: [],
    followers: []
  },
  {
    _id: '000000000000000000000003',
    name: 'Aarav Sharma',
    email: 'aarav@streakify.local',
    avatar: '',
    googleName: 'Aarav Sharma',
    googleAvatar: '',
    location: 'Delhi, India',
    totalXP: 340,
    weeklyXP: 150,
    level: getLevelInfo(340).level,
    globalStreak: 8,
    longestStreak: 8,
    lastActiveDate: null,
    badges: ['perfect-streak'],
    following: [],
    followers: []
  }
];

const challenges = [
  {
    _id: '100000000000000000000001',
    title: 'Morning Walk',
    description: 'Walk for at least 20 minutes each morning.',
    duration: 7,
    baseDifficulty: 1,
    isPublic: true
  },
  {
    _id: '100000000000000000000002',
    title: 'Deep Work Block',
    description: 'Complete one focused 60-minute work session every day.',
    duration: 21,
    baseDifficulty: 2,
    isPublic: true
  },
  {
    _id: '100000000000000000000003',
    title: '75-Day Fitness Reset',
    description: 'Train, hydrate, and stay consistent for the full reset.',
    duration: 75,
    baseDifficulty: 3,
    isPublic: true
  }
];

const userChallenges = [];
const checkedInToday = new Set();
const MAX_ACTIVE_CHALLENGES = 3;
const activities = [
  {
    _id: '300000000000000000000001',
    userId: demoUser,
    challengeId: challenges[0],
    type: 'checkin',
    meta: { day: 1, mode: 'easy' },
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  },
  {
    _id: '300000000000000000000002',
    userId: demoUsers[1],
    challengeId: challenges[1],
    type: 'checkin',
    meta: { day: 4, mode: 'medium' },
    likes: [],
    comments: [],
    createdAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    _id: '300000000000000000000003',
    userId: demoUsers[2],
    challengeId: challenges[2],
    type: 'completed_challenge',
    meta: { mode: 'hard' },
    likes: [],
    comments: [],
    createdAt: new Date(Date.now() - 7200000).toISOString()
  }
];

function useMockData(req, res, next) {
  if (mongoose.connection.readyState === 1 || process.env.ENABLE_MOCK_DATA === 'false') {
    return next('router');
  }

  next();
}

router.use(useMockData);

router.get('/challenges', verifyJWT, (req, res) => {
  res.json(challenges);
});

router.get('/challenges/enrollable', verifyJWT, (req, res) => {
  const activeEnrollments = userChallenges.filter(item => (
    item.userId === req.user._id && item.status === 'active'
  ));
  const enrollmentsByChallengeId = new Map(
    activeEnrollments.map(enrollment => [enrollment.challengeId._id, enrollment])
  );

  res.json(challenges.map(challenge => {
    const enrollment = enrollmentsByChallengeId.get(challenge._id);
    return {
      ...challenge,
      isJoined: !!enrollment,
      enrollmentId: enrollment?._id || null,
      enrollmentMode: enrollment?.mode || null,
      activeEnrollmentCount: activeEnrollments.length,
      maxActiveChallenges: MAX_ACTIVE_CHALLENGES
    };
  }));
});

router.get('/users/search', verifyJWT, (req, res) => {
  const query = String(req.query.q || '').trim().toLowerCase();
  const currentUser = demoUsers.find(user => user._id === req.user._id) || demoUser;

  if (query.length < 2) {
    return res.json([]);
  }

  const results = demoUsers
    .filter(user => (
      user.name.toLowerCase().includes(query) ||
      user.email.toLowerCase().includes(query)
    ))
    .slice(0, 8)
    .map(user => ({
      ...user,
      isCurrentUser: user._id === currentUser._id,
      isFollowing: currentUser.following.includes(user._id),
      followerCount: user.followers.length
    }));

  res.json(results);
});

router.post('/users/:id/follow', verifyJWT, (req, res) => {
  const currentUser = demoUsers.find(user => user._id === req.user._id) || demoUser;
  const targetUser = demoUsers.find(user => user._id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (targetUser._id === currentUser._id) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  if (!currentUser.following.includes(targetUser._id)) {
    currentUser.following.push(targetUser._id);
  }

  if (!targetUser.followers.includes(currentUser._id)) {
    targetUser.followers.push(currentUser._id);
  }

  res.json({ isFollowing: true });
});

router.delete('/users/:id/follow', verifyJWT, (req, res) => {
  const currentUser = demoUsers.find(user => user._id === req.user._id) || demoUser;
  const targetUser = demoUsers.find(user => user._id === req.params.id);

  if (!targetUser) {
    return res.status(404).json({ error: 'User not found' });
  }

  currentUser.following = currentUser.following.filter(id => id !== targetUser._id);
  targetUser.followers = targetUser.followers.filter(id => id !== currentUser._id);

  res.json({ isFollowing: false });
});

router.get('/challenges/my-challenges', verifyJWT, (req, res) => {
  res.json(userChallenges);
});

router.get('/challenges/user/:userId/active', (req, res) => {
  const active = userChallenges.filter(c => c.userId === req.params.userId && c.status === 'active');
  res.json(active);
});

router.put('/auth/me', verifyJWT, (req, res) => {
  const currentUser = demoUsers.find(user => user._id === req.user._id) || demoUser;

  currentUser.name = String(req.body.name || '').trim() || currentUser.googleName || currentUser.name;
  currentUser.avatar = String(req.body.avatar || '').trim() || currentUser.googleAvatar || currentUser.avatar;
  currentUser.location = String(req.body.location || '').trim();

  res.json({
    user: currentUser,
    token: req.headers.authorization?.slice(7) || ''
  });
});

router.post('/challenges/:id/join', verifyJWT, (req, res) => {
  const { mode } = req.body;
  const challenge = challenges.find(item => item._id === req.params.id);

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (!['easy', 'medium', 'hard'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  const existing = userChallenges.find(item => (
    item.userId === req.user._id &&
    item.challengeId._id === challenge._id &&
    item.status === 'active'
  ));

  if (existing) {
    return res.status(400).json({ error: 'Already have an active version of this challenge' });
  }

  const activeCount = userChallenges.filter(item => (
    item.userId === req.user._id && item.status === 'active'
  )).length;
  if (activeCount >= MAX_ACTIVE_CHALLENGES) {
    return res.status(400).json({ error: `You can only have ${MAX_ACTIVE_CHALLENGES} active challenges at a time` });
  }

  const requiredDays = mode === 'easy' ? Math.floor(challenge.duration * 0.8) : challenge.duration;
  const userChallenge = {
    _id: `20000000000000000000000${userChallenges.length + 1}`,
    userId: req.user._id,
    challengeId: challenge,
    mode,
    startDate: new Date().toISOString(),
    completedDays: 0,
    requiredDays,
    currentStreak: 0,
    longestStreak: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  userChallenges.push(userChallenge);
  res.status(201).json(userChallenge);
});

router.post('/challenges/enroll', verifyJWT, (req, res) => {
  const { challengeId, mode } = req.body;
  const challenge = challenges.find(item => item._id === challengeId);

  if (!challenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (!['easy', 'medium', 'hard'].includes(mode)) {
    return res.status(400).json({ error: 'Invalid mode' });
  }

  const existing = userChallenges.find(item => (
    item.userId === req.user._id &&
    item.challengeId._id === challenge._id &&
    item.status === 'active'
  ));

  if (existing) {
    return res.status(400).json({ error: 'Already have an active version of this challenge' });
  }

  const activeCount = userChallenges.filter(item => (
    item.userId === req.user._id && item.status === 'active'
  )).length;
  if (activeCount >= MAX_ACTIVE_CHALLENGES) {
    return res.status(400).json({ error: `You can only have ${MAX_ACTIVE_CHALLENGES} active challenges at a time` });
  }

  const requiredDays = mode === 'easy' ? Math.floor(challenge.duration * 0.8) : challenge.duration;
  const userChallenge = {
    _id: `20000000000000000000000${userChallenges.length + 1}`,
    userId: req.user._id,
    challengeId: challenge,
    mode,
    startDate: new Date().toISOString(),
    completedDays: 0,
    requiredDays,
    currentStreak: 0,
    longestStreak: 0,
    status: 'active',
    createdAt: new Date().toISOString()
  };

  userChallenges.push(userChallenge);
  res.status(201).json(userChallenge);
});

router.delete('/challenges/enroll/:userChallengeId', verifyJWT, (req, res) => {
  const userChallenge = userChallenges.find(item => item._id === req.params.userChallengeId);

  if (!userChallenge) {
    return res.status(404).json({ error: 'Enrollment not found' });
  }

  if (userChallenge.userId !== req.user._id) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (userChallenge.status === 'completed') {
    return res.status(400).json({ error: 'Completed challenges cannot be de-enrolled' });
  }

  if (userChallenge.status !== 'active') {
    return res.status(400).json({ error: 'This challenge is no longer active' });
  }

  userChallenge.status = 'abandoned';
  res.json({ success: true, userChallenge });
});

router.get('/checkin/today-status', verifyJWT, (req, res) => {
  res.json(Array.from(checkedInToday));
});

router.post('/checkin', verifyJWT, (req, res) => {
  const { userChallengeId } = req.body;
  const userChallenge = userChallenges.find(item => item._id === userChallengeId);

  if (!userChallenge) {
    return res.status(404).json({ error: 'Challenge not found' });
  }

  if (checkedInToday.has(userChallengeId)) {
    return res.status(400).json({ error: 'Already checked in today' });
  }

  const xpMap = { easy: 10, medium: 20, hard: 30 };
  userChallenge.completedDays += 1;
  userChallenge.currentStreak += 1;
  userChallenge.longestStreak = Math.max(userChallenge.longestStreak, userChallenge.currentStreak);

  if (userChallenge.completedDays >= userChallenge.requiredDays) {
    userChallenge.status = 'completed';
  }

  checkedInToday.add(userChallengeId);

  const activity = {
    _id: `30000000000000000000000${activities.length + 1}`,
    userId: demoUser,
    challengeId: userChallenge.challengeId,
    type: 'checkin',
    meta: { day: userChallenge.completedDays, mode: userChallenge.mode },
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  };
  activities.unshift(activity);

  const xpEarned = xpMap[userChallenge.mode];
  demoUser.totalXP += xpEarned;
  demoUser.weeklyXP += xpEarned;
  demoUser.level = getLevelInfo(demoUser.totalXP).level;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().slice(0, 10);
  const lastActiveDateStr = demoUser.lastActiveDate
    ? new Date(demoUser.lastActiveDate).toISOString().slice(0, 10)
    : null;
  if (lastActiveDateStr === yesterdayStr) {
    demoUser.globalStreak += 1;
  } else if (lastActiveDateStr !== todayStr) {
    demoUser.globalStreak = 1;
  }
  demoUser.longestStreak = Math.max(demoUser.longestStreak || 0, demoUser.globalStreak || 0);
  demoUser.lastActiveDate = new Date().toISOString();

  res.json({
    xpEarned,
    currentStreak: userChallenge.currentStreak,
    completedDays: userChallenge.completedDays,
    status: userChallenge.status,
    totalXP: demoUser.totalXP,
    level: demoUser.level,
    globalStreak: demoUser.globalStreak,
    longestStreak: demoUser.longestStreak,
    lastActiveDate: demoUser.lastActiveDate
  });
});

router.get('/leaderboard/global', verifyJWT, (req, res) => {
  res.json({
    leaderboard: [
      { ...demoUsers[0], rank: 1 },
      { ...demoUsers[1], rank: 2 },
      { ...demoUsers[2], rank: 3 }
    ],
    currentUserRank: 1
  });
});

router.get('/leaderboard/friends', verifyJWT, (req, res) => {
  const currentUser = demoUsers.find(user => user._id === req.user._id) || demoUser;
  const visibleUserIds = new Set([currentUser._id, ...currentUser.following]);
  const leaderboard = demoUsers
    .filter(user => visibleUserIds.has(user._id))
    .sort((a, b) => b.weeklyXP - a.weeklyXP)
    .map((user, index) => ({ ...user, rank: index + 1 }));

  res.json({
    leaderboard,
    currentUserRank: leaderboard.findIndex(user => user._id === currentUser._id) + 1
  });
});

router.get('/feed', verifyJWT, (req, res) => {
  const currentUser = demoUsers.find(user => user._id === req.user._id) || demoUser;
  const visibleUserIds = new Set([currentUser._id, ...currentUser.following]);
  res.json(activities.filter(activity => visibleUserIds.has(activity.userId._id)));
});

router.post('/feed/like', verifyJWT, (req, res) => {
  const activity = activities.find(item => item._id === req.body.activityId);

  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  const index = activity.likes.indexOf(req.user._id);
  if (index >= 0) {
    activity.likes.splice(index, 1);
  } else {
    activity.likes.push(req.user._id);
  }

  res.json({ likes: activity.likes });
});

router.post('/feed/comment', verifyJWT, (req, res) => {
  const activity = activities.find(item => item._id === req.body.activityId);

  if (!activity) {
    return res.status(404).json({ error: 'Activity not found' });
  }

  activity.comments.push({
    userId: demoUser,
    text: req.body.text,
    createdAt: new Date().toISOString()
  });

  res.json(activity.comments);
});

export default router;
