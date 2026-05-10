import express from 'express';
import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();
const MAX_ACTIVE_CHALLENGES = 3;
const DEFAULT_CHALLENGES = [
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

async function ensureDefaultChallenges() {
  const existingCount = await Challenge.countDocuments({ isPublic: true });
  if (existingCount > 0) return;

  await Challenge.insertMany(DEFAULT_CHALLENGES, { ordered: false });
}

async function enrollInChallenge({ userId, challengeId, mode }) {
  if (!['easy', 'medium', 'hard'].includes(mode)) {
    const err = new Error('Invalid mode');
    err.status = 400;
    throw err;
  }

  const challenge = await Challenge.findById(challengeId);
  if (!challenge) {
    const err = new Error('Challenge not found');
    err.status = 404;
    throw err;
  }

  const existing = await UserChallenge.findOne({
    userId,
    challengeId,
    status: 'active'
  });
  if (existing) {
    const err = new Error('Already have an active version of this challenge');
    err.status = 400;
    throw err;
  }

  const activeCount = await UserChallenge.countDocuments({
    userId,
    status: 'active'
  });
  if (activeCount >= MAX_ACTIVE_CHALLENGES) {
    const err = new Error(`You can only have ${MAX_ACTIVE_CHALLENGES} active challenges at a time`);
    err.status = 400;
    throw err;
  }

  const durationMap = { easy: Math.floor(challenge.duration * 0.8), medium: challenge.duration, hard: challenge.duration };
  const userChallenge = new UserChallenge({
    userId,
    challengeId,
    mode,
    startDate: new Date(),
    requiredDays: durationMap[mode]
  });

  await userChallenge.save();
  await userChallenge.populate('challengeId');
  return userChallenge;
}

// Get all public challenges - PUBLIC, no auth required
router.get('/', async (req, res) => {
  try {
    await ensureDefaultChallenges();
    const challenges = await Challenge.find({ isPublic: true }).lean();
    res.json(challenges);
  } catch (err) {
    console.error('Error fetching challenges:', err.message);
    res.status(500).json({ error: 'Failed to load challenges', details: err.message });
  }
});

// Get public challenges with current user's active enrollment state.
router.get('/enrollable', verifyJWT, async (req, res) => {
  try {
    await ensureDefaultChallenges();
    const [challenges, activeEnrollments] = await Promise.all([
      Challenge.find({ isPublic: true }).lean(),
      UserChallenge.find({ userId: req.user._id, status: 'active' }).lean()
    ]);

    const enrollmentsByChallengeId = new Map(
      activeEnrollments.map(enrollment => [enrollment.challengeId.toString(), enrollment])
    );

    res.json(challenges.map(challenge => {
      const enrollment = enrollmentsByChallengeId.get(challenge._id.toString());
      return {
        ...challenge,
        isJoined: !!enrollment,
        enrollmentId: enrollment?._id || null,
        enrollmentMode: enrollment?.mode || null,
        activeEnrollmentCount: activeEnrollments.length,
        maxActiveChallenges: MAX_ACTIVE_CHALLENGES
      };
    }));
  } catch (err) {
    console.error('Error fetching enrollable challenges:', err.message);
    res.status(500).json({ error: 'Failed to load challenges', details: err.message });
  }
});

// Get user's active challenges - REQUIRES LOGIN
router.get('/my-challenges', verifyJWT, async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({ userId: req.user._id })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    console.error('Error fetching user challenges:', err.message);
    res.status(500).json({ error: 'Failed to load user challenges', details: err.message });
  }
});

// Get specific user's completed challenges - PUBLIC, no auth required
router.get('/user/:userId/completed', async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({
      userId: req.params.userId,
      status: 'completed'
    })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    console.error('Error fetching completed challenges:', err.message);
    res.status(500).json({ error: 'Failed to load completed challenges', details: err.message });
  }
});

// Join a challenge - REQUIRES LOGIN
router.post('/:id/join', verifyJWT, async (req, res) => {
  try {
    const userChallenge = await enrollInChallenge({
      userId: req.user._id,
      challengeId: req.params.id,
      mode: req.body.mode
    });
    res.status(201).json(userChallenge);
  } catch (err) {
    console.error('Error joining challenge:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to join challenge', details: err.message });
  }
});

router.post('/enroll', verifyJWT, async (req, res) => {
  try {
    const userChallenge = await enrollInChallenge({
      userId: req.user._id,
      challengeId: req.body.challengeId,
      mode: req.body.mode
    });
    res.status(201).json(userChallenge);
  } catch (err) {
    console.error('Error enrolling challenge:', err.message);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to enroll challenge', details: err.message });
  }
});

router.delete('/enroll/:userChallengeId', verifyJWT, async (req, res) => {
  try {
    const userChallenge = await UserChallenge.findById(req.params.userChallengeId);
    if (!userChallenge) {
      return res.status(404).json({ error: 'Enrollment not found' });
    }
    if (userChallenge.userId.toString() !== req.user._id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    if (userChallenge.status === 'completed') {
      return res.status(400).json({ error: 'Completed challenges cannot be de-enrolled' });
    }
    if (userChallenge.status !== 'active') {
      return res.status(400).json({ error: 'This challenge is no longer active' });
    }

    userChallenge.status = 'abandoned';
    await userChallenge.save();

    res.json({ success: true, userChallenge });
  } catch (err) {
    console.error('Error de-enrolling challenge:', err.message);
    res.status(500).json({ error: 'Failed to de-enroll challenge', details: err.message });
  }
});

export default router;
