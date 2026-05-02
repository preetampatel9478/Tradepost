import jwt from 'jsonwebtoken';
import logger from './logger';
import type { Secret, SignOptions } from 'jsonwebtoken';

interface TokenPayload {
  id: string;
  email: string;
  role: string;
  isVerified?: boolean;
}

const JWT_SECRET: Secret = process.env.JWT_SECRET || 'your_secret_key';
const JWT_EXPIRY: SignOptions['expiresIn'] = (process.env.JWT_EXPIRY as SignOptions['expiresIn']) || '24h';

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
    const refreshExpiry: SignOptions['expiresIn'] =
      (process.env.REFRESH_TOKEN_EXPIRY as SignOptions['expiresIn']) || '7d';
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: refreshExpiry });
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw error;
  }
}
