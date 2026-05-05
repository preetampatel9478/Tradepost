import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { uploadAvatar, buildPublicFileUrl } from '../config/upload';
import { createError } from '../middlewares/errorHandler';

const router = express.Router();

router.post('/register', uploadAvatar.single('profilePhoto'), async (req, res, next) => {
  try {
    const { mobileNumber, userId, password, tc_accepted, tc_device, name, email } = req.body;
    if (!mobileNumber?.trim()) return next(createError(400, 'Mobile Number is required'));
    if (!userId?.trim()) return next(createError(400, 'User ID is required'));
    if (!password || String(password).length < 6) return next(createError(400, 'Password must be at least 6 characters'));
    const existingUser = await User.findOne({ $or: [{ mobileNumber }, { userId }] });
    if (existingUser) return next(createError(409, 'User already exists'));
    const passwordHash = await bcrypt.hash(password, 10);

    const uploadedFile = (req as any).file as Express.Multer.File | undefined;
    const profilePhoto = uploadedFile
      ? buildPublicFileUrl(req, `/uploads/avatars/${uploadedFile.filename}`)
      : '';

    const user = new User({
      mobileNumber,
      userId,
      name: String(name || userId || '').trim(),
      email: String(email || '').trim().toLowerCase(),
      passwordHash,
      profilePhoto,
      tc_accepted: tc_accepted === true || tc_accepted === 'true',
      tc_timestamp: new Date(),
      tc_device,
    });
    await user.save();
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.status(201).json({
      user: {
        id: user._id,
        userId: user.userId,
        name: (user as any).name || '',
        email: (user as any).email || '',
        mobileNumber: user.mobileNumber,
        avatar: user.profilePhoto,
        bio: (user as any).bio || '',
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    // Duplicate key protection (unique indexes)
    if (err?.code === 11000) return next(createError(409, 'User already exists'));
    return next(createError(500, 'Registration failed'));
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier?.trim()) return next(createError(400, 'Mobile Number or User ID is required'));
    if (!password) return next(createError(400, 'Password is required'));
    const user = await User.findOne({ $or: [{ mobileNumber: identifier }, { userId: identifier }] });
    if (!user) return next(createError(400, 'Invalid credentials'));
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) return next(createError(400, 'Invalid credentials'));
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
    res.json({
      user: {
        id: user._id,
        userId: user.userId,
        name: (user as any).name || '',
        email: (user as any).email || '',
        mobileNumber: user.mobileNumber,
        avatar: user.profilePhoto,
        bio: (user as any).bio || '',
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    return next(createError(500, 'Login failed'));
  }
});

export default router;
