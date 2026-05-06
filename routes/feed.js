import express from 'express';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get feed (latest activities)
router.get('/', verifyJWT, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id, { following: 1 }).lean();
    const visibleUserIds = [req.user._id, ...(currentUser?.following || [])];

    const activities = await Activity.find({ userId: { $in: visibleUserIds } })
      .populate('userId', 'name avatar')
      .populate('challengeId', 'title')
      .populate('comments.userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get user's activities by userId
router.get('/user/:userId', verifyJWT, async (req, res) => {
  try {
    const activities = await Activity.find({ userId: req.params.userId })
      .populate('userId', 'name avatar')
      .populate('challengeId', 'title')
      .populate('comments.userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();
    
    res.json(activities);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like an activity
router.post('/like', verifyJWT, async (req, res) => {
  try {
    const { activityId } = req.body;
    const userId = req.user._id;

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const likeIndex = activity.likes.findIndex(id => id.toString() === userId);
    if (likeIndex > -1) {
      // Unlike
      activity.likes.splice(likeIndex, 1);
    } else {
      // Like
      activity.likes.push(userId);
    }

    await activity.save();
    res.json({ likes: activity.likes.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add comment
router.post('/comment', verifyJWT, async (req, res) => {
  try {
    const { activityId, text } = req.body;
    const userId = req.user._id;

    const activity = await Activity.findById(activityId);
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    activity.comments.push({
      userId,
      text,
      createdAt: new Date()
    });

    await activity.save();
    await activity.populate('comments.userId', 'name avatar');
    
    res.json(activity.comments);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
