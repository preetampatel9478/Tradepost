// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
  },
  USERS: {
    PROFILE: '/users/profile',
    UPDATE_PROFILE: '/users/profile',
    SEARCH: '/users/search',
    FOLLOW: '/users/:id/follow',
    UNFOLLOW: '/users/:id/unfollow',
  },
  POSTS: {
    GET_FEED: '/posts/feed',
    CREATE: '/posts',
    GET: '/posts/:id',
    UPDATE: '/posts/:id',
    DELETE: '/posts/:id',
    LIKE: '/posts/:id/like',
    UNLIKE: '/posts/:id/unlike',
  },
  STOCKS: {
    SEARCH: '/stocks/search/:symbol',
    PREDICT: '/stocks/predict',
    WATCHLIST: '/stocks/watchlist',
  },
  NEWS: {
    INDIAN: '/news/indian',
    GLOBAL: '/news/global',
    TRENDING: '/news/trending',
  },
  CHAT: {
    LIST: '/chat/list',
    SEND: '/chat/send',
    HISTORY: '/chat/:userId',
  },
};

// Market Indices
export const MARKET_INDICES = {
  NIFTY_50: 'NIFTY50',
  NIFTY_SENSEX: 'SENSEX',
  NIFTY_BANK: 'NIFTYBANK',
  NIFTY_IT: 'NIFTYIT',
};

// Verification Tiers
export const VERIFICATION_REQUIREMENTS = {
  TIER_1: {
    name: 'Trader',
    predictions: 50,
    accuracy: 50,
    daysActive: 7,
  },
  TIER_2: {
    name: 'Verified Trader',
    predictions: 500,
    accuracy: 70,
    daysActive: 90,
  },
  TIER_3: {
    name: 'Expert Trader',
    predictions: 1000,
    accuracy: 80,
    daysActive: 180,
  },
};

// Prediction Expiry Times
export const PREDICTION_EXPIRY = {
  INTRADAY: 1440, // 24 hours in minutes
  WEEKLY: 10080, // 7 days
  MONTHLY: 43200, // 30 days
};
