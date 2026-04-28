import jwt from 'jsonwebtoken';
import logger from './logger';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  isVerified?: boolean;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRY = process.env.JWT_EXPIRY || '24h';

export function generateToken(payload: TokenPayload): string {
  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: JWT_EXPIRY
    });
  } catch (error) {
    logger.error('Error generating JWT:', error);
    throw error;
  }
}

export function verifyToken(token: string): TokenPayload {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (error) {
    logger.error('Error verifying JWT:', error);
    throw error;
  }
}

export function decodeToken(token: string): TokenPayload | null {
  try {
    return jwt.decode(token) as TokenPayload;
  } catch (error) {
    logger.error('Error decoding JWT:', error);
    return null;
  }
}

export function generateRefreshToken(userId: string): string {
  try {
    return jwt.sign({ id: userId }, JWT_SECRET, {
      expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d'
    });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw error;
  }
}
