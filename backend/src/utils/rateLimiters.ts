import rateLimit from 'express-rate-limit';

/**
 * Production-grade rate limiters for authentication endpoints
 * Prevents brute force attacks, spam, and abuse
 */

// Strict limiter for login attempts (3 per 15 minutes per IP)
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Moderate limiter for registration (3 per 30 minutes per IP)
export const registerLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 3,
  message: 'Too many registration attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Moderate limiter for Google auth (5 per 30 minutes per IP)
export const googleAuthLimiter = rateLimit({
  windowMs: 30 * 60 * 1000, // 30 minutes
  max: 10,
  message: 'Too many Google authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Strict limiter for username check (20 per minute per IP)
export const usernameLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Too many username checks, please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});

// Moderate limiter for onboarding completion (3 per 10 minutes per IP)
export const onboardingLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3,
  message: 'Too many onboarding attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV !== 'production',
  keyGenerator: (req) => req.ip || req.socket.remoteAddress || 'unknown',
});
