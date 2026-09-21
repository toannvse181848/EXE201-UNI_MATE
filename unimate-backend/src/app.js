const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const venueRoutes = require('./routes/venueRoutes');
const voucherRoutes = require('./routes/voucherRoutes');
const matchRoutes = require('./routes/matchRoutes');
const reportRoutes = require('./routes/reportRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UNI-MATE API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      venues: '/api/venues',
      vouchers: '/api/vouchers',
      matches: '/api/matches',
      reports: '/api/reports',
    },
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/venues', venueRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/reports', reportRoutes);

// Hai dòng này phải nằm CUỐI CÙNG
app.use(notFound);
app.use(errorHandler);

module.exports = app;