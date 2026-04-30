import express from 'express';
import Post from '../models/Post';
import { auth } from '../middlewares/auth';

const router = express.Router();

router.post('/', auth, async (req, res) => {
  try {
    const { content, sentiment, mediaUrls } = req.body;
    const post = new Post({ author: req.user?._id, content, sentiment, mediaUrls });
    await post.save();
    const populated = await post.populate('author', 'userId profilePhoto');
    res.status(201).json(populated);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('author', 'userId profilePhoto').sort({ createdAt: -1 }).limit(50);
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
