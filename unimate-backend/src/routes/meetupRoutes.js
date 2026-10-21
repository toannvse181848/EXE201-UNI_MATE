const express = require('express');
const router = express.Router();
const { getQuota, createMeetup, respondMeetup, cancelMeetup } = require('../controllers/meetupController');
const { protect, authorize } = require('../middlewares/auth');

// "Rủ cafe" giữa 2 sinh viên đã kết bạn
router.use(protect, authorize('student'));

router.get('/quota', getQuota);
router.post('/', createMeetup);
router.post('/:id/respond', respondMeetup);
router.post('/:id/cancel', cancelMeetup);

module.exports = router;
