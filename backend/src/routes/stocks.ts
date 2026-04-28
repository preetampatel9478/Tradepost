import express from 'express';
const router = express.Router();

router.get('/search/:symbol', (req, res) => res.json({ message: 'Search stocks endpoint' }));
router.get('/prediction/:symbol', (req, res) => res.json({ message: 'Get stock predictions endpoint' }));
router.get('/chart/:symbol', (req, res) => res.json({ message: 'Get stock chart endpoint' }));

export default router;
