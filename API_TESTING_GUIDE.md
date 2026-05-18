# API Testing Guide - Google Sign-In & Onboarding Endpoints

## Prerequisites

- Backend running on `http://localhost:3000`
- Valid Google idToken (from actual Google Sign-In or test token)
- MongoDB populated with test data

## Base URL

```
http://localhost:3000/api/auth
```

## Endpoints

### 1. POST /api/auth/google
**Verify Google Token & Create/Update User**

#### Request
```bash
curl -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d '{
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6IjEyMyJ9..."
  }'
```

#### Response (New User)
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "google_abc123def456_1684567890123",
    "name": "John Trader",
    "email": "john@gmail.com",
    "avatar": "https://lh3.googleusercontent.com/...",
    "isOnboarded": false
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "is_onboarded": false
}
```

#### Response (Existing User, Already Onboarded)
```json
{
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "trader_john",
    "name": "John Trader",
    "email": "john@gmail.com",
    "avatar": "https://...",
    "isOnboarded": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "is_onboarded": true
}
```

#### Error Responses
```json
// Missing idToken
{
  "message": "idToken is required"
}

// Invalid/expired token
{
  "message": "Invalid or expired Google token"
}

// Token verification failed
{
  "message": "Google authentication failed"
}
```

---

### 2. GET /api/auth/check-username
**Check Username Availability & Validation**

#### Request - Available Username
```bash
curl "http://localhost:3000/api/auth/check-username?username=trader_john"
```

#### Response - Available
```json
{
  "available": true,
  "username": "trader_john"
}
```

#### Request - Taken Username
```bash
curl "http://localhost:3000/api/auth/check-username?username=admin"
```

#### Response - Taken
```json
{
  "available": false,
  "error": "This username is reserved and unavailable"
}
```

#### Request - Invalid Format
```bash
curl "http://localhost:3000/api/auth/check-username?username=ab"
```

#### Response - Invalid Format
```json
{
  "available": false,
  "error": "Username must be at least 3 characters"
}
```

#### Other Validation Errors
```bash
# Too long
curl "http://localhost:3000/api/auth/check-username?username=verylongusernamethatexceedsmaximum"
# Response: {"available": false, "error": "Username must not exceed 20 characters"}

# Invalid characters
curl "http://localhost:3000/api/auth/check-username?username=trader%20john"
# Response: {"available": false, "error": "Username can only contain lowercase letters, numbers, dots, and underscores"}

# Starts with dot
curl "http://localhost:3000/api/auth/check-username?username=.trader_john"
# Response: {"available": false, "error": "Username cannot start or end with dots or underscores"}

# Consecutive dots
curl "http://localhost:3000/api/auth/check-username?username=trader..john"
# Response: {"available": false, "error": "Username cannot contain consecutive dots or underscores"}
```

---

### 3. PUT /api/auth/complete-onboarding
**Complete User Onboarding with Username & T&C Acceptance**

#### Prerequisites
- User must have valid JWT token from Google sign-in
- `isOnboarded` must be `false` in database
- Username must be available (check with endpoint #2 first)

#### Request
```bash
curl -X PUT http://localhost:3000/api/auth/complete-onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "username": "trader_john",
    "tc_accepted": true,
    "tc_device": "android"
  }'
```

#### Response - Success
```json
{
  "success": true,
  "user": {
    "id": "507f1f77bcf86cd799439011",
    "userId": "trader_john",
    "name": "John Trader",
    "email": "john@gmail.com",
    "avatar": "https://...",
    "isOnboarded": true
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

#### Error Response - Missing Fields
```bash
curl -X PUT http://localhost:3000/api/auth/complete-onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "username": "trader_john",
    "tc_accepted": false
  }'
# Response: {"message": "Terms and Conditions must be accepted"}
```

#### Error Response - Invalid Username
```bash
curl -X PUT http://localhost:3000/api/auth/complete-onboarding \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "ab",
    "tc_accepted": true,
    "tc_device": "android"
  }'
# Response: {"success": false, "error": "Username must be at least 3 characters"}
```

#### Error Response - Username Taken
```json
{
  "success": false,
  "error": "Username is already taken"
}
```

#### Error Response - Already Onboarded
```json
{
  "message": "User has already completed onboarding"
}
```

#### Error Response - No Authorization
```json
{
  "message": "Unauthorized"
}
```

#### Error Response - Expired Token
```json
{
  "message": "Invalid or expired token"
}
```

---

## Test Scenarios

### Scenario 1: Complete New User Flow

```bash
# 1. Get Google idToken (from real Google Sign-In or test token)
GOOGLE_ID_TOKEN="<your-google-id-token>"

# 2. Call Google auth endpoint
RESPONSE=$(curl -s -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d "{\"idToken\": \"$GOOGLE_ID_TOKEN\"}")

echo "Google Auth Response:"
echo $RESPONSE | jq '.'

# 3. Extract tokens and userId
TOKEN=$(echo $RESPONSE | jq -r '.token')
IS_ONBOARDED=$(echo $RESPONSE | jq -r '.is_onboarded')
USER_ID=$(echo $RESPONSE | jq -r '.user.id')

echo "Token: $TOKEN"
echo "Is Onboarded: $IS_ONBOARDED"

# 4. Check desired username
curl -s "http://localhost:3000/api/auth/check-username?username=trader_john" | jq '.'

# 5. Complete onboarding
curl -s -X PUT http://localhost:3000/api/auth/complete-onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "trader_john",
    "tc_accepted": true,
    "tc_device": "android"
  }' | jq '.'
```

### Scenario 2: Return User (Already Onboarded)

```bash
# Google Sign-In returns existing user with isOnboarded: true
curl -s -X POST http://localhost:3000/api/auth/google \
  -H "Content-Type: application/json" \
  -d "{\"idToken\": \"$GOOGLE_ID_TOKEN\"}" | jq '.is_onboarded'

# Output: true
# → User can directly access main app features
```

### Scenario 3: Username Already Taken

```bash
# Check username that's already taken
curl -s "http://localhost:3000/api/auth/check-username?username=existing_user" | jq '.'
# Response: {"available": false, "error": "Username is already taken"}

# Try to onboard with that username anyway
curl -s -X PUT http://localhost:3000/api/auth/complete-onboarding \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "username": "existing_user",
    "tc_accepted": true,
    "tc_device": "android"
  }' | jq '.'
# Response: {"success": false, "error": "Username is already taken"}
```

---

## Load Testing

### Test Username Availability Endpoint (High Load)

```bash
# Using Apache Bench
ab -n 1000 -c 10 \
  "http://localhost:3000/api/auth/check-username?username=test_user"

# Using wrk
wrk -t4 -c100 -d30s \
  "http://localhost:3000/api/auth/check-username?username=test_user"
```

### Monitor Performance

```bash
# Watch response times
curl -w "@curl-format.txt" -o /dev/null -s \
  "http://localhost:3000/api/auth/check-username?username=test_user"
```

---

## Database Verification

### Check User Created After Google Sign-In

```javascript
// MongoDB
db.users.find({ 
  googleId: { $exists: true },
  isOnboarded: false 
}).pretty()

// Output:
// {
//   "_id": ObjectId("507f1f77bcf86cd799439011"),
//   "googleId": "1234567890123456789",
//   "email": "john@gmail.com",
//   "name": "John Trader",
//   "userId": "google_123456789_1684567890",
//   "isOnboarded": false,
//   "createdAt": ISODate("2024-05-19T12:34:56.000Z")
// }
```

### Check User After Onboarding Completion

```javascript
db.users.find({ 
  userId: "trader_john",
  isOnboarded: true
}).pretty()

// Output:
// {
//   "_id": ObjectId("507f1f77bcf86cd799439011"),
//   "googleId": "1234567890123456789",
//   "email": "john@gmail.com",
//   "name": "John Trader",
//   "userId": "trader_john",
//   "isOnboarded": true,
//   "tc_accepted": true,
//   "tc_timestamp": ISODate("2024-05-19T12:35:00.000Z"),
//   "tc_device": "android",
//   "updatedAt": ISODate("2024-05-19T12:35:00.000Z")
// }
```

---

## Debugging Tips

### Enable Verbose Logging

```bash
# Backend
DEBUG=* npm start

# View detailed logs
tail -f backend/logs/app.log
```

### Use Postman Collection

Import this collection template in Postman:

```json
{
  "info": {
    "name": "TradePost Google Onboarding",
    "description": "Test Google Sign-In endpoints"
  },
  "item": [
    {
      "name": "Google Sign-In",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/api/auth/google",
        "body": {
          "raw": "{\"idToken\": \"{{google_id_token}}\"}"
        }
      }
    }
  ]
}
```

### Monitor Network Requests (Frontend)

```javascript
// In React Native DevTools console
console.log(api.defaults.headers); // Check Authorization header
```

---

## Common Issues

| Error | Cause | Solution |
|-------|-------|----------|
| `idToken is required` | No token sent | Verify token is generated by Google Sign-In |
| `Invalid or expired Google token` | Token expired or invalid | Get fresh token from Google |
| `Username is required` | Query param missing | Include `?username=` in URL |
| `Unauthorized` | Missing or invalid JWT | Check Authorization header format |
| `User has already completed onboarding` | Calling PUT twice | This is correct behavior |
