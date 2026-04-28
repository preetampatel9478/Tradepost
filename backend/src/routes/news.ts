import express from 'express';
const router = express.Router();

router.get('/indian', (req, res) => res.json({ message: 'Get Indian market news endpoint' }));
router.get('/global', (req, res) => res.json({ message: 'Get global market news endpoint' }));
router.get('/trending', (req, res) => res.json({ message: 'Get trending news endpoint' }));
router.get('/search', (req, res) => res.json({ message: 'Search news endpoint' }));

export default router;
