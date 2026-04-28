# TradePost Mobile App

A production-level stock market social trading platform built with React Native and Expo.

## 🎯 Features

- 📊 **Stock Predictions**: Users can post and track stock market predictions
- 🤝 **Social Features**: Follow users, like/comment on posts, friend system
- 📰 **News Feed**: Real-time market news from Indian and global markets
- 💬 **Real-time Chat**: Direct messaging between traders
- ✅ **Verification System**: Blue tick for verified traders based on accuracy
- 👤 **User Profiles**: Track trading stats, win rates, and historical predictions

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm 9+
- Expo CLI (`npm install -g expo-cli`)

### Installation

```bash
# Install dependencies
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android

# Run on Web
npm run web
```

### Environment Setup

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Update the environment variables with your configuration

## 📁 Project Structure

```
mobile-app/
├── src/
│   ├── screens/          # Screen components for each feature
│   ├── components/       # Reusable UI components
│   ├── navigation/       # React Navigation setup
│   ├── redux/            # State management
│   ├── services/         # API and external services
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utilities and helpers
│   ├── styles/           # Theme and styling
│   ├── types/            # TypeScript types
│   └── assets/           # Images, icons, fonts
├── app.json              # Expo configuration
├── App.tsx               # Entry point
└── package.json          # Dependencies
```

## 🛠️ Technology Stack

- **Frontend Framework**: React Native with Expo
- **Language**: TypeScript
- **State Management**: Redux Toolkit
- **Navigation**: React Navigation
- **Real-time Communication**: Socket.io
- **Styling**: Glass Morphism Design System
- **API Client**: Axios

## 🎨 Design System

### Glass Morphism UI
The app uses modern glass morphism design principles for a premium, professional look:
- Frosted glass containers with semi-transparent backgrounds
- Subtle borders with rgba white colors
- Smooth animations and transitions
- Dark theme optimized for financial data display

### Color Palette
- **Primary**: #00D084 (Bullish Green)
- **Secondary**: #00A3FF (Professional Blue)
- **Accent**: #FFB319 (Gold)
- **Background**: #0F0F1E (Deep Dark)
- **Text**: #FFFFFF, #A0A0A0

## 📊 Redux Store

The app uses Redux Toolkit with the following slices:
- `auth`: Authentication state
- `posts`: Feed posts and predictions
- `chat`: Chat messages
- `users`: User data
- `stocks`: Stock data and watchlist

## 🔗 API Integration

API calls are centralized in `src/services/api.ts` with:
- Automatic token attachment
- Request/response interceptors
- Error handling
- Timeout configuration

## 📱 Key Screens

- **Auth**: Login and registration
- **Home**: Feed of predictions and posts
- **Stocks**: Search and view stock details
- **News**: Market news feed
- **Chat**: Real-time messaging
- **Profile**: User profile and stats

## 🔒 Authentication

- JWT-based authentication
- Token stored in AsyncStorage
- Automatic token refresh on 401 responses
- Logout on token expiry

## 🚀 Building for Production

### EAS Build

```bash
# Login to Expo
eas login

# Configure EAS
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both platforms
eas build --platform all
```

### Manual Build

See platform-specific build instructions in the Expo documentation.

## 📝 Development Guidelines

### Code Organization
- One component per file
- Group related utilities by feature
- Use absolute imports via path aliases
- Keep components small and focused

### Naming Conventions
- Components: PascalCase (e.g., `UserCard.tsx`)
- Functions/hooks: camelCase (e.g., `useAuth`)
- Constants: UPPER_SNAKE_CASE (e.g., `API_URL`)
- Types: PascalCase with `I` prefix for interfaces (e.g., `IUser`)

### Performance
- Use memo for expensive components
- Implement virtual lists for long feeds
- Lazy load images
- Code split by route

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

## 📚 Documentation

- [React Native Docs](https://reactnative.dev/)
- [Expo Docs](https://docs.expo.dev/)
- [Redux Toolkit Docs](https://redux-toolkit.js.org/)
- [React Navigation Docs](https://reactnavigation.org/)

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Write tests
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

For issues and questions, please create an issue in the repository.
