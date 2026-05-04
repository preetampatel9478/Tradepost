import express from 'express';
import logger from '../utils/logger';
import User from '../models/User';
import Post from '../models/Post';
import { auth, optionalAuth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';

const router = express.Router();

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Search users by username (userId)
router.get('/search', async (req, res) => {
  try {
    const q = String((req.query.q ?? req.query.query ?? '')).trim();
    if (!q) return res.json([]);

    const regex = new RegExp(escapeRegex(q), 'i');
    const users = await User.find({ userId: regex })
      .select('_id userId profilePhoto')
      .sort({ userId: 1 })
      .limit(25);

    return res.json(users);
  } catch (err) {
    logger.error('User search error:', err);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Current user profile summary
router.get('/me', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const user = await User.findById(req.userId).select('_id userId profilePhoto createdAt followerCount followingCount');
    if (!user) return next(createError(404, 'User not found'));

    const postCount = await Post.countDocuments({ author: req.userId });

    return res.json({
      id: user._id,
      userId: user.userId,
      avatar: user.profilePhoto,
      createdAt: user.createdAt,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      postCount,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Public profile by username
router.get('/u/:userId', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return next(createError(400, 'userId is required'));

    const user = await User.findOne({ userId }).select('_id userId profilePhoto createdAt followerCount followingCount');
    if (!user) return next(createError(404, 'User not found'));

    const postCount = await Post.countDocuments({ author: user._id });

    return res.json({
      id: user._id,
      userId: user.userId,
      avatar: user.profilePhoto,
      createdAt: user.createdAt,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      postCount,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Follow / unfollow by username
router.post('/u/:userId/follow', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));
    const targetUserId = String(req.params.userId || '').trim();
    if (!targetUserId) return next(createError(400, 'userId is required'));

    const me = await User.findById(req.userId).select('_id userId');
    if (!me) return next(createError(404, 'User not found'));
    if (me.userId === targetUserId) return next(createError(400, 'Cannot follow yourself'));

    const target = await User.findOne({ userId: targetUserId }).select('_id userId');
    if (!target) return next(createError(404, 'User not found'));

    // Add to following only if not already following
    const updatedMe = await User.findOneAndUpdate(
      { _id: me._id, following: { $ne: target._id } },
      { $addToSet: { following: target._id }, $inc: { followingCount: 1 } },
      { new: true }
    ).select('_id followingCount');

    if (updatedMe) {
      await User.findOneAndUpdate(
        { _id: target._id, followers: { $ne: me._id } },
        { $addToSet: { followers: me._id }, $inc: { followerCount: 1 } },
        { new: true }
      ).select('_id followerCount');
    }

    const meFresh = await User.findById(me._id).select('followerCount followingCount');
    return res.json({
      success: true,
      followerCount: meFresh?.followerCount ?? 0,
      followingCount: meFresh?.followingCount ?? 0,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

router.delete('/u/:userId/follow', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));
    const targetUserId = String(req.params.userId || '').trim();
    if (!targetUserId) return next(createError(400, 'userId is required'));

    const me = await User.findById(req.userId).select('_id userId');
    if (!me) return next(createError(404, 'User not found'));

    const target = await User.findOne({ userId: targetUserId }).select('_id userId');
    if (!target) return next(createError(404, 'User not found'));

    const updatedMe = await User.findOneAndUpdate(
      { _id: me._id, following: target._id },
      { $pull: { following: target._id }, $inc: { followingCount: -1 } },
      { new: true }
    ).select('_id followingCount');

    if (updatedMe) {
      await User.findOneAndUpdate(
        { _id: target._id, followers: me._id },
        { $pull: { followers: me._id }, $inc: { followerCount: -1 } },
        { new: true }
      ).select('_id followerCount');
    }

    const meFresh = await User.findById(me._id).select('followerCount followingCount');
    return res.json({
      success: true,
      followerCount: meFresh?.followerCount ?? 0,
      followingCount: meFresh?.followingCount ?? 0,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

router.get('/', (req, res) => {
  logger.info('Get users endpoint');
  res.json({ success: true, message: 'Users endpoint - Implementation pending' });
});

router.get('/:id', (req, res) => {
  logger.info(`Get user ${req.params.id}`);
  res.json({ success: true, message: 'Get user endpoint - Implementation pending' });
});

router.put('/:id', (req, res) => {
  logger.info(`Update user ${req.params.id}`);
  res.json({ success: true, message: 'Update user endpoint - Implementation pending' });
});

export default router;
