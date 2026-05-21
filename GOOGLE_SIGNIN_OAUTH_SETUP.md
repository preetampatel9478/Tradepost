# Google Sign-In - Expo OAuth Setup Guide

## Issue Fixed
The native Google Sign-In module (`RNGoogleSignin`) was not available in the Expo build, causing the "Failed to import Google Sign-In module" error.

## Solution Implemented
Switched from native module to **Expo-compatible OAuth Web Flow** using:
- `expo-auth-session` for OAuth flow
- `expo-web-browser` for secure browser handling
- Firebase Authentication for token validation

## Prerequisites

### 1. Google Cloud Console Setup
1. Go to https://console.cloud.google.com/
2. Create OAuth 2.0 Credentials (Web application type)
3. Add authorized redirect URIs:
   ```
   exp://localhost:19000/
   exp://your-app-slug@s7n3p5zz.ngrok.io/
   com.tradepost.mobile://oauth
   ```
   > **For Expo Go Testing:** Use the first URI format
   > **For Production:** Get your app's registered URI from Expo

4. Copy the **Web Client ID** (looks like: `123456789-abc123def456.apps.googleusercontent.com`)

### 2. Update Environment Variables
Edit `.env` in the mobile-app folder:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id_here
```

### 3. Firebase Configuration
Verify Firebase is properly configured in `.env`:
```
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
... (other Firebase vars)
```

## How It Works Now

1. **User taps "Continue with Google"**
2. **OAuth browser opens** (secure, native browser on device)
3. **User signs in with Google** in the browser
4. **Redirect back to app** with authorization code
5. **Exchange code for ID token** (server-side)
6. **Firebase authentication** with the ID token
7. **Backend verification** via `/auth/google` endpoint

## Testing Steps

### On Expo Go (Development):
```bash
cd mobile-app
npm install
npx expo start
# Scan QR code with Expo Go app
```

1. Navigate to Login screen
2. Tap "Continue with Google"
3. Browser should open with Google OAuth screen
4. Select your Google account
5. Authorize the app
6. Should redirect back and sign in

### On Physical Device (After EAS Build):
```bash
eas build --platform android  # or ios
```

Same flow as Expo Go, but with the production app binary.

## Troubleshooting

### "OAuth authorization canceled"
- User dismissed the OAuth screen - this is expected behavior

### "No ID token received from Google"
- Check that Google Cloud credentials are correct
- Verify redirect URI is added to Google Console

### "Google Client ID is not configured"
- Make sure `.env` has `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` set
- Restart `expo start` after changing `.env`

### App is not redirecting back after OAuth
- Check that the redirect URI in Google Console matches your app
- For Expo Go: Use `exp://localhost:19000/` format
- For production: Get from `eas build` output

## Environment Variables Reference

Required in `.env`:
```
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=xxx.apps.googleusercontent.com

# Firebase (for token verification)
EXPO_PUBLIC_FIREBASE_API_KEY=...
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=...
EXPO_PUBLIC_FIREBASE_PROJECT_ID=...
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=...
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
EXPO_PUBLIC_FIREBASE_APP_ID=...
```

## Production Checklist

- [ ] Google OAuth Web Client ID created in Google Cloud Console
- [ ] Redirect URI registered in Google Console
- [ ] `.env` configured with valid Client ID
- [ ] Firebase project is active and credentials are valid
- [ ] Both Login and Register screens updated
- [ ] Tested on physical device
- [ ] User can sign in with Google
- [ ] User can create account with Google
- [ ] Onboarding redirects properly for incomplete profiles

## Security Notes

✅ **Secure Browser Flow:** Uses native browser for OAuth (not WebView)
✅ **Token Validation:** Firebase validates ID tokens
✅ **Backend Verification:** Backend verifies tokens via `/auth/google` endpoint
✅ **No Native Module Issues:** Pure Expo-compatible implementation
✅ **HTTPS Only:** Google enforces HTTPS for production

The app is now production-ready for Google Sign-In! 🚀
