# Google Sign-In Flow Architecture

## 1. Login Screen Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ LOGIN SCREEN                                                    │
│ "Continue with Google" Button Clicked                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GoogleSignin.hasPlayServices()                                  │
│ Check if Google Play Services available on device              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GoogleSignin.signIn()                                           │
│ - Opens Google Account Selection                               │
│ - User selects account to sign in with                         │
│ - Returns idToken                                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Firebase Authentication                                         │
│ GoogleAuthProvider.credential(idToken)                          │
│ signInWithCredential(auth, credential)                          │
│ - Authenticates with Firebase                                  │
│ - Creates Firebase user if needed                              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend: POST /auth/google                                      │
│ Body: { idToken }                                               │
│ - Backend verifies token with Google                           │
│ - Finds or creates user in MongoDB                             │
│ - Issues JWT token                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
                    ↓                   ↓
        ┌──────────────────┐  ┌──────────────────┐
        │ User Onboarded?  │  │ User Not         │
        │ (Has userId)     │  │ Onboarded        │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
        ┌────────▼─────────┐  ┌────────▼─────────┐
        │ Set JWT Token    │  │ Save Temp Token  │
        │ Store in Redux   │  │ Go to Onboarding │
        │ Save Auth Token  │  │ Screen           │
        │ Redirect to      │  │                  │
        │ Home Screen      │  │                  │
        └──────────────────┘  └──────────────────┘
```

## 2. Registration Screen Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ REGISTER SCREEN                                                 │
│ "Continue with Google" Button Clicked                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GoogleSignin.hasPlayServices()                                  │
│ Check if Google Play Services available on device              │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ GoogleSignin.signIn()                                           │
│ - Opens Google Account Selection                               │
│ - User selects account to create with                          │
│ - Returns idToken + user profile data                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Firebase Authentication                                         │
│ GoogleAuthProvider.credential(idToken)                          │
│ signInWithCredential(auth, credential)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Backend: POST /auth/google                                      │
│ Body: { idToken }                                               │
│ - Backend verifies token                                       │
│ - Email already exists?                                        │
│   YES → Link Google ID to existing user                        │
│   NO  → Create new user with Google data                       │
│ - Issues JWT token                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
                    ┌─────────┴─────────┐
                    │                   │
                    ↓                   ↓
        ┌──────────────────┐  ┌──────────────────┐
        │ Email Exists     │  │ New Account      │
        │ User Found       │  │ (First Time)     │
        └────────┬─────────┘  └────────┬─────────┘
                 │                     │
        ┌────────▼─────────┐  ┌────────▼─────────┐
        │ Log In Directly  │  │ User Not         │
        │ Go to Home       │  │ Onboarded        │
        │                  │  │ Save Temp Token  │
        │                  │  │ Go to Onboarding │
        │                  │  │ (Set username,   │
        │                  │  │  phone number)   │
        └──────────────────┘  └──────────────────┘
```

## 3. Component Communication

```
                    ┌──────────────────────────┐
                    │  Google Sign-In Library  │
                    │  @react-native-google-   │
                    │     signin/google-signin │
                    └──────────────┬───────────┘
                                   │
                    ┌──────────────▼───────────┐
                    │   Firebase Auth SDK      │
                    │   (firebase/auth)        │
                    └──────────────┬───────────┘
                                   │
        ┌──────────────────────────┴──────────────────────────┐
        │                                                     │
        ▼                                                     ▼
┌────────────────────────┐                     ┌──────────────────────┐
│  LoginScreen.tsx       │                     │  RegisterScreen.tsx  │
│                        │                     │                      │
│ handleGoogleSignIn()   │                     │ handleGoogleSignUp() │
│ - Initiate Google      │                     │ - Initiate Google    │
│ - Call API /auth/google                     │ - Call API /auth/google
│ - Store JWT token      │                     │ - Store JWT token    │
│ - Dispatch Redux       │                     │ - Dispatch Redux     │
│ - Navigate Home        │                     │ - Navigate Onboarding
└────────────────────────┘                     └──────────────────────┘
        │                                                     │
        └──────────────────┬─────────────────────────────────┘
                           │
                           ▼
                ┌────────────────────────┐
                │  API Service          │
                │  (api.post('/auth/    │
                │   google'))           │
                │                       │
                │  axios instance       │
                │  Sends to backend     │
                └────────┬──────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Backend: backend/src/routes/  │
        │  auth.ts - /google endpoint    │
        │                                │
        │  1. Verify token with Google   │
        │  2. Find/create user           │
        │  3. Generate JWT               │
        │  4. Return user + token        │
        └────────────────────────────────┘
```

## 4. Token Flow

```
Client (Mobile App)
│
├─ 1. User clicks "Continue with Google"
│
├─ 2. GoogleSignin.signIn() 
│     Returns: { idToken, name, email, picture }
│
├─ 3. Firebase.signInWithCredential(credential)
│     Authenticates with Firebase
│
├─ 4. POST /api/auth/google with idToken
│
│                    ↓ (Over HTTPS)
│
Server (Backend)
│
├─ 5. OAuth2Client.verifyIdToken(idToken)
│     Verifies signature with Google public keys
│     Returns: { sub, email, name, picture }
│
├─ 6. Find/Create User in MongoDB
│     Check: User.findOne({ $or: [{ googleId }, { email }] })
│
├─ 7. Generate JWT Token
│     jwt.sign({ id, email, isOnboarded }, secret)
│
├─ 8. Return to Client
│     { user, token, is_onboarded }
│
│                    ↓ (Over HTTPS)
│
Client (Mobile App)
│
├─ 9. Receive JWT Token
│
├─ 10. Store Token
│      await saveAuthToken(token) 
│      Using SecureStore (encrypted storage)
│
├─ 11. Update Redux State
│      dispatch(setToken(token))
│      dispatch(setUser(userData))
│
├─ 12. Navigate
│      if (is_onboarded) → Home
│      else → Onboarding
│
└─ 13. All Future Requests
       Include Authorization header
       Authorization: Bearer {token}
```

## 5. Data Schema - User Creation from Google

```javascript
// Google Token Payload (after verification)
{
  sub: "1234567890",           // Unique Google ID
  email: "user@gmail.com",
  email_verified: true,
  name: "John Doe",
  picture: "https://...",
  aud: "YOUR_GOOGLE_CLIENT_ID"
}

// MongoDB User Document Created/Updated
{
  _id: ObjectId(...),
  googleId: "1234567890",           // ← Linked
  email: "user@gmail.com",           // ← From Google
  name: "John Doe",                  // ← From Google
  profilePhoto: "https://...",       // ← From Google
  userId: "google_1234567_1625...",  // ← Auto-generated, can be updated during onboarding
  passwordHash: "...",               // ← Random hash (not used)
  isOnboarded: false,                // ← User must complete onboarding
  createdAt: "2025-05-21T...",
  updatedAt: "2025-05-21T..."
}

// JWT Token Issued
{
  header: { alg: "HS256", typ: "JWT" },
  payload: {
    id: "507f1f77bcf86cd799439011",  // MongoDB _id
    email: "user@gmail.com",
    isOnboarded: false,
    iat: 1625097600,
    exp: 1625184000
  },
  signature: "..."
}

// Token Stored on Client (Encrypted)
SecureStore {
  key: "authToken",
  value: "eyJhbGc..."  // ← Encrypted
}

// Redux Store
{
  auth: {
    token: "eyJhbGc...",
    user: {
      id: "507f1f77bcf86cd799439011",
      userId: "google_1234567_1625...",
      name: "John Doe",
      email: "user@gmail.com",
      avatar: "https://...",
      isVerified: false
    },
    isLoading: false,
    error: null
  }
}
```

## 6. Error Handling Flow

```
Exception Caught During Google Sign-In
│
├─ GoogleSignIn API Error
│  └─ "Play Services not available"
│     └─ Show: "Google Sign-In Not Available"
│
├─ Network Error
│  └─ Failed to connect to Google/Backend
│     └─ Show: "Network Error. Check internet connection."
│
├─ Token Verification Error (Backend)
│  └─ Invalid or expired idToken
│     └─ Show: "Invalid or expired Google token"
│
├─ Database Error
│  └─ MongoDB connection failed
│     └─ Show: "Sign-in failed. Please try again."
│
└─ JWT Generation Error
   └─ Secret key missing/invalid
      └─ Show: "Authentication failed"
```

## 7. Security Checks

```
┌─ Client Side
│  ├─ ✓ Verify Google Sign-In is available
│  ├─ ✓ Get idToken from Google
│  ├─ ✓ Send to backend over HTTPS only
│  └─ ✓ Store token in secure encrypted storage
│
├─ Backend Side
│  ├─ ✓ Verify idToken signature with Google public key
│  ├─ ✓ Check token hasn't expired
│  ├─ ✓ Validate audience (client ID) matches
│  ├─ ✓ Extract user info from verified payload
│  ├─ ✓ Check rate limiting
│  └─ ✓ Generate new JWT token locally
│
└─ Subsequent Requests
   ├─ ✓ Client sends JWT in Authorization header
   ├─ ✓ Backend verifies JWT signature
   ├─ ✓ Check JWT hasn't expired
   └─ ✓ Allow request or return 401 Unauthorized
```

---

## File References

- **Mobile**: `mobile-app/src/screens/LoginScreen.tsx` (lines 89-138)
- **Mobile**: `mobile-app/src/screens/RegisterScreen.tsx` (lines 55-100)
- **Backend**: `backend/src/routes/auth.ts` (lines 100-180)
- **Config**: `mobile-app/src/config/firebase.ts`
- **Util**: `mobile-app/src/utils/googleSignIn.ts`
