# TradePost Production Setup Guide - Google Sign-In & Unique Username Onboarding

## Overview
This document covers the production-ready implementation of Google Sign-In with mandatory two-step unique username onboarding flow for the TradePost application.

## Architecture Flow

### Step 1: Google Sign-In (LoginScreen)
```
User clicks "Sign in with Google" 
    ↓
@react-native-google-signin/google-signin handles OAuth flow
    ↓
User authorizes TradePost app in Google consent screen
    ↓
Google returns idToken to app
    ↓
App sends idToken to backend POST /api/auth/google
```

### Step 2: Backend Verification & User Creation
```
Backend receives idToken
    ↓
OAuth2Client.verifyIdToken() validates token cryptographically
    ↓
If new user: Create User with isOnboarded: false, temporary userId
If existing user: Link googleId to account
    ↓
Issue temporary JWT token (valid for 7 days)
    ↓
Return { user, token, is_onboarded: false }
```

### Step 3: Onboarding Screen Navigation
```
Frontend checks is_onboarded flag
    ↓
If false: Navigate to OnboardingScreen with tempToken
If true: Show main feed (already onboarded)
```

### Step 4: Username Selection & Availability Check
```
User types username in OnboardingScreen
    ↓
Client-side validation (format, length, reserved words)
    ↓
Debounced call to GET /api/auth/check-username?username=xyz
    ↓
Backend checks MongoDB for existing userId (case-insensitive)
    ↓
Returns { available: true/false, error?: string }
    ↓
UI shows ✅ (green) or ❌ (red) indicator instantly
```

### Step 5: T&C Acceptance & Onboarding Completion
```
User scrolls through SEBI compliance T&C modal
    ↓
"Accept" checkbox enabled only after scrolling to bottom
    ↓
User clicks "Submit & Accept Terms"
    ↓
Frontend calls PUT /api/auth/complete-onboarding with:
   {
     username: "chosen_username",
     tc_accepted: true,
     tc_device: "android" | "ios"
   }
    ↓
Backend validates (temp token must be valid)
    ↓
Backend updates User: isOnboarded=true, userId=chosen_username
    ↓
Logs timestamp + device for SEBI compliance audit trail
    ↓
Issues production JWT token + refresh token
    ↓
Frontend saves tokens to secure storage
    ↓
User can now access main app features
```

## Backend Setup

### 1. Database Indexes
Ensure these MongoDB indexes exist for production performance:

```javascript
// On User collection:
db.users.createIndex({ googleId: 1 }, { unique: true, sparse: true })
db.users.createIndex({ email: 1 }, { unique: true, sparse: true })
db.users.createIndex({ userId: 1 }, { unique: true })
db.users.createIndex({ createdAt: 1 })
```

### 2. Environment Variables

Copy `.env.example` to `.env` and fill in:

```bash
# Google OAuth
GOOGLE_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com

# JWT Secrets (generate using: openssl rand -base64 32)
JWT_SECRET=<generate-strong-random>
JWT_REFRESH_SECRET=<generate-strong-random>

# MongoDB
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tradepost

# API Config
PORT=3000
NODE_ENV=production
API_URL=https://api.tradepost.com
CLIENT_URL=https://tradepost.app
```

### 3. API Endpoints

#### POST /api/auth/google
**Request:**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9..."
}
```

**Response (New User):**
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "google_abc123def456_16842...",
    "name": "John Trader",
    "email": "john@gmail.com",
    "avatar": "https://lh3.googleusercontent.com/...",
    "isOnboarded": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "is_onboarded": false
}
```

#### GET /api/auth/check-username?username=trader_john
**Response:**
```json
{
  "available": true,
  "username": "trader_john"
}
```

Or if unavailable:
```json
{
  "available": false,
  "error": "Username is already taken"
}
```

#### PUT /api/auth/complete-onboarding
**Headers:** `Authorization: Bearer <tempToken>`

**Request:**
```json
{
  "username": "trader_john",
  "tc_accepted": true,
  "tc_device": "android"
}
```

**Response:**
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "trader_john",
    "name": "John Trader",
    "email": "john@gmail.com",
    "avatar": "...",
    "isOnboarded": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Mobile Setup

### 1. Google Sign-In Configuration

Update `mobile-app/.env`:
```
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-google-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_API_URL=https://api.tradepost.com
```

### 2. Android Configuration

In `mobile-app/android/app/build.gradle`, ensure you have:
```gradle
implementation 'com.google.android.gms:play-services-auth:21.0.0'
```

### 3. Build & Deploy

```bash
cd mobile-app

# For development
npx expo run:android
npx expo run:ios

# For production (EAS Build)
eas build --platform android --auto-submit
eas build --platform ios --auto-submit
```

## Security Checklist

- ✅ **Server-side token validation**: Google tokens verified using OAuth2Client
- ✅ **Never trust client data**: Profile data from Google only used after server verification
- ✅ **Temporary tokens**: Issued for unfinished users, revoked after onboarding
- ✅ **Username uniqueness**: Enforced via MongoDB unique index
- ✅ **SEBI compliance**: T&C acceptance + device + timestamp logged
- ✅ **Rate limiting**: Implement on username check and onboarding endpoints
- ✅ **HTTPS only**: All API calls use HTTPS in production
- ✅ **Secure storage**: Tokens stored in react-native-keychain (not AsyncStorage)

## Testing

### Manual Testing Flow

1. **New User Google Sign-In**
   ```
   - Open LoginScreen
   - Tap "Sign in with Google"
   - Authorize with test Google account
   - Verify navigated to OnboardingScreen
   ```

2. **Username Availability Check**
   ```
   - Type "trader"
   - Verify red ❌ (too short)
   - Type "trader_john"
   - Verify green ✅ (available)
   - Type existing username
   - Verify red ❌ (taken)
   ```

3. **Complete Onboarding**
   ```
   - Scroll T&C to bottom
   - Check acceptance checkbox
   - Tap "Submit & Accept Terms"
   - Verify navigated to main feed
   - Verify token saved to AsyncStorage
   ```

### Backend Testing

```bash
# Test Google token verification (use real idToken from device)
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{"idToken":"eyJhbGciOiJSUzI1NiI..."}'

# Test username availability
curl "http://localhost:3000/api/auth/check-username?username=trader_john"

# Test complete onboarding
curl -X PUT http://localhost:3000/api/auth/complete-onboarding \
  -H "Authorization: Bearer <tempToken>" \
  -H "Content-Type: application/json" \
  -d '{
    "username":"trader_john",
    "tc_accepted":true,
    "tc_device":"android"
  }'
```

## Deployment Checklist

- [ ] Google Cloud OAuth credentials configured
- [ ] MongoDB indexes created
- [ ] Environment variables set in production
- [ ] JWT secrets generated and stored securely
- [ ] HTTPS enabled on backend
- [ ] Error logging configured (Sentry, DataDog, etc)
- [ ] Rate limiting middleware enabled
- [ ] CORS configured for mobile app domain
- [ ] Database backups automated
- [ ] SSL certificates up to date
- [ ] WAF rules configured
- [ ] Load balancing configured

## Monitoring & Logging

### Key Metrics to Track

1. **Google Sign-In Success Rate**
   - Failed token verifications
   - Invalid/expired tokens

2. **Onboarding Completion Rate**
   - Users who started onboarding
   - Users who completed onboarding
   - Username conflicts

3. **Performance**
   - Username check response time
   - Complete-onboarding latency

### Recommended Tools

- **Logging**: Winston, Pino
- **Monitoring**: Sentry, DataDog
- **APM**: New Relic, Prometheus
- **Database**: MongoDB Atlas built-in monitoring

## Support & Troubleshooting

### Common Issues

1. **"RNGoogleSignin could not be found" error**
   - Solution: Run `npx expo run:android` to rebuild native binary

2. **Username check returns "Username required" error**
   - Solution: Verify query parameter is properly URL-encoded

3. **"Already onboarded" error on retry**
   - Solution: This is intentional; prevent users from re-onboarding

4. **Token expired before completing onboarding**
   - Solution: Issue longer-lived temporary tokens (24-48 hours)
