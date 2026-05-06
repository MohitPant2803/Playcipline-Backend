import express from 'express';
import Challenge from '../models/Challenge.js';
import UserChallenge from '../models/UserChallenge.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get all public challenges
router.get('/', verifyJWT, async (req, res) => {
  try {
    const challenges = await Challenge.find({ isPublic: true }).lean();
    res.json(challenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's active challenges
router.get('/my-challenges', verifyJWT, async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({ userId: req.user._id })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get specific user's completed challenges
router.get('/user/:userId/completed', verifyJWT, async (req, res) => {
  try {
    const userChallenges = await UserChallenge.find({
      userId: req.params.userId,
      status: 'completed'
    })
      .populate('challengeId')
      .lean();
    res.json(userChallenges);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Join a challenge
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
    res.status(500).json({ error: err.message });
  }
});

export default router;
