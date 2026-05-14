import express from 'express';
import Activity from '../models/Activity.js';
import User from '../models/User.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Get feed (latest activities) - PUBLIC, no auth required but filters intelligently
router.get('/', async (req, res) => {
  try {
    // Show public activities from all users
    const activities = await Activity.find()
      .populate('userId', 'name avatar')
      .populate('challengeId', 'title')
      .populate('comments.userId', 'name avatar')
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();
    
    res.json(activities);
  } catch (err) {
    console.error('Error fetching feed:', err.message);
    res.status(500).json({ error: 'Failed to load feed', details: err.message });
  }
});

// Get personalized feed (you + following) - REQUIRES LOGIN
router.get('/personalized', verifyJWT, async (req, res) => {
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
    console.error('Error fetching personalized feed:', err.message);
    res.status(500).json({ error: 'Failed to load personalized feed', details: err.message });
  }
});

// Get user's activities by userId - PUBLIC, no auth required
router.get('/user/:userId', async (req, res) => {
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
    console.error('Error fetching user activities:', err.message);
    res.status(500).json({ error: 'Failed to load user activities', details: err.message });
  }
});

// Like an activity - REQUIRES LOGIN
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
    console.error('Error liking activity:', err.message);
    res.status(500).json({ error: 'Failed to like activity', details: err.message });
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
    console.error('Error adding comment:', err.message);
    res.status(500).json({ error: 'Failed to add comment', details: err.message });
  }
});

// Add a post
router.post('/post', verifyJWT, async (req, res) => {
  try {
    const { text, challengeId, image } = req.body;
    const userId = req.user._id;

    const newActivity = new Activity({
      userId,
      type: 'post',
      text,
      image,
      meta: { text, image },
      challengeId: challengeId || undefined,
      likes: [],
      comments: []
    });

    await newActivity.save();

    const populatedActivity = await Activity.findById(newActivity._id)
      .populate('userId', 'name avatar')
      .populate('challengeId', 'title');

    res.status(201).json(populatedActivity);
  } catch (err) {
    console.error('Error creating post:', err.message);
    res.status(500).json({ error: 'Failed to create post', details: err.message });
  }
});

// Edit a post
router.put('/post/:id', verifyJWT, async (req, res) => {
  try {
    const { text } = req.body;
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (activity.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    activity.text = text;
    if (!activity.meta) activity.meta = {};
    activity.meta.text = text;
    activity.markModified('meta');
    
    await activity.save();
    
    const populatedActivity = await Activity.findById(activity._id)
      .populate('userId', 'name avatar')
      .populate('challengeId', 'title')
      .populate('comments.userId', 'name avatar');

    res.json(populatedActivity);
  } catch (err) {
    console.error('Error editing post:', err.message);
    res.status(500).json({ error: 'Failed to edit post', details: err.message });
  }
});

// Delete a post
router.delete('/post/:id', verifyJWT, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.id);
    
    if (!activity) {
      return res.status(404).json({ error: 'Post not found' });
    }
    
    if (activity.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Activity.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting post:', err.message);
    res.status(500).json({ error: 'Failed to delete post', details: err.message });
  }
});

// Delete a comment
router.delete('/post/:activityId/comment/:commentId', verifyJWT, async (req, res) => {
  try {
    const activity = await Activity.findById(req.params.activityId);
    
    if (!activity) {
      return res.status(404).json({ error: 'Activity not found' });
    }

    const comment = activity.comments.id(req.params.commentId);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    if (comment.userId.toString() !== req.user._id.toString() && activity.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Unauthorized to delete this comment' });
    }

    activity.comments.pull({ _id: req.params.commentId });
    await activity.save();

    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting comment:', err.message);
    res.status(500).json({ error: 'Failed to delete comment', details: err.message });
  }
});

export default router;
