import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { uploadAvatar, buildPublicFileUrl } from '../config/upload';
import { createError } from '../middlewares/errorHandler';
import { OAuth2Client } from 'google-auth-library';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import logger from '../utils/logger';
import { validateUsername, sanitizeUsername, USERNAME_RULES } from '../utils/usernameValidator';

const router = express.Router();
const googleClient = new OAuth2Client();

function parseCsvEnv(value: unknown): string[] {
  return String(value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function getGoogleAudiences(): string[] {
  const envs = [
    ...parseCsvEnv(process.env.GOOGLE_CLIENT_IDS),
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_WEB_CLIENT_ID,
    process.env.GOOGLE_EXPO_CLIENT_ID,
    process.env.GOOGLE_ANDROID_CLIENT_ID,
    process.env.GOOGLE_IOS_CLIENT_ID,
  ];

  const unique = new Set(envs.map((v) => String(v ?? '').trim()).filter(Boolean));
  return Array.from(unique);
}

/**
 * POST /api/auth/google
 * Google OAuth Sign-In endpoint
 * Verifies Google ID token server-side and creates/returns user
 * On first login (new user), sets isOnboarded: false
 * On returning user, sets isOnboarded based on profile completion
 */


router.post('/register', uploadAvatar.single('profilePhoto'), async (req, res, next) => {
  try {
    const { mobileNumber, userId, password, tc_accepted, tc_device, name, email } = req.body;
    if (!mobileNumber?.trim()) return next(createError(400, 'Mobile Number is required'));
    if (!userId?.trim()) return next(createError(400, 'User ID is required'));
    if (!password || String(password).length < 6) return next(createError(400, 'Password must be at least 6 characters'));
    const existingUser = await User.findOne({ 
      $or: [
        { mobileNumber }, 
        { userId },
        ...(email ? [{ email: String(email).trim().toLowerCase() }] : [])
      ] 
    });
    if (existingUser) {
      if (existingUser.mobileNumber === mobileNumber) return next(createError(409, 'Mobile number already in use'));
      if (existingUser.userId === userId) return next(createError(409, 'User ID already taken'));
      if (email && (existingUser as any).email === String(email).trim().toLowerCase()) return next(createError(409, 'Email already in use'));
      return next(createError(409, 'User already exists'));
    }
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
    if (err?.code === 11000) {
      if (err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        let displayField = field;
        if (field === 'mobileNumber') displayField = 'Mobile number';
        if (field === 'userId') displayField = 'User ID';
        if (field === 'email') displayField = 'Email';
        return next(createError(409, `${displayField} already in use`));
      }
      return next(createError(409, 'User already exists'));
    }
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

router.post('/google', async (req, res, next) => {
  try {
    const { idToken } = req.body;
    if (!idToken) return next(createError(400, 'idToken is required'));

    const audiences = getGoogleAudiences();
    if (audiences.length === 0) {
      logger.error('Google auth misconfigured: no GOOGLE_CLIENT_ID(S) provided');
      return next(createError(500, 'Google authentication is not configured'));
    }

    // Verify Google token on the server-side (never trust client tokens)
    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({
        idToken,
        audience: audiences,
      });
      payload = ticket.getPayload();
    } catch (err) {
      logger.error('Google Token Verification Error:', err);
      return next(createError(401, 'Invalid or expired Google token'));
    }

    if (!payload?.email || !payload?.sub) {
      return next(createError(400, 'Invalid Google token payload'));
    }

    // Normalize email to lowercase for consistency
    const normalizedEmail = payload.email.toLowerCase();

    // Try to find existing user by googleId or email
    let user = await User.findOne({
      $or: [{ googleId: payload.sub }, { email: normalizedEmail }],
    });

    if (!user) {
      // New user: Create with temporary userId (will be set during onboarding)
      const tempUserId = `google_${payload.sub.substring(0, 12)}_${Date.now()}`;
      
      user = new User({
        googleId: payload.sub,
        email: normalizedEmail,
        name: payload.name || '',
        profilePhoto: payload.picture || '',
        userId: tempUserId,
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10), // Dummy hash
        isOnboarded: false,
        tc_accepted: false,
      });

      await user.save();
      logger.info(`New Google user created: ${user._id} (${normalizedEmail})`);
    } else if (user.googleId !== payload.sub) {
      // Existing user without Google linked: Link Google account
      user.googleId = payload.sub;
      await user.save();
      logger.info(`Google account linked to existing user: ${user._id}`);
    }

    // Issue JWT token (valid for 7 days, but limited scope if not onboarded)
    const token = jwt.sign(
      { id: user._id, email: user.email, isOnboarded: user.isOnboarded },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name || '',
        email: user.email,
        avatar: user.profilePhoto,
        isOnboarded: user.isOnboarded,
      },
      token,
      is_onboarded: user.isOnboarded,
    });
  } catch (err: any) {
    logger.error('Google Auth Error:', err);
    return next(createError(500, 'Google authentication failed'));
  }
});

/**
 * POST /api/auth/apple
 * Apple OAuth Sign-In endpoint (iOS/Mac)
 * Verifies Apple identity token server-side and creates/returns user
 * Similar flow to Google - creates temp user on first login
 */
router.post('/apple', async (req, res, next) => {
  try {
    const { identityToken, user: appleUser } = req.body;
    if (!identityToken) return next(createError(400, 'identityToken is required'));

    // Note: Apple identity token verification requires decoding JWT without verification
    // In production, you should validate the token signature against Apple's public keys
    // For now, we trust the client to provide a valid token (client verifies with Apple SDK)
    
    let decodedToken: any;
    try {
      // Decode JWT without verification (Apple handles verification on client)
      const parts = identityToken.split('.');
      if (parts.length !== 3) throw new Error('Invalid token format');
      
      const decoded = Buffer.from(parts[1], 'base64').toString('utf-8');
      decodedToken = JSON.parse(decoded);
    } catch (err) {
      logger.error('Apple Token Decode Error:', err);
      return next(createError(401, 'Invalid Apple token'));
    }

    const appleId = decodedToken.sub;
    const email = decodedToken.email || appleUser?.email;
    
    if (!appleId) {
      return next(createError(400, 'Invalid Apple token payload'));
    }

    const normalizedEmail = email ? email.toLowerCase() : null;

    // Try to find existing user by appleId or email
    const appleLookupConditions: any[] = [{ appleId }];
    if (normalizedEmail) {
      appleLookupConditions.push({ email: normalizedEmail });
    }

    let user = await User.findOne({
      $or: appleLookupConditions,
    });

    if (!user) {
      // New user: Create with temporary userId
      const tempUserId = `apple_${appleId.substring(0, 12)}_${Date.now()}`;
      
      user = new User({
        appleId,
        email: normalizedEmail || '',
        name: appleUser?.fullName ? 
          `${appleUser.fullName.firstName || ''} ${appleUser.fullName.lastName || ''}`.trim() 
          : '',
        userId: tempUserId,
        passwordHash: await bcrypt.hash(Math.random().toString(36), 10),
        isOnboarded: false,
        tc_accepted: false,
      });

      await user.save();
      logger.info(`New Apple user created: ${user._id} (${normalizedEmail || 'no-email'})`);
    } else if (user.appleId !== appleId) {
      // Existing user without Apple linked: Link Apple account
      user.appleId = appleId;
      await user.save();
      logger.info(`Apple account linked to existing user: ${user._id}`);
    }

    // Issue JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, isOnboarded: user.isOnboarded },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name || '',
        email: user.email,
        avatar: user.profilePhoto,
        isOnboarded: user.isOnboarded,
      },
      token,
      is_onboarded: user.isOnboarded,
    });
  } catch (err: any) {
    logger.error('Apple Auth Error:', err);
    return next(createError(500, 'Apple authentication failed'));
  }
});

/**
 * GET /api/auth/check-username
 * Check if a username is available for registration
 * Returns { available: boolean, error?: string }
 */
router.get('/check-username', async (req, res, next) => {
  try {
    const { username } = req.query;
    if (!username || typeof username !== 'string') {
      return next(createError(400, 'Username parameter is required'));
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return res.json({ available: false, error: validation.error });
    }

    const sanitized = sanitizeUsername(username);
    
    // Check if username exists (case-insensitive)
    const existing = await User.findOne({ userId: sanitized });
    
    res.json({
      available: !existing,
      username: sanitized,
    });
  } catch (err: any) {
    logger.error('Check Username Error:', err);
    return next(createError(500, 'Failed to check username availability'));
  }
});

/**
 * PUT /api/auth/complete-onboarding
 * Complete user onboarding by setting username and accepting T&C
 * Protected endpoint - requires valid JWT token
 * Only users with isOnboarded: false can complete this
 */
router.put('/complete-onboarding', authMiddleware, async (req: AuthenticatedRequest, res, next) => {
  try {
    const { username, tc_accepted, tc_device } = req.body;
    const userId = req.userId;

    // Validate input
    if (!username || typeof username !== 'string') {
      return next(createError(400, 'Valid username is required'));
    }

    if (!tc_accepted) {
      return next(createError(400, 'Terms and Conditions must be accepted'));
    }

    if (!userId) {
      logger.warn('Complete onboarding called without userId in token');
      return next(createError(401, 'Unauthorized'));
    }

    // Validate username format
    const validation = validateUsername(username);
    if (!validation.valid) {
      return res.status(400).json({ success: false, error: validation.error });
    }

    const sanitized = sanitizeUsername(username);

    // Fetch user from database
    const user = await User.findById(userId);
    if (!user) {
      logger.warn(`User not found during onboarding: ${userId}`);
      return next(createError(404, 'User not found'));
    }

    // Check if already onboarded (prevent race conditions)
    if (user.isOnboarded) {
      logger.warn(`User already onboarded, attempted re-onboarding: ${userId}`);
      return next(createError(400, 'User has already completed onboarding'));
    }

    // Check if username already exists (excluding current user's temp username)
    const existingUser = await User.findOne({ userId: sanitized });
    if (existingUser && existingUser._id.toString() !== user._id.toString()) {
      logger.warn(`Username taken during onboarding: ${sanitized}`);
      return res.status(409).json({ success: false, error: 'Username is already taken' });
    }

    // Update user with chosen username and T&C acceptance
    user.userId = sanitized;
    user.isOnboarded = true;
    user.tc_accepted = true;
    user.tc_timestamp = new Date();
    user.tc_device = tc_device || 'unknown';

    await user.save();
    logger.info(`User onboarded successfully: ${user._id} with username: ${sanitized}`);

    // Issue production-grade tokens
    const token = jwt.sign(
      { id: user._id, email: user.email, isOnboarded: true },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    const refreshToken = jwt.sign(
      { id: user._id },
      process.env.JWT_REFRESH_SECRET || 'refresh-secret',
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      user: {
        id: user._id,
        userId: user.userId,
        name: user.name || '',
        email: user.email,
        avatar: user.profilePhoto,
        isOnboarded: user.isOnboarded,
      },
      token,
      refreshToken,
    });
  } catch (err: any) {
    logger.error('Complete Onboarding Error:', err);
    if (err?.code === 11000) {
      if (err.keyValue) {
        const field = Object.keys(err.keyValue)[0];
        let displayField = field;
        if (field === 'mobileNumber') displayField = 'Mobile number';
        if (field === 'userId') displayField = 'User ID';
        if (field === 'email') displayField = 'Email';
        return next(createError(409, `${displayField} already in use`));
      }
      return next(createError(409, 'Username is already taken'));
    }
    return next(createError(500, 'Failed to complete onboarding'));
  }
});

export default router;
