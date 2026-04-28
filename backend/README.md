# TradePost Backend API

Production-level REST API for the TradePost stock market social trading platform.

## 🎯 Features

- User authentication and authorization (JWT)
- Stock predictions and CRUD operations
- Social features (follow, like, comment)
- Real-time chat with Socket.io
- User verification and KYC system
- Market news aggregation
- Rate limiting and security

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- MongoDB 5.0+
- Redis (optional, for caching)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Update .env with your configuration
```

### Running the Server

```bash
# Development with hot reload
npm run dev

# Build TypeScript
npm run build

# Production
npm start

# Run tests
npm test
```

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration files
│   ├── models/           # Mongoose schemas
│   ├── routes/           # API routes
│   ├── controllers/      # Route handlers
│   ├── services/         # Business logic
│   ├── middlewares/      # Express middlewares
│   ├── utils/            # Helper functions
│   ├── jobs/             # Job queue handlers
│   ├── websocket/        # Socket.io handlers
│   ├── app.ts            # Express app
│   └── server.ts         # Server entry point
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT + Bcrypt
- **Task Queue**: Bull + Redis
- **File Storage**: Firebase Storage
- **Email**: Nodemailer
- **Validation**: Express Validator, Joi

## 📚 API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh token

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user profile
- `GET /api/users/:id/stats` - Get user trading stats
- `POST /api/users/:id/follow` - Follow user
- `POST /api/users/:id/unfollow` - Unfollow user

### Posts (Predictions)
- `GET /api/posts` - Get feed
- `POST /api/posts` - Create post
- `GET /api/posts/:id` - Get post by ID
- `PUT /api/posts/:id` - Update post
- `DELETE /api/posts/:id` - Delete post
- `POST /api/posts/:id/like` - Like post
- `POST /api/posts/:id/unlike` - Unlike post

### Comments
- `POST /api/comments` - Create comment
- `GET /api/comments/:postId` - Get post comments
- `DELETE /api/comments/:id` - Delete comment

### Stocks
- `GET /api/stocks/search/:symbol` - Search stock
- `GET /api/stocks/prediction/:symbol` - Get stock predictions
- `GET /api/stocks/chart/:symbol` - Get stock chart data

### News
- `GET /api/news/indian` - Indian market news
- `GET /api/news/global` - Global market news
- `GET /api/news/trending` - Trending news

### Chat
- `GET /api/chat/list` - Get chat list
- `GET /api/chat/:userId` - Get chat messages
- `POST /api/chat/send` - Send message

### Verification
- `POST /api/verification/request` - Submit verification request
- `POST /api/verification/upload` - Upload documents
- `GET /api/verification/status` - Get verification status

## 🔒 Security Features

- JWT token-based authentication
- Password hashing with bcrypt
- CORS protection
- Helmet for HTTP headers
- Rate limiting
- Input validation and sanitization
- MongoDB injection prevention
- CSRF protection

## 🗄️ Database Models

### User
```typescript
{
  email: string;
  password: string;
  name: string;
  avatar: string;
  bio: string;
  isVerified: boolean;
  verificationTier: enum;
  followers: ObjectId[];
  following: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Post
```typescript
{
  content: string;
  userId: ObjectId;
  type: enum (prediction, opinion, news);
  stock: string;
  predictedDirection: enum (up, down);
  targetPrice: number;
  likes: number;
  comments: number;
  createdAt: Date;
  expiresAt: Date;
}
```

### Chat
```typescript
{
  conversationId: string;
  senderId: ObjectId;
  recipientId: ObjectId;
  message: string;
  isRead: boolean;
  createdAt: Date;
}
```

## 🔄 Socket.io Events

### Chat Events
- `chat:message` - New message
- `chat:typing` - User typing indicator
- `chat:read` - Message read receipt

### Notification Events
- `notification:new-follower` - New follower
- `notification:post-liked` - Post liked
- `notification:comment` - Comment on post
- `notification:mention` - User mention

## 📧 Email Templates

- Welcome email for new users
- Password reset
- Verification request confirmation
- KYC approved/rejected

## 🚀 Deployment

### Docker

```bash
# Build image
docker build -t tradepost-api .

# Run container
docker run -p 5000:5000 tradepost-api
```

### Environment Variables for Production

```
NODE_ENV=production
PORT=5000
JWT_SECRET=your_strong_secret_key
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/tradepost
REDIS_URL=redis://your-redis-url
```

## 📊 Monitoring

- Logging with Winston
- Error tracking
- Performance monitoring
- API response time tracking

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- path/to/test.ts
```

## 📝 Development Guidelines

### Code Organization
- Keep controllers thin, move logic to services
- Use middleware for cross-cutting concerns
- Centralize error handling
- Group related routes

### Error Handling
All errors should follow this format:
```typescript
{
  success: false,
  message: string;
  statusCode: number;
  details?: any;
}
```

### Response Format
All successful responses:
```typescript
{
  success: true;
  data: any;
  message?: string;
}
```

## 📚 Documentation

- [Express.js Docs](https://expressjs.com/)
- [MongoDB Docs](https://docs.mongodb.com/)
- [Socket.io Docs](https://socket.io/docs/)
- [JWT Docs](https://jwt.io/)

## 🤝 Contributing

1. Create a feature branch
2. Write tests for new features
3. Ensure all tests pass
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 📞 Support

For issues and questions, please create an issue in the repository.
