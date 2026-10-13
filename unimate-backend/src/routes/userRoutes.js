const express = require('express');
const router = express.Router();
const {
  getSuggestedStudents,
  getAllUsers,
  updateUserStatus,
  updateAvatar,
  updateMe,
  buyPremium,
  toggleUserPremium,
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');
const { uploadAvatar } = require('../config/cloudinary');

// Yêu cầu đăng nhập
router.use(protect);

// Mua gói Premium (cấp tích xanh xác thực)
router.post('/premium/buy', buyPremium);

// Cập nhật hồ sơ & avatar (mọi user đã đăng nhập)
router.put('/me', updateMe);
router.put('/me/avatar', uploadAvatar.single('avatar'), updateAvatar);

// Sinh viên & người dùng xem danh sách bạn học gợi ý
router.get('/students', getSuggestedStudents);

// Admin quản trị toàn bộ danh sách người dùng
router.get('/all', authorize('admin'), getAllUsers);
router.patch('/:id/status', authorize('admin'), updateUserStatus);
router.patch('/:id/premium', authorize('admin'), toggleUserPremium);

module.exports = router;
