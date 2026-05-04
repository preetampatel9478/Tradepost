import express from 'express';
import Post from '../models/Post';
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
    const query = Post.find()
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

    const likeCount = Math.max(0, updated.likeCount ?? 0);
    const commentCount = updated.commentCount ?? 0;
    emitPostEngagementUpdated(String(updated._id), likeCount, commentCount);
    return res.json({ ...updated.toObject(), isLiked: false, likeCount });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

export default router;
