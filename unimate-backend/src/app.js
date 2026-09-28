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
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const path = require('path');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UNI-MATE API v1.2.0',
    version: '1.2.0',
    features: ['Auth', 'Venues', 'Vouchers + Wallet', 'Match/Swipe', 'Real-time Chat', 'Reports', 'Users', 'Onboarding & AI Matching'],
    endpoints: {
      auth: '/api/auth',
      venues: '/api/venues',
      vouchers: '/api/vouchers',
      matches: '/api/matches',
      chat: '/api/chat',
      reports: '/api/reports',
      users: '/api/users',
      onboarding: '/api/onboarding',
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

// Hai dòng này phải nằm CUỐI CÙNG
app.use(notFound);
app.use(errorHandler);

module.exports = app;