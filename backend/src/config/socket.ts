import { Server, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import logger from '../utils/logger';
import { verifyToken } from '../utils/jwt';

let io: Server;

export function initializeSocket(httpServer: HTTPServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN?.split(',') || ['*'],
      credentials: true
    },
    pingInterval: Number(process.env.SOCKET_PING_INTERVAL) || 25000,
    pingTimeout: Number(process.env.SOCKET_PING_TIMEOUT) || 60000
  });

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = verifyToken(token);
      (socket as any).userId = decoded.id;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  // Connection handler
  io.on('connection', (socket: Socket) => {
    const userId = (socket as any).userId;
    logger.info(`✅ User connected: ${userId} (Socket: ${socket.id})`);

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      logger.info(`❌ User disconnected: ${userId} (Socket: ${socket.id})`);
    });

    // Handle errors
    socket.on('error', (error) => {
      logger.error(`Socket error for user ${userId}:`, error);
    });
  });

  logger.info('✅ Socket.io initialized');
  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
