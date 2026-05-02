import express from 'express';
import Post from '../models/Post';
import { auth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';

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

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'userId profilePhoto').sort({ createdAt: -1 }).limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

export default router;
