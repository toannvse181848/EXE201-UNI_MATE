const express = require('express');
const router = express.Router();
const { getConversations, getMessages, sendMessage } = require('../controllers/chatController');
const { protect, authorize } = require('../middlewares/auth');

// Tất cả chat routes yêu cầu đăng nhập sinh viên
router.use(protect);
router.use(authorize('student'));

// Danh sách hội thoại (inbox)
router.get('/conversations', getConversations);

// Lịch sử tin nhắn của một match
router.get('/:matchId/messages', getMessages);

// Gửi tin nhắn (REST fallback, Socket.io là primary)
router.post('/:matchId/messages', sendMessage);

module.exports = router;
