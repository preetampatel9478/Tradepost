import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';

// Redirect scheme for OAuth
const redirectUrl = AuthSession.getRedirectUrl();
const clientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// Cache for the discovery document
let cachedDiscovery: any = null;

export const isGoogleSignInAvailable = () => {
  return clientId !== undefined && clientId !== '';
};

export const performGoogleSignIn = async () => {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google Client ID is not configured');
  }

  try {
    // Get the OAuth discovery document
    if (!cachedDiscovery) {
      const discoveryUrl = 'https://accounts.google.com/.well-known/openid-configuration';
      const response = await fetch(discoveryUrl);
      if (!response.ok) throw new Error('Failed to fetch OAuth discovery');
      cachedDiscovery = await response.json();
    }

    const discovery = cachedDiscovery;
    const scopes = ['profile', 'email'];

    // Build the authorization request
    const requestParams = new URLSearchParams({
      response_type: 'code',
      client_id: clientId!,
      redirect_uri: redirectUrl,
      scope: scopes.join(' '),
      prompt: 'consent',
    });

    const authUrl = `${discovery.authorization_endpoint}?${requestParams.toString()}`;

    // Open the OAuth flow in browser
    const result = await AuthSession.startAsync({
      authUrl,
      returnUrl: redirectUrl,
      showInRecents: true,
    });

    if (result.type !== 'success') {
      throw new Error('OAuth authorization canceled or failed');
    }

    // Exchange the code for tokens using Google's token endpoint
    const tokenResponse = await fetch(discovery.token_endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: result.params.code,
        client_id: clientId!,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
      }).toString(),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code for tokens');
    }

    const tokens = await tokenResponse.json();
    const idToken = tokens.id_token;

    if (!idToken) {
      throw new Error('No ID token received from Google');
    }

    console.log('✅ Google Sign-In successful');
    return { idToken };
  } catch (error: any) {
    console.error('❌ Google Sign-In error:', error);
    throw error;
  }
};

// Warm up the browser for faster OAuth flow
WebBrowser.warmUpAsync().catch(() => {
  console.warn('⚠️ Could not warm up browser');
});

export default { performGoogleSignIn, isGoogleSignInAvailable };
