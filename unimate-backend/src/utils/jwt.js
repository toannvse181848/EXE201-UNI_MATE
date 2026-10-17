const jwt = require('jsonwebtoken');

const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    // Mặc định 7 ngày nếu chưa cấu hình (thiếu biến này thì jsonwebtoken báo lỗi và không đăng nhập được)
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

module.exports = { generateToken };