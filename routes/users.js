import express from 'express';
import User from '../models/User.js';
import { optionalJWT, verifyJWT } from '../middleware/auth.js';

const router = express.Router();

// Search users - PUBLIC, no auth required
router.get('/search', async (req, res) => {
  const query = String(req.query.q || '').trim();

  if (query.length < 2) {
    return res.json([]);
  }

  try {
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
      followerCount: user.followers?.length || 0
    })));
  } catch (err) {
    console.error('Error searching users:', err.message);
    res.status(500).json({ error: 'Failed to search users', details: err.message });
  }
});

// Get user profile - PUBLIC, no auth required
router.get('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    const user = await User.findById(userId)
      .select('name email avatar location bio totalXP weeklyXP level globalStreak longestStreak badges followers following createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      ...user,
      followerCount: user.followers?.length || 0,
      followingCount: user.following?.length || 0
    });
  } catch (err) {
    console.error('Error fetching user profile:', err.message);
    res.status(500).json({ error: 'Failed to load user profile', details: err.message });
  }
});

// Get current user's profile with follow status - REQUIRES LOGIN
router.get('/profile/me', verifyJWT, async (req, res) => {
  const currentUserId = req.user._id;

  try {
    const user = await User.findById(currentUserId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      location: user.location,
      bio: user.bio,
      totalXP: user.totalXP,
      weeklyXP: user.weeklyXP,
      level: user.level,
      globalStreak: user.globalStreak,
      longestStreak: user.longestStreak,
      badges: user.badges,
      followers: user.followers?.length || 0,
      following: user.following?.length || 0
    });
  } catch (err) {
    console.error('Error fetching current user profile:', err.message);
    res.status(500).json({ error: 'Failed to load user profile', details: err.message });
  }
});

// Get follow status for a user - REQUIRES LOGIN
router.get('/:id/follow-status', verifyJWT, async (req, res) => {
  const currentUserId = req.user._id;
  const userId = req.params.id;

  try {
    const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
    const isFollowing = currentUser?.following?.some(id => id.toString() === userId);

    res.json({
      isFollowing: !!isFollowing,
      isCurrentUser: currentUserId === userId
    });
  } catch (err) {
    console.error('Error fetching follow status:', err.message);
    res.status(500).json({ error: 'Failed to load follow status', details: err.message });
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
    console.error('Error following user:', err.message);
    res.status(500).json({ error: 'Failed to follow user', details: err.message });
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
    console.error('Error unfollowing user:', err.message);
    res.status(500).json({ error: 'Failed to unfollow user', details: err.message });
  }
});

router.get('/:id/followers', optionalJWT, async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user?._id; // Optional - only if authenticated

  try {
    const user = await User.findById(userId).populate('followers', 'name avatar email totalXP level').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If authenticated, include follow status for each follower
    let followers = user.followers || [];
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
      const followingIds = new Set((currentUser?.following || []).map(id => id.toString()));
      followers = followers.map(follower => ({
        ...follower,
        isFollowing: followingIds.has(follower._id.toString()),
        isCurrentUser: follower._id.toString() === currentUserId
      }));
    }

    res.json(followers);
  } catch (err) {
    console.error('Error fetching followers:', err.message);
    res.status(500).json({ error: 'Failed to load followers', details: err.message });
  }
});

router.get('/:id/following', optionalJWT, async (req, res) => {
  const userId = req.params.id;
  const currentUserId = req.user?._id; // Optional - only if authenticated

  try {
    const user = await User.findById(userId).populate('following', 'name avatar email totalXP level').lean();
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If authenticated, include follow status for each user
    let following = user.following || [];
    if (currentUserId) {
      const currentUser = await User.findById(currentUserId, { following: 1 }).lean();
      const followingIds = new Set((currentUser?.following || []).map(id => id.toString()));
      following = following.map(followedUser => ({
        ...followedUser,
        isFollowing: followingIds.has(followedUser._id.toString()),
        isCurrentUser: followedUser._id.toString() === currentUserId
      }));
    }

    res.json(following);
  } catch (err) {
    console.error('Error fetching following:', err.message);
    res.status(500).json({ error: 'Failed to load following list', details: err.message });
  }
});

export default router;
