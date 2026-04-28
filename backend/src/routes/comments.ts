import express from 'express';
const router = express.Router();

router.post('/', (req, res) => res.json({ message: 'Create comment endpoint' }));
router.get('/:postId', (req, res) => res.json({ message: 'Get comments endpoint' }));
router.delete('/:id', (req, res) => res.json({ message: 'Delete comment endpoint' }));

export default router;
