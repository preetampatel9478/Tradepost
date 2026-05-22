import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import Constants from 'expo-constants';
import * as Crypto from 'expo-crypto';

// Completes pending auth sessions on iOS / web.
WebBrowser.maybeCompleteAuthSession();

function sanitizeClientId(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^"(.*)"$/, '$1')
    .replace(/^'(.*)'$/, '$1');
}

const clientId = sanitizeClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID) ||
  sanitizeClientId((Constants.expoConfig?.extra as any)?.googleWebClientId);

// Cache for the discovery document
let cachedDiscovery: any = null;

export const isGoogleSignInAvailable = () => {
  return clientId !== '';
};

function getProjectFullNameForProxy(): string | null {
  const owner = Constants.expoConfig?.owner;
  const slug = Constants.expoConfig?.slug;
  if (!owner || !slug) return null;
  return `@${owner}/${slug}`;
}

function getProxyRedirectUri(projectFullName: string): string {
  return `https://auth.expo.io/${projectFullName}`;
}

export const performGoogleSignIn = async () => {
  if (!isGoogleSignInAvailable()) {
    throw new Error('Google Client ID is not configured');
  }

  const projectFullNameForProxy = getProjectFullNameForProxy();
  const useProxy = Boolean(projectFullNameForProxy);
  const proxyRedirectUri = projectFullNameForProxy ? getProxyRedirectUri(projectFullNameForProxy) : null;

  try {
    // Get the OAuth discovery document (expo-auth-session format)
    if (!cachedDiscovery) {
      cachedDiscovery = await AuthSession.fetchDiscoveryAsync('https://accounts.google.com');
    }

    const discovery = cachedDiscovery as AuthSession.DiscoveryDocument;
    const scopes = ['openid', 'profile', 'email'];

    // When using the Expo AuthSession proxy (recommended for Expo Go), the provider redirect URI
    // must be the proxy URL (https://auth.expo.io/@owner/slug). The proxy will then redirect back
    // to the app return URL (exp://.../--/expo-auth-session).
    const redirectUri = useProxy && proxyRedirectUri ? proxyRedirectUri : AuthSession.makeRedirectUri();

    // Use ID token (implicit/hybrid) to avoid token exchange on-device.
    // Exchanging an auth code for tokens for a Web OAuth client requires a client_secret,
    // which must never be embedded in a mobile app.
    const nonce = Crypto.randomUUID();

    // Build + load an AuthRequest
    const request = await AuthSession.loadAsync(
      {
        clientId: clientId!,
        redirectUri,
        responseType: AuthSession.ResponseType.IdToken,
        scopes,
        prompt: AuthSession.Prompt.Consent,
        extraParams: {
          nonce,
        },
      },
      discovery
    );

    // Open the OAuth flow in browser
    let result: AuthSession.AuthSessionResult;
    if (useProxy && proxyRedirectUri && projectFullNameForProxy) {
      const authUrl = request.url ?? (await request.makeAuthUrlAsync(discovery));
      const returnUrl = AuthSession.getDefaultReturnUrl();

      const startUrl = `${proxyRedirectUri}/start?${new URLSearchParams({
        authUrl,
        returnUrl,
      }).toString()}`;

      const webResult = await WebBrowser.openAuthSessionAsync(startUrl, returnUrl, {
        showInRecents: true,
      });

      if (webResult.type !== 'success') {
        result = { type: webResult.type } as AuthSession.AuthSessionResult;
      } else {
        result = request.parseReturnUrl(webResult.url);
      }
    } else {
      // Fallback (no proxy). This may require allowlisting a dev redirect URL in Google.
      result = await request.promptAsync(discovery, {
        showInRecents: true,
      });
    }

    if (result.type !== 'success') {
      throw new Error(`OAuth authorization ${result.type}`);
    }

    const idToken =
      // Some response types populate authentication
      (result as any)?.authentication?.idToken ||
      // Google returns id_token in params
      (result as any)?.params?.id_token ||
      (result as any)?.params?.idToken;

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
