const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { recordActivity } = require('../utils/activityTracker');

// Thu ngân chỉ được quét voucher và xem lịch sử quét của chi nhánh mình. Chặn ở đây để route nào
// quên ghi authorize cũng không lộ dữ liệu quán (sửa voucher, số liệu, đổi mật khẩu...)
const CASHIER_ALLOWED_PATHS = [
  /^\/api\/auth\/me\/?$/,
  /^\/api\/vouchers\/(verify|redeem|partner\/redemptions)\/?$/,
];

/** Tài khoản thu ngân còn dùng được: chủ quán còn hoạt động và chi nhánh vẫn thuộc chủ quán */
const assertCashierUsable = async (user) => {
  const { partnerId, venueId } = user.cashierProfile || {};
  const [owner, venue] = await Promise.all([
    partnerId ? User.findById(partnerId).select('status role') : null,
    venueId ? Venue.findById(venueId).select('partnerId') : null,
  ]);
  if (!owner || owner.role !== 'partner' || !venue || String(venue.partnerId) !== String(partnerId)) {
    throw new ApiError(403, 'Tài khoản thu ngân không còn gắn với chi nhánh nào. Nhờ chủ quán kiểm tra lại.');
  }
  if (owner.status === 'suspended') throw new ApiError(403, 'Tài khoản quán đã bị khoá nên thu ngân không dùng được');
};

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
  if (user.role === 'cashier') {
    const path = req.baseUrl + req.path;
    if (!CASHIER_ALLOWED_PATHS.some((pattern) => pattern.test(path))) {
      throw new ApiError(403, 'Tài khoản thu ngân chỉ dùng để quét voucher');
    }
    await assertCashierUsable(user);
  }

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

module.exports = { protect, authorize, assertCashierUsable };