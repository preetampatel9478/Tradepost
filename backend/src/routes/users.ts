import express from 'express';
import mongoose from 'mongoose';
import logger from '../utils/logger';
import User from '../models/User';
import Post from '../models/Post';
import { auth, optionalAuth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';
import { uploadAvatar, buildPublicFileUrl } from '../config/upload';

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

    const user = await User.findById(req.userId).select(
      '_id userId mobileNumber name email bio profilePhoto createdAt followerCount followingCount language accountPrivate notifyPush notifyEmail themeMode'
    );
    if (!user) return next(createError(404, 'User not found'));

    const postCount = await Post.countDocuments({ author: req.userId });

    return res.json({
      id: user._id,
      userId: user.userId,
      mobileNumber: user.mobileNumber,
      name: (user as any).name || '',
      email: (user as any).email || '',
      bio: (user as any).bio || '',
      avatar: user.profilePhoto,
      createdAt: user.createdAt,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      postCount,
      settings: {
        language: (user as any).language || 'en',
        accountPrivate: Boolean((user as any).accountPrivate),
        notifyPush: Boolean((user as any).notifyPush),
        notifyEmail: Boolean((user as any).notifyEmail),
        themeMode: (user as any).themeMode || 'system',
      },
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Current user's followers list
router.get('/me/followers', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const me = await User.findById(req.userId)
      .select('_id followerCount +followers')
      .slice('followers', [skip, limit])
      .populate({ path: 'followers', select: '_id userId name profilePhoto' });
    if (!me) return next(createError(404, 'User not found'));

    const followers = ((me as any).followers as any[]) || [];

    // Compute isFollowing for only this page of followers (production-friendly).
    const followerObjectIds = followers
      .map((u: any) => u?._id)
      .filter(Boolean)
      .map((id: any) => new mongoose.Types.ObjectId(String(id)));

    let followingIds = new Set<string>();
    if (followerObjectIds.length) {
      const meId = new mongoose.Types.ObjectId(String(req.userId));
      const agg = await User.aggregate([
        { $match: { _id: meId } },
        {
          $project: {
            followingFiltered: { $setIntersection: ['$following', followerObjectIds] },
          },
        },
      ]);
      const filtered = (agg?.[0]?.followingFiltered as any[]) || [];
      followingIds = new Set(filtered.map((id: any) => String(id)));
    }

    const items = followers.map((u: any) => ({
      id: u._id,
      userId: u.userId,
      name: (u as any).name || '',
      avatar: u.profilePhoto,
      isFollowing: followingIds.has(String(u._id)),
    }));

    return res.json({
      total: me.followerCount ?? 0,
      items,
      limit,
      skip,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Current user's following list
router.get('/me/following', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 25));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const me = await User.findById(req.userId)
      .select('_id followingCount +following')
      .slice('following', [skip, limit])
      .populate({ path: 'following', select: '_id userId name profilePhoto' });
    if (!me) return next(createError(404, 'User not found'));

    const following = ((me as any).following as any[]) || [];
    const items = following.map((u: any) => ({
      id: u._id,
      userId: u.userId,
      name: (u as any).name || '',
      avatar: u.profilePhoto,
      isFollowing: true,
    }));

    return res.json({
      total: me.followingCount ?? 0,
      items,
      limit,
      skip,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Current user's posts
router.get('/me/posts', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const posts = await Post.find({ author: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ author: req.userId });

    return res.json({
      total,
      items: posts.map((p: any) => ({
        _id: p._id,
        content: p.content,
        sentiment: p.sentiment,
        mediaUrls: p.mediaUrls || [],
        likeCount: p.likeCount ?? 0,
        commentCount: p.commentCount ?? 0,
        createdAt: p.createdAt,
      })),
      limit,
      skip,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Update current user profile/settings
router.put('/me', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const patch: any = {};
    const { name, email, bio, userId, mobileNumber, settings } = req.body || {};

    if (typeof name === 'string') patch.name = name.trim();
    if (typeof email === 'string') patch.email = email.trim().toLowerCase();
    if (typeof bio === 'string') patch.bio = bio.trim();

    if (typeof userId === 'string') {
      const nextUserId = userId.trim();
      if (!nextUserId) return next(createError(400, 'User ID cannot be empty'));
      const exists = await User.findOne({ userId: nextUserId, _id: { $ne: req.userId } }).select('_id');
      if (exists) return next(createError(409, 'User ID already exists'));
      patch.userId = nextUserId;
    }

    if (typeof mobileNumber === 'string') {
      const nextMobile = mobileNumber.trim();
      if (!nextMobile) return next(createError(400, 'Mobile Number cannot be empty'));
      const exists = await User.findOne({ mobileNumber: nextMobile, _id: { $ne: req.userId } }).select('_id');
      if (exists) return next(createError(409, 'Mobile Number already exists'));
      patch.mobileNumber = nextMobile;
    }

    if (settings && typeof settings === 'object') {
      if (typeof settings.language === 'string') patch.language = settings.language.trim() || 'en';
      if (typeof settings.accountPrivate === 'boolean') patch.accountPrivate = settings.accountPrivate;
      if (typeof settings.notifyPush === 'boolean') patch.notifyPush = settings.notifyPush;
      if (typeof settings.notifyEmail === 'boolean') patch.notifyEmail = settings.notifyEmail;
      if (typeof settings.themeMode === 'string') {
        const mode = settings.themeMode;
        if (!['light', 'dark', 'system'].includes(mode)) return next(createError(400, 'Invalid themeMode'));
        patch.themeMode = mode;
      }
    }

    const updated = await User.findByIdAndUpdate(req.userId, patch, { new: true }).select(
      '_id userId mobileNumber name email bio profilePhoto createdAt followerCount followingCount language accountPrivate notifyPush notifyEmail themeMode'
    );
    if (!updated) return next(createError(404, 'User not found'));

    return res.json({
      success: true,
      user: {
        id: updated._id,
        userId: updated.userId,
        mobileNumber: updated.mobileNumber,
        name: (updated as any).name || '',
        email: (updated as any).email || '',
        bio: (updated as any).bio || '',
        avatar: updated.profilePhoto,
        createdAt: updated.createdAt,
      },
      settings: {
        language: (updated as any).language || 'en',
        accountPrivate: Boolean((updated as any).accountPrivate),
        notifyPush: Boolean((updated as any).notifyPush),
        notifyEmail: Boolean((updated as any).notifyEmail),
        themeMode: (updated as any).themeMode || 'system',
      },
    });
  } catch (err: any) {
    if (err?.code === 11000) return next(createError(409, 'Duplicate value'));
    return next(createError(500, 'Server error'));
  }
});

// Update current user avatar
router.put('/me/avatar', auth, uploadAvatar.single('profilePhoto'), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    if (!uploadedFile) return next(createError(400, 'profilePhoto is required'));

    const profilePhoto = buildPublicFileUrl(req, `/uploads/avatars/${uploadedFile.filename}`);
    const updated = await User.findByIdAndUpdate(req.userId, { profilePhoto }, { new: true }).select(
      '_id userId mobileNumber name email bio profilePhoto createdAt'
    );
    if (!updated) return next(createError(404, 'User not found'));

    return res.json({
      success: true,
      user: {
        id: updated._id,
        userId: updated.userId,
        mobileNumber: updated.mobileNumber,
        name: (updated as any).name || '',
        email: (updated as any).email || '',
        bio: (updated as any).bio || '',
        avatar: updated.profilePhoto,
        createdAt: updated.createdAt,
      },
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

    const user = await User.findOne({ userId }).select(
      '_id userId name bio profilePhoto createdAt followerCount followingCount'
    );
    if (!user) return next(createError(404, 'User not found'));

    const postCount = await Post.countDocuments({ author: user._id });

    let isFollowing = false;
    if (req.userId) {
      const me = await User.findById(req.userId).select('_id +following');
      const following = ((me as any)?.following as any[]) || [];
      isFollowing = following.some((id) => String(id) === String(user._id));
    }

    return res.json({
      id: user._id,
      userId: user.userId,
      name: (user as any).name || '',
      bio: (user as any).bio || '',
      avatar: user.profilePhoto,
      createdAt: user.createdAt,
      followerCount: user.followerCount ?? 0,
      followingCount: user.followingCount ?? 0,
      postCount,
      isFollowing,
    });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Public user's posts
router.get('/u/:userId/posts', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = String(req.params.userId || '').trim();
    if (!userId) return next(createError(400, 'userId is required'));

    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const target = await User.findOne({ userId }).select('_id userId');
    if (!target) return next(createError(404, 'User not found'));

    const query = Post.find({ author: target._id }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    if (req.userId) query.select('+likedBy');

    const posts = await query;
    const total = await Post.countDocuments({ author: target._id });

    const viewerId = req.userId ? String(req.userId) : null;
    return res.json({
      total,
      items: posts.map((p: any) => {
        const likedBy = Array.isArray(p.likedBy) ? p.likedBy.map((id: any) => String(id)) : [];
        const isLiked = viewerId ? likedBy.includes(viewerId) : false;
        return {
          _id: p._id,
          content: p.content,
          sentiment: p.sentiment,
          mediaUrls: p.mediaUrls || [],
          likeCount: typeof p.likeCount === 'number' ? p.likeCount : likedBy.length,
          commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
          createdAt: p.createdAt,
          isLiked,
        };
      }),
      limit,
      skip,
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
    const targetFresh = await User.findById(target._id).select('followerCount followingCount');
    return res.json({
      success: true,
      followerCount: meFresh?.followerCount ?? 0,
      followingCount: meFresh?.followingCount ?? 0,
      targetFollowerCount: targetFresh?.followerCount ?? 0,
      targetFollowingCount: targetFresh?.followingCount ?? 0,
      isFollowing: true,
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
    const targetFresh = await User.findById(target._id).select('followerCount followingCount');
    return res.json({
      success: true,
      followerCount: meFresh?.followerCount ?? 0,
      followingCount: meFresh?.followingCount ?? 0,
      targetFollowerCount: targetFresh?.followerCount ?? 0,
      targetFollowingCount: targetFresh?.followingCount ?? 0,
      isFollowing: false,
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
