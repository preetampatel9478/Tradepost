import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Secure Token Storage Utility
 * Uses AsyncStorage for now to fix the ExpoCryptoAES native module error.
 * Once you create a custom dev client (EAS Build), you can switch back to SecureStore.
 */

const TOKEN_KEY = 'auth_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const TEMP_TOKEN_KEY = 'temp_token';

// Use AsyncStorage temporarily to prevent ExpoCryptoAES crashes in Expo Go
// Change `true` to `false` when running a proper production build or custom dev client
const useAsyncStorageFallback = true; 

export async function saveAuthToken(token: string): Promise<void> {
  try {
    if (useAsyncStorageFallback) {
      await AsyncStorage.setItem(TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(TOKEN_KEY, token);
    }
  } catch (err) {
    console.error('Failed to save auth token:', err);
    throw err;
  }
}

export async function getAuthToken(): Promise<string | null> {
  try {
    if (useAsyncStorageFallback) {
      return await AsyncStorage.getItem(TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to retrieve auth token:', err);
    return null;
  }
}

export async function removeAuthToken(): Promise<void> {
  try {
    if (useAsyncStorageFallback) {
      await AsyncStorage.removeItem(TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to remove auth token:', err);
  }
}

export async function saveRefreshToken(token: string): Promise<void> {
  try {
    if (useAsyncStorageFallback) {
      await AsyncStorage.setItem(REFRESH_TOKEN_KEY, token);
    } else {
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, token);
    }
  } catch (err) {
    console.error('Failed to save refresh token:', err);
    throw err;
  }
}

export async function getRefreshToken(): Promise<string | null> {
  try {
    if (useAsyncStorageFallback) {
      return await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } else {
      return await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to retrieve refresh token:', err);
    return null;
  }
}

export async function removeRefreshToken(): Promise<void> {
  try {
    if (useAsyncStorageFallback) {
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to remove refresh token:', err);
  }
}

/**
 * Temporary tokens for onboarding (can be stored in memory or regular storage)
 * These are short-lived and don't require encryption
 */
export async function saveTempToken(token: string): Promise<void> {
  try {
    // Use in-memory storage or AsyncStorage for temp tokens (not sensitive)
    await AsyncStorage.setItem(TEMP_TOKEN_KEY, token);
  } catch (err) {
    console.error('Failed to save temp token:', err);
    throw err;
  }
}

export async function getTempToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(TEMP_TOKEN_KEY);
  } catch (err) {
    console.error('Failed to retrieve temp token:', err);
    return null;
  }
}

export async function removeTempToken(): Promise<void> {
  try {
    await AsyncStorage.removeItem(TEMP_TOKEN_KEY);
  } catch (err) {
    console.error('Failed to remove temp token:', err);
  }
}

/**
 * Clear all auth-related tokens (logout)
 */
export async function clearAllTokens(): Promise<void> {
  try {
    await Promise.all([
      removeAuthToken(),
      removeRefreshToken(),
      removeTempToken(),
    ]);
  } catch (err) {
    console.error('Failed to clear all tokens:', err);
  }
}
