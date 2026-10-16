const express = require('express');
const router = express.Router();
const {
  getMyGroups,
  createGroup,
  getGroupMessages,
  sendGroupMessage,
  addMembers,
  leaveGroup,
  getInvitableFriends,
  getMyFriends,
} = require('../controllers/groupChatController');
const { uploadChatMedia } = require('../config/cloudinary');
const { uploadMedia } = require('../controllers/chatController');
const { protect, authorize } = require('../middlewares/auth');

// Tất cả group chat routes yêu cầu đăng nhập sinh viên
router.use(protect);
router.use(authorize('student'));

// Lấy danh sách bạn bè có thể tạo nhóm/mời vào nhóm
router.get('/friends', getMyFriends);

// CRUD nhóm
router.get('/', getMyGroups);
router.post('/', createGroup);

// Quản lý thành viên
router.get('/:groupId/invitable', getInvitableFriends);
router.post('/:groupId/members', addMembers);
router.delete('/:groupId/members/me', leaveGroup);

// Tin nhắn nhóm
router.get('/:groupId/messages', getGroupMessages);
router.post('/:groupId/messages', sendGroupMessage);

// Upload file cho nhóm (dùng chung với chat đơn)
router.post('/upload', uploadChatMedia.single('file'), uploadMedia);

module.exports = router;
