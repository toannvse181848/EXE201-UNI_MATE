const express = require('express');
const router = express.Router();
const {
  getDiscoveryDeck,
  swipe,
  getMyMatches,
  proposeVenue,
} = require('../controllers/matchController');
const { protect, authorize } = require('../middlewares/auth');

// Yêu cầu đăng nhập tài khoản sinh viên
router.use(protect);
router.use(authorize('student'));

router.get('/discover', getDiscoveryDeck);
router.post('/swipe', swipe);
router.get('/my-matches', getMyMatches);
router.post('/propose-venue', proposeVenue);

module.exports = router;
