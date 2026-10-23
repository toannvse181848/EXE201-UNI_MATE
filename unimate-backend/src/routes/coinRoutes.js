const express = require('express');
const router = express.Router();
const { getCoinStatus, dailyCheckin, venueCheckin } = require('../controllers/coinController');
const { protect, authorize } = require('../middlewares/auth');

router.use(protect, authorize('student'));

// GET  /api/coins/status        — trạng thái coin + lịch sử
router.get('/status', getCoinStatus);

// POST /api/coins/daily-checkin — điểm danh hằng ngày
router.post('/daily-checkin', dailyCheckin);

// POST /api/coins/venue-checkin — quét QR tại quán cafe nhận điểm
router.post('/venue-checkin', venueCheckin);

module.exports = router;
