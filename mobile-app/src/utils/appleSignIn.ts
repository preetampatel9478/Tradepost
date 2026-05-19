import * as AppleAuthentication from 'expo-apple-authentication';
import { Platform } from 'react-native';
import logger from './logger';

/**
 * Apple Sign-In Utility
 * Handles Apple OAuth authentication for iOS
 */

export const isAppleSignInAvailable = async (): Promise<boolean> => {
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (err) {
    logger.warn('Apple Sign-In availability check failed:', err);
    return false;
  }
};

export interface AppleSignInCredential {
  identityToken: string;
  user?: string | null;
  email?: string | null;
  fullName?: any; // AppleAuthenticationFullName type
}

export const performAppleSignIn = async (): Promise<AppleSignInCredential> => {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Ensure identityToken is available
    if (!credential.identityToken) {
      throw new Error('Apple Sign-In failed: no identity token received');
    }

    logger.info('Apple Sign-In successful');
    return {
      identityToken: credential.identityToken,
      user: credential.user || undefined,
      email: credential.email || undefined,
      fullName: credential.fullName || undefined,
    };
  } catch (err: any) {
    if (err.code === 'ERR_CANCELED') {
      logger.info('Apple Sign-In cancelled by user');
    } else {
      logger.error('Apple Sign-In error:', err);
    }
    throw err;
  }
};

export const signOutApple = async (): Promise<void> => {
  try {
    // Apple Sign-In doesn't have a dedicated sign-out function
    // User can revoke access from Settings
    logger.info('Apple Sign-Out completed (user revoke via Settings)');
  } catch (err) {
    logger.error('Apple Sign-Out error:', err);
  }
};
