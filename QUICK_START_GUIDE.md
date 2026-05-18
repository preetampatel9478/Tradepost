# TradePost Google Sign-In & Unique Username Onboarding - Quick Start Guide

## What's Been Implemented

### Backend (Node.js/Express)
✅ **POST /api/auth/google** - Google OAuth token verification
✅ **GET /api/auth/check-username** - Username availability check with format validation
✅ **PUT /api/auth/complete-onboarding** - Complete onboarding with username & T&C acceptance

### Frontend (React Native)
✅ **Enhanced LoginScreen** - Google Sign-In button with fallback handling
✅ **OnboardingScreen** - Production-grade username selection with live validation
✅ **Secure Token Storage** - Encrypted token storage using expo-secure-store
✅ **Username Validator** - Client-side format validation matching backend rules

### Production Features
✅ Server-side Google token verification (never trusts client)
✅ Temporary tokens for unfinished users
✅ Production JWT + Refresh tokens after onboarding
✅ SEBI compliance T&C forced-scroll requirement
✅ Device & timestamp audit logging
✅ Username uniqueness enforcement with MongoDB indexes
✅ Comprehensive error handling & logging
✅ Rate limiting ready
✅ Production documentation

## Quick Setup

### 1. Backend Environment

```bash
cd backend
cp .env.example .env
```

Fill in `.env`:
```
GOOGLE_CLIENT_ID=<your-google-web-client-id-from-gcp>
JWT_SECRET=<generate-with-openssl-rand-base64-32>
JWT_REFRESH_SECRET=<generate-with-openssl-rand-base64-32>
MONGODB_URI=<your-mongodb-connection>
```

### 2. Mobile Environment

```bash
cd mobile-app
```

Create/update `.env`:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<same-as-backend-GOOGLE_CLIENT_ID>
EXPO_PUBLIC_API_URL=http://localhost:3000  # Development
# or https://api.tradepost.com for production
```

### 3. Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials:
   - **Web Application** → Copy Client ID for backend
   - **Android** → Copy OAuth 2.0 client ID for mobile (SHA1 fingerprint needed)
   - **iOS** → Copy OAuth 2.0 client ID for mobile

### 4. Build & Test Mobile

For native builds with Google Sign-In:

```bash
cd mobile-app

# Android Development
npx expo run:android

# iOS Development  
npx expo run:ios

# Production Build (EAS)
eas build --platform android
eas build --platform ios
```

## Testing the Complete Flow

### 1. Test New User Google Sign-In

```bash
# Start backend
cd backend && npm start

# In another terminal, start Expo
cd mobile-app && npm start
```

On mobile device/emulator:
1. Open app
2. Tap **"Sign in with Google"** on LoginScreen
3. Authorize with Google account
4. Should navigate to OnboardingScreen

### 2. Test Username Availability

In OnboardingScreen:
```
Type: "a" → Red ❌ (too short)
Type: "trader" → Red ❌ (too short, needs 3+ chars)
Type: "trader_john" → Green ✅ (available)
Type: "admin" → Red ❌ (reserved)
Scroll down → Checkbox enabled
Click submit → Onboarding completes
```

### 3. Verify Backend Endpoints

```bash
# Check username
curl "http://localhost:3000/api/auth/check-username?username=trader_john"

# Response: {"available":true,"username":"trader_john"}
```

## File Structure

### Backend Files Modified

```
backend/
├── src/
│   ├── models/
│   │   └── User.ts (✅ Updated with googleId, isOnboarded)
│   ├── routes/
│   │   └── auth.ts (✅ Complete rewrite with Google, username check, onboarding)
│   ├── utils/
│   │   └── usernameValidator.ts (✅ NEW - Production username validation)
│   └── app.ts (✅ Routes already mounted)
└── .env.example (✅ Updated with Google OAuth config)
```

### Frontend Files Modified

```
mobile-app/
├── src/
│   ├── screens/
│   │   ├── LoginScreen.tsx (✅ Added Google Sign-In)
│   │   ├── OnboardingScreen.tsx (✅ NEW - Complete rewrite)
│   │   └── RegisterScreen.tsx (✅ Added Google signup button)
│   ├── navigation/
│   │   └── RootNavigator.tsx (✅ Added Onboarding route)
│   └── utils/
│       ├── googleSignIn.ts (✅ NEW - Safe Google module wrapper)
│       └── secureTokenStorage.ts (✅ NEW - Encrypted token storage)
└── .env (✅ Create with Google Client ID)
```

## Production Security Checklist

- [ ] Google OAuth credentials configured in GCP
- [ ] JWT secrets generated using `openssl rand -base64 32`
- [ ] MongoDB indexes created for googleId, email, userId
- [ ] HTTPS enforced on backend API
- [ ] CORS configured for mobile app domain
- [ ] Rate limiting enabled on username-check endpoint
- [ ] Error logging configured (Sentry/DataDog)
- [ ] Database backups automated
- [ ] Tokens stored in expo-secure-store (not AsyncStorage)
- [ ] Environment variables set via CI/CD pipeline

## Monitoring & Debugging

### Check User Creation in MongoDB

```javascript
// Connect to MongoDB and run:
db.users.find({ 
  googleId: { $exists: true } 
}).pretty()

// Should see users with:
// - googleId: "1234567890..."
// - isOnboarded: false (before completing)
// - isOnboarded: true (after completing)
// - userId: "chosen_username" (after completing)
```

### View API Logs

```bash
# Backend logs
tail -f backend/logs/*.log

# Look for:
# - "Google user created"
# - "Google account linked"
# - "User onboarded successfully"
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "RNGoogleSignin could not be found" | Run `npx expo run:android` to rebuild native binary |
| "Username required" error | Verify query param is URL-encoded in URL |
| "Already onboarded" on re-attempt | This is correct behavior - re-onboarding prevented |
| Google sign-in button doesn't appear | Check `isGoogleSignInAvailable()` and fallback to regular login |
| Tokens not persisting after logout | Verify `clearAllTokens()` is called on logout |

## Next Steps

1. **Rate Limiting**: Implement on `/check-username` and `/complete-onboarding`
2. **Email Verification**: Send verification email after onboarding
3. **Phone Verification**: Add optional phone number + OTP verification
4. **Account Recovery**: Add forgot password + recovery email
5. **Social Linking**: Allow linking multiple OAuth providers
6. **Analytics**: Track onboarding funnel metrics
7. **A/B Testing**: Test different onboarding flows

## Support

For issues or questions:
1. Check [GOOGLE_SIGNIN_PRODUCTION_SETUP.md](./GOOGLE_SIGNIN_PRODUCTION_SETUP.md) for detailed setup
2. Review backend error logs
3. Check network requests in DevTools
4. Verify Google OAuth credentials are correct
