import express from 'express';
import mongoose from 'mongoose';
import Post from '../models/Post';
import Comment from '../models/Comment';
import Notification from '../models/Notification';
import Report from '../models/Report';
import { auth, optionalAuth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';
import { uploadPostMedia, buildPublicFileUrl } from '../config/upload';
import { getIO } from '../config/socket';

function emitPostEngagementUpdated(postId: string, likeCount: number, commentCount: number) {
  try {
    const io = getIO();
    io.emit('posts:engagementUpdated', { postId, likeCount, commentCount });
  } catch {
    // Socket not initialized; ignore.
  }
}

function emitNotificationNew(recipientId: string) {
  try {
    const io = getIO();
    io.to(`user:${recipientId}`).emit('notifications:new', { recipientId });
  } catch {
    // Socket not initialized; ignore.
  }
}

const router = express.Router();

function extractTokens(text: string, prefix: '@' | '#'): string[] {
  const regex = prefix === '@' ? /@[A-Za-z0-9_]{2,32}/g : /#[A-Za-z0-9_]{1,32}/g;
  const matches = text.match(regex) || [];
  // normalize to preserve prefix but make dedupe case-insensitive
  const unique = new Map<string, string>();
  for (const token of matches) {
    unique.set(token.toLowerCase(), token);
  }
  return Array.from(unique.values());
}

router.post('/', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { content, sentiment, mediaUrls } = req.body;

    if (!req.userId) return next(createError(401, 'Unauthorized'));
    if (!content?.trim()) return next(createError(400, 'Post content is required'));

    const mentions = extractTokens(String(content), '@');
    const tags = extractTokens(String(content), '#');

    const post = new Post({
      author: req.userId,
      content,
      sentiment,
      mediaUrls,
      mentions,
      tags,
    });
    await post.save();
    const populated = await post.populate('author', 'userId profilePhoto');
    res.status(201).json(populated);
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

router.post('/media', auth, uploadPostMedia.array('media', 5), async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const files = ((req as any).files as Express.Multer.File[] | undefined) || [];
    if (!files.length) return next(createError(400, 'No files uploaded'));

    const urls = files.map((f) => buildPublicFileUrl(req, `/uploads/posts/${f.filename}`));
    res.status(201).json({ mediaUrls: urls });
  } catch (err) {
    return next(createError(500, 'Media upload failed'));
  }
});

router.get('/', optionalAuth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const rawTag = String((req.query.tag ?? req.query.hashtag ?? '')).trim();
    const normalizedTag = rawTag
      ? rawTag.startsWith('#')
        ? rawTag
        : `#${rawTag}`
      : '';

    const filter: any = {};
    if (normalizedTag) {
      const safe = normalizedTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.tags = { $regex: new RegExp(`^${safe}$`, 'i') };
    }
    
    if (req.query.hasVideo === 'true') {
      // Find where mediaUrls array has at least one item matching video extensions
      filter.mediaUrls = { $regex: /\.(mp4|mov|m4v)(\?.*)?$/i };
    }

    const query = Post.find(filter)
      .populate('author', 'userId profilePhoto')
      .sort({ createdAt: -1 })
      .limit(50);

    if (req.userId) {
      query.select('+likedBy');
    }

    const posts = await query;

    const userId = req.userId;
    return res.json(
      posts.map((p: any) => {
        const likedBy = Array.isArray(p.likedBy) ? p.likedBy.map((id: any) => String(id)) : [];
        const isLiked = userId ? likedBy.includes(String(userId)) : false;
        return {
          ...p.toObject(),
          likedBy: undefined,
          isLiked,
          likeCount: typeof p.likeCount === 'number' ? p.likeCount : likedBy.length,
          commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
        };
      })
    );
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

router.post('/:postId/like', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const { postId } = req.params;

    const updated = await Post.findOneAndUpdate(
      { _id: postId, likedBy: { $ne: req.userId } },
      { $addToSet: { likedBy: req.userId }, $inc: { likeCount: 1 } },
      { new: true }
    ).populate('author', 'userId profilePhoto');

    if (!updated) {
      const existing = await Post.findById(postId).populate('author', 'userId profilePhoto');
      if (!existing) return next(createError(404, 'Post not found'));
      return res.json({
        ...existing.toObject(),
        isLiked: true,
        likeCount: typeof (existing as any).likeCount === 'number' ? (existing as any).likeCount : 0,
        commentCount: typeof (existing as any).commentCount === 'number' ? (existing as any).commentCount : 0,
      });
    }

    // Create notification for post author (if not self).
    const authorId = String((updated as any)?.author?._id ?? (updated as any)?.author ?? '');
    if (authorId && String(authorId) !== String(req.userId)) {
      await Notification.findOneAndUpdate(
        { recipient: authorId, actor: req.userId, type: 'like', post: updated._id },
        { $set: { read: false, readAt: null } },
        { upsert: true, new: true }
      );
      emitNotificationNew(authorId);
    }

    emitPostEngagementUpdated(String(updated._id), updated.likeCount ?? 0, updated.commentCount ?? 0);
    return res.json({ ...updated.toObject(), isLiked: true });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

router.delete('/:postId/like', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const { postId } = req.params;

    const updated = await Post.findOneAndUpdate(
      { _id: postId, likedBy: req.userId },
      { $pull: { likedBy: req.userId }, $inc: { likeCount: -1 } },
      { new: true }
    ).populate('author', 'userId profilePhoto');

    if (!updated) {
      const existing = await Post.findById(postId).populate('author', 'userId profilePhoto');
      if (!existing) return next(createError(404, 'Post not found'));
      return res.json({
        ...existing.toObject(),
        isLiked: false,
        likeCount: typeof (existing as any).likeCount === 'number' ? (existing as any).likeCount : 0,
        commentCount: typeof (existing as any).commentCount === 'number' ? (existing as any).commentCount : 0,
      });
    }

    // Remove the corresponding like notification (if any).
    const authorId = String((updated as any)?.author?._id ?? (updated as any)?.author ?? '');
    if (authorId && String(authorId) !== String(req.userId)) {
      await Notification.deleteMany({ recipient: authorId, actor: req.userId, type: 'like', post: updated._id });
      emitNotificationNew(authorId);
    }

    const likeCount = Math.max(0, updated.likeCount ?? 0);
    const commentCount = updated.commentCount ?? 0;
    emitPostEngagementUpdated(String(updated._id), likeCount, commentCount);
    return res.json({ ...updated.toObject(), isLiked: false, likeCount });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Report a post (community moderation signal)
router.post('/:postId/report', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) return next(createError(400, 'Invalid postId'));

    const reason = String(req.body?.reason || '').trim();
    const allowedReasons = ['spam', 'harassment', 'fake_stock_tips', 'scam', 'hate_speech', 'misinformation'] as const;
    if (!reason || !(allowedReasons as readonly string[]).includes(reason)) {
      return next(createError(400, 'Invalid reason'));
    }

    const noteRaw = typeof req.body?.note === 'string' ? req.body.note : '';
    const note = String(noteRaw).trim();
    if (note.length > 500) return next(createError(400, 'Note is too long (max 500 chars)'));

    const post = await Post.findById(postId).select('author');
    if (!post) return next(createError(404, 'Post not found'));

    const postAuthor = String((post as any).author || '');
    if (postAuthor && postAuthor === String(req.userId)) {
      return next(createError(400, 'You cannot report your own post'));
    }

    const update: any = {
      post: post._id,
      postAuthor,
      reporter: req.userId,
      reason,
      status: 'open',
    };
    if (note) update.note = note;

    const report = await Report.findOneAndUpdate(
      { post: post._id, reporter: req.userId, reason },
      { $set: update },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).select('_id');

    return res.status(201).json({ success: true, reportId: report?._id });
  } catch {
    return next(createError(500, 'Server error'));
  }
});
// Add a single post fetch
router.get('/:postId', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) {
      return next(createError(400, 'Invalid post ID'));
    }

    const post = await Post.findById(postId).populate('author', 'userId name profilePhoto');
    if (!post) {
      return next(createError(404, 'Post not found'));
    }

    const postObj = post.toObject() as any;
    if (req.userId) {
      const isLiked = await Post.exists({ _id: post._id, likedBy: req.userId });
      postObj.isLiked = Boolean(isLiked);
    }

    return res.json(postObj);
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});
// Update a post (author-only)
router.put('/:postId', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) return next(createError(400, 'Invalid postId'));

    const { content, sentiment, mediaUrls } = req.body as {
      content?: string;
      sentiment?: 'bullish' | 'bearish' | 'neutral';
      mediaUrls?: string[];
    };

    const update: any = {};

    if (typeof content === 'string') {
      const trimmed = content.trim();
      if (!trimmed) return next(createError(400, 'Post content is required'));
      update.content = trimmed;
      update.mentions = extractTokens(trimmed, '@');
      update.tags = extractTokens(trimmed, '#');
    }

    if (typeof sentiment === 'string') {
      if (!['bullish', 'bearish', 'neutral'].includes(sentiment)) return next(createError(400, 'Invalid sentiment'));
      update.sentiment = sentiment;
    }

    if (Array.isArray(mediaUrls)) {
      update.mediaUrls = mediaUrls.filter((u) => typeof u === 'string' && u.trim()).slice(0, 5);
    }

    const updated = await Post.findOneAndUpdate({ _id: postId, author: req.userId }, update, { new: true }).populate(
      'author',
      'userId profilePhoto'
    );
    if (!updated) return next(createError(404, 'Post not found'));

    return res.json(updated);
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Delete a post (author-only)
router.delete('/:postId', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const { postId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(postId)) return next(createError(400, 'Invalid postId'));

    const deleted = await Post.findOneAndDelete({ _id: postId, author: req.userId }).select('_id');
    if (!deleted) return next(createError(404, 'Post not found'));

    await Comment.deleteMany({ post: postId });

    return res.json({ success: true, postId });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

export default router;
