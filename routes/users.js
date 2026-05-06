import express from 'express';
import User from '../models/User.js';
import { verifyJWT } from '../middleware/auth.js';

const router = express.Router();

router.get('/search', verifyJWT, async (req, res) => {
  const query = String(req.query.q || '').trim();
  const currentUserId = req.user._id;

  if (query.length < 2) {
    return res.json([]);
  }

  try {
    const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
    const followingIds = new Set((currentUser?.following || []).map(id => id.toString()));

    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: 'i' } },
        { email: { $regex: query, $options: 'i' } }
      ]
    })
      .select('name email avatar totalXP weeklyXP level globalStreak followers')
      .limit(8)
      .lean();

    res.json(users.map(user => ({
      ...user,
      isCurrentUser: user._id.toString() === currentUserId,
      isFollowing: followingIds.has(user._id.toString()),
      followerCount: user.followers?.length || 0
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', verifyJWT, async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user._id;

  try {
    const user = await User.findById(userId)
      .select('name email avatar location totalXP weeklyXP level globalStreak badges followers createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
    const followingIds = new Set((currentUser?.following || []).map(id => id.toString()));

    res.json({
      ...user,
      isCurrentUser: user._id.toString() === currentUserId,
      isFollowing: followingIds.has(user._id.toString()),
      followerCount: user.followers?.length || 0
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/follow', verifyJWT, async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.id;

  if (currentUserId === targetUserId) {
    return res.status(400).json({ error: 'You cannot follow yourself' });
  }

  try {
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    await User.findByIdAndUpdate(currentUserId, { $addToSet: { following: targetUserId } });
    await User.findByIdAndUpdate(targetUserId, { $addToSet: { followers: currentUserId } });

    res.json({ isFollowing: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id/follow', verifyJWT, async (req, res) => {
  const currentUserId = req.user._id;
  const targetUserId = req.params.id;

  try {
    await User.findByIdAndUpdate(currentUserId, { $pull: { following: targetUserId } });
    await User.findByIdAndUpdate(targetUserId, { $pull: { followers: currentUserId } });

    res.json({ isFollowing: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/followers', verifyJWT, async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user._id;

  try {
    const user = await User.findById(userId).populate('followers', 'name avatar email totalXP level').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
    const followingIds = new Set((currentUser?.following || []).map(id => id.toString()));

    const followers = (user.followers || []).map(follower => ({
      ...follower,
      isFollowing: followingIds.has(follower._id.toString())
    }));

    res.json(followers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/following', verifyJWT, async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user._id;

  try {
    const user = await User.findById(userId).populate('following', 'name avatar email totalXP level').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
    const followingIds = new Set((currentUser?.following || []).map(id => id.toString()));

    const following = (user.following || []).map(followedUser => ({
      ...followedUser,
      isFollowing: followingIds.has(followedUser._id.toString())
    }));

    res.json(following);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
