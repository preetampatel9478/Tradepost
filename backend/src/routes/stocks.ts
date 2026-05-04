import express from 'express';
import Post from '../models/Post';
import logger from '../utils/logger';

const router = express.Router();

function parseLimit(value: unknown, fallback: number) {
	const n = Number(value);
	if (!Number.isFinite(n) || n <= 0) return fallback;
	return Math.min(50, Math.floor(n));
}

// Trending "stock" tags from posts (hashtags)
router.get('/tags/trending', async (req, res) => {
	try {
		const limit = parseLimit(req.query.limit, 20);

		const results = await Post.aggregate([
			{ $unwind: '$tags' },
			{ $match: { tags: { $regex: /^#/ } } },
			{ $group: { _id: '$tags', count: { $sum: 1 } } },
			{ $sort: { count: -1, _id: 1 } },
			{ $limit: limit },
			{ $project: { _id: 0, tag: '$_id', count: 1 } },
		]);

		return res.json(results);
	} catch (err) {
		logger.error('Trending tags error:', err);
		return res.status(500).json({ success: false, message: 'Server error' });
	}
});

// Search tags by query (matches against stored hashtags)
router.get('/tags/search', async (req, res) => {
	try {
		const q = String((req.query.q ?? req.query.query ?? '')).trim();
		const limit = parseLimit(req.query.limit, 25);
		if (!q) return res.json([]);

		const safe = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
		const regex = new RegExp(safe, 'i');

		const results = await Post.aggregate([
			{ $unwind: '$tags' },
			{ $match: { tags: regex } },
			{ $group: { _id: '$tags', count: { $sum: 1 } } },
			{ $sort: { count: -1, _id: 1 } },
			{ $limit: limit },
			{ $project: { _id: 0, tag: '$_id', count: 1 } },
		]);

		return res.json(results);
	} catch (err) {
		logger.error('Tag search error:', err);
		return res.status(500).json({ success: false, message: 'Server error' });
	}
});

// Existing placeholders (kept for compatibility)
router.get('/search/:symbol', (req, res) => res.json({ message: 'Search stocks endpoint' }));
router.get('/prediction/:symbol', (req, res) => res.json({ message: 'Get stock predictions endpoint' }));
router.get('/chart/:symbol', (req, res) => res.json({ message: 'Get stock chart endpoint' }));

export default router;
