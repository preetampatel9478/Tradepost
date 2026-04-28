import 'dotenv/config';
import http from 'http';
import app from './app';
import { connectDatabase } from './config/database';
import { initializeSocket } from './config/socket';
import logger from './utils/logger';

const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

async function startServer() {
  try {
    // Connect to MongoDB
    await connectDatabase();
    logger.info('✅ Database connected successfully');

    // Create HTTP server for Socket.io
    const server = http.createServer(app);

    // Initialize Socket.io
    initializeSocket(server);
    logger.info('✅ Socket.io initialized');

    // Start server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on http://${HOST}:${PORT}`);
      logger.info(`📱 API: http://${HOST}:${PORT}/api`);
      logger.info(`🔌 WebSocket: ws://${HOST}:${PORT}/socket.io`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    logger.error('❌ Server startup error:', error);
    process.exit(1);
  }
}

startServer();
