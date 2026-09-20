const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const { notFound, errorHandler } = require('./middlewares/errorHandler');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'UNI-MATE API',
    version: '1.0.0',
    docs: 'https://github.com/QuanTran05/unimate-backend/blob/main/docs/api-contract.md',
  });
});

app.use('/api/auth', authRoutes);

// Hai dòng này phải nằm CUỐI CÙNG
app.use(notFound);
app.use(errorHandler);

module.exports = app;