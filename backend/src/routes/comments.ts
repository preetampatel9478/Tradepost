import express from 'express';
import mongoose from 'mongoose';
import Comment from '../models/Comment';
import Post from '../models/Post';
import Notification from '../models/Notification';
import { auth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';
import { getIO } from '../config/socket';

const router = express.Router();

function emitPostEngagementUpdated(postId: string, likeCount: number, commentCount: number) {
	try {
		const io = getIO();
		io.emit('posts:engagementUpdated', { postId, likeCount, commentCount });
	} catch {
		// Socket not initialized; ignore.
	}
}

function emitNotificationNew(recipientId: string) {
	try {
		const io = getIO();
		io.to(`user:${recipientId}`).emit('notifications:new', { recipientId });
	} catch {
		// Socket not initialized; ignore.
	}
}

router.post('/', auth, async (req: AuthenticatedRequest, res, next) => {
	try {
		if (!req.userId) return next(createError(401, 'Unauthorized'));

		const { postId, content, parentCommentId } = req.body as {
			postId?: string;
			content?: string;
			parentCommentId?: string;
		};
		if (!postId || !mongoose.Types.ObjectId.isValid(postId)) return next(createError(400, 'Valid postId is required'));
		if (!content?.trim()) return next(createError(400, 'Comment content is required'));

		let parentComment: string | null = null;
		if (parentCommentId) {
			if (!mongoose.Types.ObjectId.isValid(parentCommentId)) return next(createError(400, 'Invalid parentCommentId'));
			const parent = await Comment.findOne({ _id: parentCommentId, post: postId, isDeleted: false }).select('_id');
			if (!parent) return next(createError(404, 'Parent comment not found'));
			parentComment = String(parent._id);
		}

		const post = await Post.findById(postId).select('author');
		if (!post) return next(createError(404, 'Post not found'));

		const comment = await Comment.create({
			post: postId,
			parentComment,
			author: req.userId,
			content: content.trim(),
		});

		const updatedPost = await Post.findByIdAndUpdate(
			postId,
			{ $inc: { commentCount: 1 } },
			{ new: true }
		).select('likeCount commentCount');

		const likeCount = updatedPost?.likeCount ?? 0;
		const commentCount = updatedPost?.commentCount ?? 0;
		emitPostEngagementUpdated(String(postId), likeCount, commentCount);

		// Create notification for post author (if not self).
		const authorId = String((post as any).author || '');
		if (authorId && String(authorId) !== String(req.userId)) {
			const snippet = content.trim().slice(0, 140);
			await Notification.create({
				recipient: authorId,
				actor: req.userId,
				type: 'comment',
				post: postId,
				comment: comment._id,
				message: snippet,
				read: false,
			});
			emitNotificationNew(authorId);
		}

		const populated = await comment.populate('author', 'userId profilePhoto');
		return res.status(201).json({
			comment: populated,
			post: { _id: postId, likeCount, commentCount },
		});
	} catch (err) {
		return next(createError(500, 'Server error'));
	}
});

router.get('/:postId', async (req, res, next) => {
	try {
		const { postId } = req.params;
		if (!mongoose.Types.ObjectId.isValid(postId)) return next(createError(400, 'Invalid postId'));

		const comments = await Comment.find({ post: postId })
			.populate('author', 'userId profilePhoto')
			.sort({ createdAt: 1 })
			.limit(100);

		return res.json(comments);
	} catch (err) {
		return next(createError(500, 'Server error'));
	}
});

router.delete('/:id', auth, async (req: AuthenticatedRequest, res, next) => {
	try {
		if (!req.userId) return next(createError(401, 'Unauthorized'));

		const { id } = req.params;
		if (!mongoose.Types.ObjectId.isValid(id)) return next(createError(400, 'Invalid comment id'));

		const comment = await Comment.findOneAndUpdate(
			{ _id: id, author: req.userId, isDeleted: false },
			{ $set: { isDeleted: true, deletedAt: new Date(), content: '' } },
			{ new: true }
		);
		if (!comment) return next(createError(404, 'Comment not found'));

		const postId = String(comment.post);

		const updatedPost = await Post.findByIdAndUpdate(postId, { $inc: { commentCount: -1 } }, { new: true }).select(
			'likeCount commentCount'
		);

		const likeCount = updatedPost?.likeCount ?? 0;
		const commentCount = Math.max(0, updatedPost?.commentCount ?? 0);
		emitPostEngagementUpdated(postId, likeCount, commentCount);

		return res.json({ success: true, post: { _id: postId, likeCount, commentCount } });
	} catch (err) {
		return next(createError(500, 'Server error'));
	}
});

export default router;
