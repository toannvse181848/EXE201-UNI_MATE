const jwt = require('jsonwebtoken');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { recordActivity } = require('../utils/activityTracker');

const protect = catchAsync(async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Vui lòng đăng nhập');
  }

  const token = header.split(' ')[1];
  const decoded = jwt.verify(token, process.env.JWT_SECRET);

  const user = await User.findById(decoded.id);
  if (!user) throw new ApiError(401, 'Vui lòng đăng nhập');
  if (user.status === 'suspended') throw new ApiError(403, 'Tài khoản đã bị khoá');

  // Cập nhật lastActiveAt (throttle 30 giây để tối ưu hiệu năng DB)
  const now = Date.now();
  if (!user.lastActiveAt || now - new Date(user.lastActiveAt).getTime() > 30000) {
    user.lastActiveAt = new Date(now);
    User.findByIdAndUpdate(user._id, { lastActiveAt: new Date(now) }).exec().catch(() => {});
  }
  // Nhật ký ngày hoạt động (web + mobile) cho số liệu quay lại / hoạt động hằng tuần
  recordActivity(user._id, req.headers['user-agent']);

  req.user = user;
  next();
});

/**
 * Normalize role để authorize linh hoạt:
 * - 'student' matches cả 'student' và 'user' (sinh viên có thể đăng ký với role 'user')
 * - 'admin' chỉ match 'admin'
 * - 'partner' chỉ match 'partner'
 */
const normalize = (role) => {
  if (role === 'student' || role === 'user') return 'student';
  return role;
};

const authorize = (...roles) => {
  return (req, res, next) => {
    const userNormalized = normalize(req.user.role);
    const allowed = roles.some((r) => normalize(r) === userNormalized);
    if (!allowed) {
      throw new ApiError(403, 'Bạn không có quyền truy cập');
    }
    next();
  };
};

module.exports = { protect, authorize };