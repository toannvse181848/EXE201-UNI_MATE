const express = require('express');
const router = express.Router();
const {
  getSuggestedStudents,
  getAllUsers,
  updateUserStatus,
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

// Yêu cầu đăng nhập
router.use(protect);

// Sinh viên & người dùng xem danh sách bạn học gợi ý
router.get('/students', getSuggestedStudents);

// Admin quản trị toàn bộ danh sách người dùng
router.get('/all', authorize('admin'), getAllUsers);
router.patch('/:id/status', authorize('admin'), updateUserStatus);

module.exports = router;
