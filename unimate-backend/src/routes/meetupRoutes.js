const express = require('express');
const router = express.Router();
const {
  getQuota,
  createMeetup,
  createGroupMeetup,
  joinMeetup,
  leaveMeetup,
  respondMeetup,
  cancelMeetup,
} = require('../controllers/meetupController');
const { protect, authorize } = require('../middlewares/auth');

// "Rủ cafe" giữa 2 sinh viên đã kết bạn, hoặc của cả một nhóm chat
router.use(protect, authorize('student'));

router.get('/quota', getQuota);
router.post('/', createMeetup);
router.post('/group', createGroupMeetup);
router.post('/:id/respond', respondMeetup);
router.post('/:id/join', joinMeetup);
router.post('/:id/leave', leaveMeetup);
router.post('/:id/cancel', cancelMeetup);

module.exports = router;
