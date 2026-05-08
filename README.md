# TradePost - Stock Market Social Trading Platform

A production-level stock market social trading platform where traders can share predictions, discuss market trends, and build their reputation with our verification system. The platform combines the best of social media, real-time trading insights, and fintech security.

## 📋 Overview

TradePost is a comprehensive platform that enables traders to:
- Post stock market predictions (bull/bear calls)
- Share market analysis and opinions
- Follow other traders and build communities
- Chat in real-time with other traders
- View verified blue-tick traders with proven accuracy
- Access real-time news from Indian and global markets
- Build reputation through accurate predictions

## 🏗️ Project Structure

```
Tradepost/
├── DESIGN_AND_ARCHITECTURE.md    # Complete design & architecture guide
├── mobile-app/                   # React Native frontend (Expo)
│   ├── src/
│   │   ├── screens/              # Application screens
│   │   ├── components/           # Reusable components
│   │   ├── navigation/           # Navigation setup
│   │   ├── redux/                # State management
│   │   ├── services/             # API & external services
│   │   ├── hooks/                # Custom React hooks
│   │   ├── utils/                # Utilities & constants
│   │   ├── styles/               # Theme & glass morphism
│   │   ├── types/                # TypeScript types
│   │   └── assets/               # Images, icons, fonts
│   ├── app.json                  # Expo configuration
│   ├── App.tsx                   # Entry point
│   ├── tsconfig.json             # TypeScript config
│   ├── babel.config.js           # Babel configuration
│   ├── package.json              # Dependencies
│   ├── .env.example              # Environment variables
│   └── README.md                 # Mobile app documentation
│
└── backend/                      # Node.js Express API
    ├── src/
    │   ├── config/               # Database, socket, firebase config
    │   ├── models/               # Mongoose schemas
    │   ├── routes/               # API route definitions
    │   ├── controllers/          # Route handlers
    │   ├── services/             # Business logic
    │   ├── middlewares/          # Express middlewares
    │   ├── utils/                # Helper functions & logger
    │   ├── jobs/                 # Background jobs (Bull)
    │   ├── websocket/            # Socket.io handlers
    │   ├── app.ts                # Express app
    │   └── server.ts             # Server entry point
    ├── tsconfig.json             # TypeScript config
    ├── package.json              # Dependencies
    ├── .env.example              # Environment variables
    ├── Dockerfile                # Docker container setup
    ├── docker-compose.yml        # Docker compose
    └── README.md                 # Backend API documentation
```

## 🎨 Design System

### UI/UX Framework: Glass Morphism + Modern Fintech

**Why Glass Morphism?**
- ✅ Modern, premium appearance (used by Apple, Figma)
- ✅ Perfect for displaying financial data overlays
- ✅ Professional feel trusted by financial traders
- ✅ Excellent dark mode support (perfect for night trading)
- ✅ Superior visual hierarchy for complex information

**Color Scheme (Dark Mode):**
- **Primary**: #00D084 (Bullish Green)
- **Secondary**: #00A3FF (Professional Blue)  
- **Accent**: #FFB319 (Gold for premium)
- **Background**: #0F0F1E (Deep Dark)
- **Surface**: #1A1A2E (Glass containers)
- **Text**: #FFFFFF (Primary), #A0A0A0 (Secondary)

**Key Components:**
- Stock cards with frosted glass effect
- Semi-transparent post containers
- Glass bottom navigation
- Smooth animations (300ms ease)
- Neumorphic accents for interaction feedback

## 🚀 Technology Stack

### Frontend (React Native with Expo)
- **Language**: TypeScript
- **UI Framework**: React Native + Expo
- **Navigation**: React Navigation
- **State Management**: Redux Toolkit + React Query
- **Real-time**: Socket.io Client
- **Styling**: Glass Morphism Design System
- **API**: Axios with interceptors
- **Storage**: AsyncStorage

### Backend (Node.js + Express)
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT + Bcrypt
- **Async Jobs**: Bull + Redis
- **Storage**: Firebase Storage
- **Email**: Nodemailer
- **Logging**: Winston
- **Security**: Helmet, CORS, Rate Limiting

### Infrastructure
- **Containerization**: Docker & Docker Compose
- **CI/CD**: GitHub Actions (optional)
- **Deployment**: Heroku, AWS, or DigitalOcean
- **Database Hosting**: MongoDB Atlas

## 📱 Key Features

### 1. Stock Predictions Feed
- Users post predictions: "NIFTY50 will cross 25000 by EOD"
- Mark direction (UP/DOWN/NEUTRAL)
- Add target price and timeframe
- Track prediction accuracy
- Earn verification points

### 2. Social Features
- Follow/Unfollow traders
- Like and comment on predictions
- Share posts to community
- Mention users with @username
- Hashtag trending topics

### 3. Market News Integration
- **Indian Markets**: NSE, BSE, SENSEX, NIFTY
- **Global Markets**: US Stocks, Crypto, Indices
- **Categories**: Economy, Earnings, IPO, Dividends
- **Real-time**: Push notifications for important news

### 4. Real-time Chat
- Direct messaging between traders
- Message history with pagination
- Typing indicators
- Read receipts
- Chat search functionality

### 5. Verification System (Blue Tick)
**Tier 1 - Trader**
- 50+ predictions
- 50% accuracy
- 7 days active

**Tier 2 - Verified Trader**
- 500+ predictions
- 70% accuracy
- 90 days active
- Document verification required

**Tier 3 - Expert**
- 1000+ predictions
- 80%+ accuracy
- 180 days active
- KYC verification

### 6. User Profiles
- Trading statistics dashboard
- Historical predictions
- Win/loss rate tracking
- Portfolio showcase
- Follower/Following counts
- Verification badge display

## ⚡ Performance Optimizations

- **Image Optimization**: Cloudinary CDN
- **Virtual Lists**: Large feed rendering
- **Code Splitting**: Route-based chunks
- **Caching**: Redis for frequent queries
- **Compression**: Gzip response compression
- **Lazy Loading**: Images and components

## 🔒 Security Implementation

- **JWT Tokens**: 24-hour expiry with refresh tokens
- **Password Security**: Bcrypt hashing (salt rounds: 10)
- **Rate Limiting**: 100 requests per 10 minutes
- **CORS**: Whitelist approved origins
- **HTTPS**: All production traffic encrypted
- **Input Validation**: Express Validator + Joi
- **SQL Injection Prevention**: Mongoose parameterization
- **Document Verification**: KYC with Firebase Storage

## 📊 Database Schema

### Core Collections
- **Users**: Authentication, profiles, verification status
- **Posts**: Predictions, analysis, content
- **Comments**: Comments on posts
- **Chats**: Messages between users
- **Stocks**: Cached market data
- **News**: Aggregated market news
- **Verifications**: KYC documents and status
- **Notifications**: User notifications

## 🚦 Getting Started

### Quick Start (Frontend)

```bash
cd mobile-app
npm install
cp .env.example .env
npm start
```

### Quick Start (Backend)

```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Full Setup with Docker

```bash
docker-compose up -d
# Runs backend + MongoDB + Redis for local development
```

### Production Docker Compose

- See `PRODUCTION.md` for deployment notes.

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d --build
```

## 📖 Detailed Documentation

- **[Design & Architecture Guide](DESIGN_AND_ARCHITECTURE.md)** - Complete design decisions and system architecture
- **[Frontend Setup](mobile-app/README.md)** - React Native/Expo setup and development
- **[Backend Setup](backend/README.md)** - Express API setup and documentation

## 🔄 Development Workflow

### 1. Feature Branch
```bash
git checkout -b feature/feature-name
```

### 2. Development
- Frontend: `npm start` in mobile-app folder
- Backend: `npm run dev` in backend folder

### 3. Testing
- Frontend: `npm test`
- Backend: `npm test`

### 4. Build & Deploy
```bash
# Frontend (Expo)
eas build --platform ios
eas build --platform android

# Backend
npm run build
docker build -t tradepost-api .
```

## 📚 API Documentation

Comprehensive API documentation available at `/api/docs` after starting the server (Swagger/OpenAPI).

### Example API Call
```bash
curl -X POST http://localhost:5000/api/posts \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "NIFTY50 will reach 25000 by EOD",
    "stockSymbol": "NIFTY50",
    "direction": "UP",
    "targetPrice": 25000
  }'
```

## 🧪 Testing Strategy

- **Unit Tests**: Jest for both frontend and backend
- **Integration Tests**: API endpoint testing
- **E2E Tests**: React Native testing library
- **Manual Testing**: QA checklist for features

## 📈 Monitoring & Analytics

- **Backend Logs**: Winston logger in `logs/` directory
- **Error Tracking**: Sentry integration (optional)
- **Analytics**: Google Analytics (frontend)
- **Performance**: New Relic or DataDog (optional)

## 🤝 Contributing

1. Follow the project structure conventions
2. Write tests for new features
3. Use TypeScript for type safety
4. Follow ESLint rules
5. Write meaningful commit messages
6. Submit PR with description

## 📄 License

MIT License - See LICENSE file for details

## 📞 Support & Community

- **Issues**: Report bugs on GitHub Issues
- **Discussions**: Start conversations in Discussions
- **Documentation**: See docs folder

## 🎯 Roadmap

### Phase 1 (Current)
- ✅ User authentication
- ✅ Social features (posts, comments)
- ✅ Chat system
- ✅ News feed

### Phase 2
- Mobile notification system
- Advanced analytics dashboard
- API for third-party integrations
- Social trading features

### Phase 3
- Machine learning predictions
- Trading bots integration
- Portfolio management
- Advanced charting tools

## ⚠️ Important Notes

1. **Environment Variables**: Always copy `.env.example` to `.env` and fill with actual values
2. **Database**: MongoDB must be running for backend
3. **Firebase**: Set up Firebase project and add credentials to `.env`
4. **API Keys**: Add all required API keys (stock data, email, etc.)
5. **Production**: Set `NODE_ENV=production` for production deployments

## 🔐 Security Checklist

- [ ] All API endpoints have rate limiting
- [ ] JWT secrets are strong and unique
- [ ] Database credentials are not in version control
- [ ] CORS is properly configured
- [ ] HTTPS is enabled in production
- [ ] Input validation on all endpoints
- [ ] Database queries are parameterized
- [ ] Error messages don't leak sensitive info
- [ ] Passwords are properly hashed
- [ ] Token expiry is set appropriately

---

**Made with ❤️ for traders by traders**

For questions or contributions, please create an issue or pull request on GitHub!
