const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const venueRoutes = require('./routes/venueRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const matchRoutes = require('./routes/matchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const chatRoutes = require('./routes/chatRoutes');
const userRoutes = require('./routes/userRoutes');
const onboardingRoutes = require('./routes/onboardingRoutes');
const adminRoutes = require('./routes/adminRoutes');
const coinRoutes = require('./routes/coinRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const helmet = require('helmet');
const ApiError = require('./utils/ApiError');
const { noSqlSanitizer, apiLimiter } = require('./middlewares/security');

const path = require('path');

const app = express();

// 1. Tắt header lộ thông tin Express (Information Disclosure)
app.disable('x-powered-by');

// 2. Render chạy sau proxy HTTPS
app.set('trust proxy', 1);

// 3. Security Headers chuẩn OWASP bằng Helmet
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: false,
  })
);

// 4. Kiểm soát CORS chặt chẽ (chống CORS misconfiguration)
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8081',
  'http://127.0.0.1:5173',
  'https://uni-mate-web-beta.vercel.app',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }
      return callback(new ApiError(403, 'CORS: Nguồn truy cập không được phép'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. Chống tấn công NoSQL Injection
app.use(noSqlSanitizer);

// 6. Rate Limiter bảo vệ toàn bộ API
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));


app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UNI-MATE API v1.3.0',
    version: '1.3.0',
    features: ['Auth', 'Venues', 'Vouchers + Wallet', 'Match/Swipe', 'Real-time Chat', 'Reports', 'Users', 'Onboarding & AI Matching', 'Image Upload', 'Admin Stats'],
    endpoints: {
      auth: '/api/auth',
      venues: '/api/venues',
      vouchers: '/api/vouchers',
      matches: '/api/matches',
      chat: '/api/chat',
      reports: '/api/reports',
      users: '/api/users',
      onboarding: '/api/onboarding',
      admin: '/api/admin',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/users', userRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/coins', coinRoutes);
app.use('/api/orders', orderRoutes);

// Hai dòng này phải nằm CUỐI CÙNG
app.use(notFound);
app.use(errorHandler);

module.exports = app;