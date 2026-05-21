# Google Sign-In Setup Guide for TradePost

## Overview
Google Sign-In is already integrated in your Login and Register screens. Follow this guide to configure Firebase and Google credentials properly.

## Part 1: Firebase Configuration

### Step 1: Set Up Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing one named "TradePost"
3. Once created, navigate to **Authentication** section
4. Click **Get started** or **Sign-in method**
5. Enable **Google** as a sign-in method
6. Configure the OAuth consent screen (see Part 2)

### Step 2: Get Firebase Configuration
1. In Firebase Console, go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Select your iOS and Android apps (or create them)
4. Copy the configuration for each platform

**For Android:**
- Go to **Project Settings** → **Your apps** → Select Android app
- Download or copy `google-services.json`
- Place it in: `mobile-app/android/app/google-services.json`

**For Web/Expo:**
- Copy these values:
  - Project ID
  - API Key
  - Messaging Sender ID
  - App ID

---

## Part 2: Google Cloud Console Setup

### Step 1: Create OAuth 2.0 Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Navigate to **APIs & Services** → **Credentials**
4. Click **Create Credentials** → **OAuth client ID**

### Step 2: Configure OAuth Consent Screen
1. Click **OAuth consent screen** tab (left sidebar)
2. Choose **External** as User Type
3. Fill in the Application details:
   - **App name:** TradePost
   - **User support email:** your-email@example.com
   - **Developer contact:** your-email@example.com
4. Add scopes:
   - `openid`
   - `email`
   - `profile`
5. Add test users (initially for development)
6. Save and continue

### Step 3: Create OAuth Client IDs

**For Android:**
1. Create credentials → **OAuth client ID** → **Android**
2. Fill in:
   - **Package name:** `com.example.tradepost` (or your actual package name)
   - **SHA-1 certificate fingerprint:** (see Step 4 below)
3. Click Create
4. Copy the Client ID

**For Web (React Native Expo):**
1. Create credentials → **OAuth client ID** → **Web application**
2. Add authorized redirect URIs:
   - `http://localhost:8081`
   - `http://localhost:19000` (Expo)
   - Your production domain (e.g., `https://app.tradepost.com`)
3. Click Create
4. Copy the **Web Client ID** (this is your `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)

### Step 4: Get SHA-1 Certificate Fingerprint (Android)

Run this command in your backend or development machine:

```bash
# For development keystore (debug):
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android

# Look for the SHA1 fingerprint in the output
```

Or use Android Studio:
1. Open Android project in Android Studio
2. Go to **Gradle** panel (right sidebar)
3. Run: `android → signingReport`
4. Copy the SHA1 from debug variant

---

## Part 3: Environment Variables Setup

### Create `.env` file in `mobile-app` directory

```bash
# Google Sign-In
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID_HERE

# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=tradepost.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_FIREBASE_PROJECT_ID
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_FIREBASE_MESSAGING_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
```

### Update `app.json` (Expo config)

Add this to your `app.json` under the `expo` object:

```json
{
  "plugins": [
    [
      "@react-native-google-signin/google-signin",
      {
        "androidClientId": "YOUR_ANDROID_GOOGLE_CLIENT_ID.apps.googleusercontent.com"
      }
    ]
  ]
}
```

---

## Part 4: Backend Setup (Node.js)

### 1. Verify Google Auth Endpoint

Ensure your backend has the `/auth/google` endpoint. Check `backend/src/routes/auth.ts`:

```typescript
import { Router } from 'express';
import { googleAuth } from '../controllers/authController';

const router = Router();

router.post('/google', googleAuth);

export default router;
```

### 2. Implement Google Auth Controller

In `backend/src/controllers/authController.ts`:

```typescript
import { OAuth2Client } from 'google-auth-library';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleAuth = async (req: any, res: any) => {
  try {
    const { idToken } = req.body;

    // Verify the ID token
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { email, name, picture, sub } = payload;

    // Find or create user
    let user = await User.findOne({ email });
    
    if (!user) {
      const userId = name?.replace(/\s+/g, '_').toLowerCase() || email.split('@')[0];
      user = await User.create({
        email,
        name: name || email,
        userId: userId,
        avatar: picture,
        isVerified: true, // Google users are pre-verified
      });
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET || 'your-secret',
      { expiresIn: '30d' }
    );

    res.json({
      user,
      token,
      is_onboarded: user.mobileNumber ? true : false,
    });
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
};
```

### 3. Add Environment Variables (Backend .env)

```bash
GOOGLE_CLIENT_ID=YOUR_GOOGLE_WEB_CLIENT_ID.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```

### 4. Install Required Package

```bash
npm install google-auth-library
# or
yarn add google-auth-library
```

---

## Part 5: Current Implementation Review

Your app already has:

✅ **LoginScreen.tsx** - Google Sign-In button with handler  
✅ **RegisterScreen.tsx** - Google Sign-Up button with handler  
✅ **SocialAuthButton.tsx** - Styled social auth button component  
✅ **Firebase config** - `mobile-app/src/config/firebase.ts`  
✅ **Google Sign-In util** - `mobile-app/src/utils/googleSignIn.ts`  

The implementation:
1. Gets Google ID token from Google Sign-In SDK
2. Authenticates with Firebase using the ID token
3. Sends ID token to backend `/auth/google` endpoint
4. Backend verifies token and creates/updates user
5. User is logged in and redirected

---

## Part 6: Testing Checklist

- [ ] Firebase project created and configured
- [ ] Google OAuth app created in Google Cloud Console
- [ ] OAuth consent screen configured
- [ ] Client IDs created (Android and Web)
- [ ] Environment variables set in `.env`
- [ ] Backend `/auth/google` endpoint implemented
- [ ] Backend environment variables configured
- [ ] `google-services.json` placed in Android app
- [ ] `app.json` updated with Android Client ID
- [ ] Run `eas build` or build local APK/IPA
- [ ] Test "Continue with Google" on both login and signup screens

---

## Part 7: Troubleshooting

### "Google Sign-In is not available"
- Ensure `@react-native-google-signin/google-signin` is installed
- Check that `app.json` has the plugin configured
- Rebuild the app: `expo prebuild --clean`

### "Invalid or missing Client ID"
- Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`
- Check that Web Client ID matches in Google Cloud Console
- Reload Expo app after `.env` changes

### "ID Token verification failed"
- Verify backend has correct `GOOGLE_CLIENT_ID` from Google Cloud
- Check that token hasn't expired (tokens are valid for ~1 hour)
- Ensure backend has `google-auth-library` installed

### Android SHA-1 Mismatch
- Run `./gradlew signingReport` in Android folder
- Add the correct SHA-1 fingerprint to Google Cloud Console
- Rebuild Android app: `eas build --platform android`

---

## Production Deployment

### Security Best Practices:

1. **Use Environment Variables:**
   - Never hardcode API keys in code
   - Use `.env` files and secrets management

2. **Backend Token Verification:**
   - Always verify Google ID tokens on backend
   - Never trust client-side token validation

3. **HTTPS Only:**
   - Deploy with SSL/TLS certificates
   - Redirect URIs must use HTTPS in production

4. **Rate Limiting:**
   - Implement rate limiting on `/auth/google` endpoint
   - Protect against brute force attacks

5. **User Data:**
   - Store minimal user data required
   - Comply with GDPR/privacy regulations
   - Encrypt sensitive information

---

## Quick Summary: What User Needs to Do

1. **Firebase Console:**
   - Create Firebase project
   - Enable Google sign-in method
   - Get Firebase config values

2. **Google Cloud Console:**
   - Create OAuth 2.0 credentials
   - Configure OAuth consent screen
   - Get Web Client ID and Android Client ID

3. **Mobile App:**
   - Update `.env` with credentials
   - Update `app.json` with Android Client ID
   - Place `google-services.json` in Android folder

4. **Backend:**
   - Implement `/auth/google` endpoint
   - Install `google-auth-library`
   - Add `GOOGLE_CLIENT_ID` to `.env`

5. **Test:**
   - Build and run app
   - Test "Continue with Google" button
   - Verify user is created/logged in

---

## Related Files to Review

- `mobile-app/src/config/firebase.ts` - Firebase initialization
- `mobile-app/src/utils/googleSignIn.ts` - Google Sign-In setup
- `mobile-app/src/screens/LoginScreen.tsx` - Login implementation
- `mobile-app/src/screens/RegisterScreen.tsx` - Register implementation
- `backend/src/routes/auth.ts` - Backend auth routes
- `backend/package.json` - Backend dependencies
