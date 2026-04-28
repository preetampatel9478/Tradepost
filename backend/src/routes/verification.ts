import express from 'express';
const router = express.Router();

router.post('/request', (req, res) => res.json({ message: 'Submit verification request endpoint' }));
router.post('/upload', (req, res) => res.json({ message: 'Upload verification documents endpoint' }));
router.get('/status', (req, res) => res.json({ message: 'Get verification status endpoint' }));

export default router;
