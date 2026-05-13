import express from 'express';
import mongoose from 'mongoose';
import User from '../models/User';
import Conversation from '../models/Conversation';
import Message from '../models/Message';
import { auth, type AuthenticatedRequest } from '../middlewares/auth';
import { createError } from '../middlewares/errorHandler';
import { getIO } from '../config/socket';

const router = express.Router();

function emitChatMessage(userId: string, payload: any) {
	try {
		const io = getIO();
		io.to(`user:${userId}`).emit('chat:message', payload);
	} catch {
		// socket not initialized; ignore
	}
}

async function resolveUserIdOrHandle(value: string) {
	const trimmed = String(value || '').trim();
	if (!trimmed) return null;

	if (mongoose.Types.ObjectId.isValid(trimmed)) {
		const u = await User.findById(trimmed).select('_id userId name profilePhoto');
		if (u) return u;
	}

	const u = await User.findOne({ userId: trimmed }).select('_id userId name profilePhoto');
	return u || null;
}

async function getOrCreateDirectConversation(a: string, b: string) {
	const ids = [String(a), String(b)].sort();
	const key = `${ids[0]}:${ids[1]}`;
	const existing = await Conversation.findOne({ participantsKey: key });
	if (existing) return existing;

	const convo = new Conversation({
		type: 'direct',
		participants: ids.map((id) => new mongoose.Types.ObjectId(id)),
		participantsKey: key,
	});
	await convo.save();
	return convo;
}

// List my direct conversations
router.get('/list', auth, async (req: AuthenticatedRequest, res, next) => {
	try {
		if (!req.userId) return next(createError(401, 'Unauthorized'));

		const meId = new mongoose.Types.ObjectId(String(req.userId));
		const convos = await Conversation.find({ participants: meId })
			.sort({ lastMessageAt: -1, updatedAt: -1 })
			.limit(50)
			.lean();

		const peerIds = convos
			.flatMap((c: any) => (c.participants || []).map((id: any) => String(id)))
			.filter((id: string) => id && id !== String(meId));

		const uniquePeerIds = Array.from(new Set(peerIds));
		const peers = await User.find({ _id: { $in: uniquePeerIds } }).select('_id userId name profilePhoto').lean();
		const peersById = new Map(peers.map((p: any) => [String(p._id), p]));

		const items = convos.map((c: any) => {
			const participants = (c.participants || []).map((id: any) => String(id));
			const peerId = participants.find((id: string) => id !== String(meId)) || '';
			const peer = peerId ? peersById.get(peerId) : null;
			return {
				conversationId: String(c._id),
				peer: peer
					? { id: String(peer._id), userId: peer.userId, name: peer.name || '', avatar: peer.profilePhoto || '' }
					: null,
				lastMessageAt: c.lastMessageAt,
				lastMessageText: c.lastMessageText || '',
				lastMessageSender: c.lastMessageSender ? String(c.lastMessageSender) : null,
			};
		});

		return res.json({ items });
	} catch {
		return next(createError(500, 'Server error'));
	}
});

// Get (or create) a direct conversation with a peer + recent messages
router.get('/:userId', auth, async (req: AuthenticatedRequest, res, next) => {
	try {
		if (!req.userId) return next(createError(401, 'Unauthorized'));

		const peer = await resolveUserIdOrHandle(String(req.params.userId || ''));
		if (!peer) return next(createError(404, 'User not found'));
		if (String(peer._id) === String(req.userId)) return next(createError(400, 'Cannot chat with yourself'));

		const convo = await getOrCreateDirectConversation(String(req.userId), String(peer._id));

		const raw = await Message.find({ conversation: convo._id })
			.sort({ createdAt: -1 })
			.limit(60)
			.lean();

		const messages = raw
			.reverse()
			.map((m: any) => ({
				_id: String(m._id),
				conversationId: String(m.conversation),
				senderId: String(m.sender),
				recipientId: String(m.recipient),
				content: m.content,
				createdAt: m.createdAt,
			}));

		return res.json({
			conversationId: String(convo._id),
			peer: { id: String(peer._id), userId: peer.userId, name: (peer as any).name || '', avatar: (peer as any).profilePhoto || '' },
			messages,
		});
	} catch {
		return next(createError(500, 'Server error'));
	}
});

// Send a direct message
router.post('/send', auth, async (req: AuthenticatedRequest, res, next) => {
	try {
		if (!req.userId) return next(createError(401, 'Unauthorized'));

		const toRaw = String(req.body?.toUserId ?? req.body?.to ?? '').trim();
		const contentRaw = typeof req.body?.content === 'string' ? req.body.content : '';
		const content = String(contentRaw).trim();

		if (!toRaw) return next(createError(400, 'toUserId is required'));
		if (!content) return next(createError(400, 'Message content is required'));
		if (content.length > 2000) return next(createError(400, 'Message too long (max 2000 chars)'));

		const peer = await resolveUserIdOrHandle(toRaw);
		if (!peer) return next(createError(404, 'User not found'));
		if (String(peer._id) === String(req.userId)) return next(createError(400, 'Cannot message yourself'));

		const convo = await getOrCreateDirectConversation(String(req.userId), String(peer._id));

		const msg = new Message({
			conversation: convo._id,
			sender: req.userId,
			recipient: peer._id,
			content,
		});
		await msg.save();

		await Conversation.findByIdAndUpdate(convo._id, {
			$set: {
				lastMessageAt: msg.createdAt,
				lastMessageText: content.slice(0, 500),
				lastMessageSender: req.userId,
			},
		});

		const payload = {
			conversationId: String(convo._id),
			message: {
				_id: String(msg._id),
				conversationId: String(convo._id),
				senderId: String(req.userId),
				recipientId: String(peer._id),
				content,
				createdAt: msg.createdAt,
			},
		};

		emitChatMessage(String(req.userId), payload);
		emitChatMessage(String(peer._id), payload);

		return res.status(201).json(payload);
	} catch {
		return next(createError(500, 'Server error'));
	}
});

export default router;
