import express from 'express';
import mongoose from 'mongoose';
import Notification from '../models/Notification';
import { auth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';

const router = express.Router();

// List notifications for current user
router.get('/', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 30));
    const skip = Math.max(0, Number(req.query.skip) || 0);

    const items = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('actor', 'userId name profilePhoto')
      .populate('post', 'content mediaUrls')
      .select('_id type post comment message read createdAt');

    const total = await Notification.countDocuments({ recipient: req.userId });

    return res.json({ total, items, limit, skip });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Unread count
router.get('/unread-count', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const unread = await Notification.countDocuments({ recipient: req.userId, read: false });
    return res.json({ unread });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Mark one notification as read
router.put('/:id/read', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return next(createError(400, 'Invalid id'));

    const updated = await Notification.findOneAndUpdate(
      { _id: id, recipient: req.userId, read: false },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    ).select('_id read readAt');

    return res.json({ success: true, notification: updated });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

// Mark all as read
router.put('/read-all', auth, async (req: AuthenticatedRequest, res, next) => {
  try {
    if (!req.userId) return next(createError(401, 'Unauthorized'));

    const result = await Notification.updateMany(
      { recipient: req.userId, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    return res.json({ success: true, updated: result.modifiedCount ?? 0 });
  } catch (err) {
    return next(createError(500, 'Server error'));
  }
});

export default router;
