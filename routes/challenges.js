import express from 'express';
import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get all public challenges - PUBLIC, no auth required
router.get('/', async (req, res) => {
  try {
    const challenges = await Challenge.find({ isPublic: true }).lean();
    res.json(challenges);
  } catch (err) {
    console.error('Error fetching challenges:', err.message);
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
    const { mode } = req.body;
    if (!['easy', 'medium', 'hard'].includes(mode)) {
      return res.status(400).json({ error: 'Invalid mode' });
    }

    const challenge = await Challenge.findById(req.params.id);
    if (!challenge) {
      return res.status(404).json({ error: 'Challenge not found' });
    }

    // Check if user already has an active challenge
    const existing = await UserChallenge.findOne({
      userId: req.user._id,
      challengeId: req.params.id,
      status: 'active'
    });
    if (existing) {
      return res.status(400).json({ error: 'Already have an active version of this challenge' });
    }

    // Calculate required days
    const durationMap = { easy: Math.floor(challenge.duration * 0.8), medium: challenge.duration, hard: challenge.duration };
    const requiredDays = durationMap[mode];

    const userChallenge = new UserChallenge({
      userId: req.user._id,
      challengeId: req.params.id,
      mode,
      startDate: new Date(),
      requiredDays
    });

    await userChallenge.save();
    await userChallenge.populate('challengeId');
    
    res.status(201).json(userChallenge);
  } catch (err) {
    console.error('Error joining challenge:', err.message);
    res.status(500).json({ error: 'Failed to join challenge', details: err.message });
  }
});

export default router;
