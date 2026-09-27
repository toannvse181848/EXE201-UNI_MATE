const express = require('express');
const router = express.Router();
const { savePreferences, getRecommendations } = require('../controllers/onboardingController');
const { protect, authorize } = require('../middlewares/auth');

// Yêu cầu đăng nhập
router.use(protect);

// POST /api/onboarding/preferences — Lưu sở thích sau đăng ký
router.post('/preferences', savePreferences);

// GET /api/onboarding/recommendations — Lấy danh sách gợi ý đã tính điểm
router.get('/recommendations', getRecommendations);

module.exports = router;
