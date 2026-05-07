import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import logger from './utils/logger';

// Middleware imports
import { errorHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';

// Route imports
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import postRoutes from './routes/posts';
import commentRoutes from './routes/comments';
import stockRoutes from './routes/stocks';
import chatRoutes from './routes/chat';
import newsRoutes from './routes/news';
import verificationRoutes from './routes/verification';
import notificationRoutes from './routes/notifications';

const app: Express = express();

// If the app is behind a reverse proxy (Docker, nginx, load balancer), this ensures
// `req.ip` is derived correctly from `X-Forwarded-For`.
app.set('trust proxy', 1);

// ========== Security Middleware ==========
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',')
    : ['http://localhost:3000', 'http://localhost:19000'],
  credentials: true
}));

// ========== Rate Limiting ==========
// Avoid blocking local development (Expo tends to generate lots of API requests).
// Keep protection in production.
if (process.env.NODE_ENV === 'production') {
  const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
  const max = Number(process.env.RATE_LIMIT_MAX) || 300;

  const limiter = rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests from this IP, please try again later.'
  });

  app.use('/api/', limiter);
}

// ========== Body Parser ==========
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========== Static Uploads ==========
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// ========== Logging ==========
app.use(morgan('combined', { stream: { write: (message: string) => logger.info(message.trimEnd()) } }));
app.use(requestLogger);

// ========== Health Check ==========
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ========== API Routes ==========
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/stocks', stockRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/notifications', notificationRoutes);

// ========== 404 Handler ==========
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path
  });
});

// ========== Error Handler ==========
app.use(errorHandler);

export default app;
