# TradePost Google Sign-In - Quick Setup Checklist

## ✅ Already Implemented in Your App

- ✅ **Login Screen** (`mobile-app/src/screens/LoginScreen.tsx`)
  - Google Sign-In button ("Continue with Google")
  - Handles token verification and user authentication
  - Redirects to onboarding if needed

- ✅ **Register Screen** (`mobile-app/src/screens/RegisterScreen.tsx`)
  - Google Sign-Up button ("Continue with Google")
  - Auto-creates user account from Google profile data
  - Handles onboarding flow

- ✅ **Firebase Configuration** (`mobile-app/src/config/firebase.ts`)
  - Firebase initialization with AsyncStorage persistence
  - Ready for authentication

- ✅ **Google Sign-In Utility** (`mobile-app/src/utils/googleSignIn.ts`)
  - Google Sign-In SDK configuration
  - Environment variable handling

- ✅ **Backend Google Auth Endpoint** (`backend/src/routes/auth.ts`)
  - `/auth/google` POST endpoint
  - Server-side token verification
  - User creation and linking
  - JWT token generation

- ✅ **Social Auth Button Component** (`mobile-app/src/components/common/SocialAuthButton.tsx`)
  - Styled Google and Apple sign-in buttons
  - Loading states and disabled states

---

## 🔧 What You Need to Do

### Step 1: Create Firebase Project (5 minutes)
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create new project: **TradePost**
3. Go to **Authentication** → **Sign-in method**
4. Click **Enable** for **Google** provider
5. Copy Firebase credentials:
   - Project ID
   - API Key
   - Auth Domain
   - Storage Bucket
   - Messaging Sender ID
   - App ID

### Step 2: Create Google OAuth Credentials (10 minutes)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Go to **APIs & Services** → **OAuth consent screen**
4. Choose **External** user type
5. Fill app details:
   - App name: **TradePost**
   - User support email: your-email@example.com
   - Developer contact: your-email@example.com
6. Add scopes: `openid`, `email`, `profile`
7. Save and continue

### Step 3: Create Client IDs (10 minutes)

**Web/Expo Client ID:**
1. Go to **Credentials** → **Create Credentials** → **OAuth client ID** → **Web application**
2. Add URIs:
  - `https://auth.expo.io/@<expo-owner>/<expo-slug>` (Expo Go / AuthSession proxy)
    - For this repo’s default config: `https://auth.expo.io/@anonymous/tradepost`
3. Create and copy the **Client ID** (this is your `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`)

**Android Client ID (optional, for production builds):**
1. Go to **Credentials** → **Create Credentials** → **OAuth client ID** → **Android**
2. Get SHA-1 fingerprint:
   ```bash
   cd android
   ./gradlew signingReport  # or ./gradlew.bat signingReport on Windows
   ```
3. Copy SHA-1 and add to Google OAuth
4. Copy the **Android Client ID**

### Step 4: Update Mobile App Configuration (5 minutes)

**File: `mobile-app/.env`**
```bash
# Google OAuth
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id.apps.googleusercontent.com

# Firebase
EXPO_PUBLIC_FIREBASE_API_KEY=your_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

**File: `mobile-app/app.json`** (already updated)
```json
{
  "android": {
    "package": "com.traderpost.app",
    "googleServicesFile": "./android/app/google-services.json"
  },
  "plugins": [
    [
      "@react-native-google-signin/google-signin",
      {
        "androidClientId": "your_android_client_id.apps.googleusercontent.com",
        "iosUrlScheme": "com.googleusercontent.apps.your_ios_client_id"
      }
    ]
  ]
}
```

### Step 5: Update Backend Configuration (5 minutes)

**File: `backend/.env`** (already updated)
```bash
GOOGLE_CLIENT_ID=your_web_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_client_secret
```

### Step 6: Get Android `google-services.json` (5 minutes)

1. In Firebase Console, go to **Project Settings**
2. Select **Android** app or create one
3. Download `google-services.json`
4. Place at: `mobile-app/android/app/google-services.json`

---

## 🧪 Testing

### Test on Expo (Development)
```bash
cd mobile-app
npm install
npx expo start

# Scan QR code with Expo Go app
# Or run on Android/iOS simulator
```

1. Open app
2. Go to **Login** screen
3. Tap "Continue with Google"
4. Sign in with Google account
5. Verify you're logged in

### Test Register
1. Go to **Register** screen
2. Tap "Continue with Google"
3. Should either log in (existing email) or redirect to onboarding

### Test Backend
```bash
# In terminal, make a test request:
curl -X POST http://localhost:5000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"your_google_id_token"}'
```

---

## 📱 Build for Production

### Android
```bash
cd mobile-app
eas build --platform android
# Follow prompts to create iOS certificate

# Or local build:
cd android
./gradlew clean
./gradlew assembleDebug
```

### iOS
```bash
eas build --platform ios
# Requires Apple Developer account
```

---

## ⚠️ Common Issues & Solutions

### "Google Sign-In is not available"
**Solution:** 
- Make sure `@react-native-google-signin/google-signin` is installed
- Rebuild: `expo prebuild --clean`
- Check `app.json` plugin configuration

### "Invalid or missing Client ID"
**Solution:**
- Verify `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` in `.env`
- Make sure it matches Web Client ID from Google Cloud Console
- Reload Expo after changing `.env`

### "ID Token verification failed" (Backend error)
**Solution:**
- Verify backend has correct `GOOGLE_CLIENT_ID` in `.env`
- Check token hasn't expired
- Restart backend server

### "SHA-1 mismatch" (Android)
**Solution:**
- Run: `./gradlew signingReport`
- Add the SHA-1 to Android Client ID in Google Cloud Console
- Rebuild Android app

---

## 🔐 Security Checklist

- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` file to git (use `.env.example` only)
- [ ] Backend always verifies tokens server-side
- [ ] Use HTTPS in production
- [ ] Store JWT tokens securely (using `secureTokenStorage`)
- [ ] Implement rate limiting on auth endpoints
- [ ] Add CSRF protection if needed

---

## 📚 Related Files

| File | Purpose |
|------|---------|
| `mobile-app/src/screens/LoginScreen.tsx` | Login UI with Google button |
| `mobile-app/src/screens/RegisterScreen.tsx` | Registration UI with Google button |
| `mobile-app/src/config/firebase.ts` | Firebase initialization |
| `mobile-app/src/utils/googleSignIn.ts` | Google Sign-In setup |
| `mobile-app/src/components/common/SocialAuthButton.tsx` | Social button component |
| `backend/src/routes/auth.ts` | Backend auth endpoints |
| `mobile-app/app.json` | Expo configuration |
| `mobile-app/.env` | Environment variables (mobile) |
| `backend/.env` | Environment variables (backend) |

---

## 🚀 Next Steps

1. **Complete Firebase Setup** - Get credentials from Firebase Console
2. **Create Google OAuth Credentials** - Get Client IDs from Google Cloud
3. **Fill in `.env` Files** - Add all credentials
4. **Place `google-services.json`** - For Android build
5. **Test on Simulator/Device** - Verify Google Sign-In works
6. **Deploy to Production** - Use EAS Build or local build

---

**Questions?** Check the detailed guide in `GOOGLE_SIGNIN_SETUP.md`
