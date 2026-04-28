import express from 'express';
const router = express.Router();

router.get('/list', (req, res) => res.json({ message: 'Get chat list endpoint' }));
router.get('/:userId', (req, res) => res.json({ message: 'Get chat messages endpoint' }));
router.post('/send', (req, res) => res.json({ message: 'Send message endpoint' }));

export default router;
