import { Platform } from 'react-native';

let GoogleSignin: any = null;

try {
  if (Platform.OS !== 'web') {
    GoogleSignin = require('@react-native-google-signin/google-signin').GoogleSignin;
    
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || 'dummy-client-id',
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
  }
} catch (err) {
  console.warn('Google Sign-In not available:', err);
}

export const isGoogleSignInAvailable = () => {
  return GoogleSignin !== null;
};

export const getGoogleSignIn = () => {
  return GoogleSignin;
};

export default GoogleSignin;
