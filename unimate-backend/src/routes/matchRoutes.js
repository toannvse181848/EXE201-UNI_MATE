const express = require('express');
const router = express.Router();
const {
  getDiscoveryDeck,
  swipe,
  getMyMatches,
  proposeVenue,
  getSentLikes,
  getReceivedLikes,
  unmatch,
  blockUser,
  getBlockedUsers,
  unblockUser,
} = require('../controllers/matchController');
const { protect, authorize } = require('../middlewares/auth');

// Yêu cầu đăng nhập tài khoản sinh viên
router.use(protect);
router.use(authorize('student'));

router.get('/discover', getDiscoveryDeck);
router.post('/swipe', swipe);
router.get('/my-matches', getMyMatches);
router.post('/propose-venue', proposeVenue);
router.get('/sent-likes', getSentLikes);
router.get('/received-likes', getReceivedLikes);

// Huỷ kết bạn / chặn
router.post('/block', blockUser);
router.get('/blocked', getBlockedUsers);
router.delete('/block/:userId', unblockUser);
router.post('/:matchId/unmatch', unmatch);

module.exports = router;
