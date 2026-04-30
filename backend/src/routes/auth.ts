import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';

const router = express.Router();

router.post('/register', async (req, res) => {
  try {
    const { mobileNumber, userId, password, tc_accepted, tc_device } = req.body;
    const existingUser = await User.findOne({ $or: [{ mobileNumber }, { userId }] });
    if (existingUser) return res.status(400).json({ error: 'User already exists' });
    const passwordHash = await bcrypt.hash(password, 10);
    const user = new User({ mobileNumber, userId, passwordHash, tc_accepted, tc_timestamp: new Date(), tc_device });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({ user: { id: user._id, userId: user.userId, mobileNumber: user.mobileNumber }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const user = await User.findOne({ $or: [{ mobileNumber: identifier }, { userId: identifier }] });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({ user: { id: user._id, userId: user.userId, mobileNumber: user.mobileNumber, profilePhoto: user.profilePhoto }, token });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
