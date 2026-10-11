const { rateLimit } = require('express-rate-limit');

/**
 * 1. Chống tấn công NoSQL Injection:
 * Đệ quy loại bỏ bất kỳ key nào bắt đầu bằng $ hoặc chứa dấu chấm (.)
 * trong req.body, req.query, req.params.
 */
const sanitizeObject = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  const clean = {};
  for (const key of Object.keys(obj)) {
    // Ngăn chặn các toán tử MongoDB như $gt, $ne, $where, $regex nếu truyền qua JSON
    if (key.startsWith('$') || key.includes('.')) {
      continue;
    }
    clean[key] = sanitizeObject(obj[key]);
  }
  return clean;
};

const noSqlSanitizer = (req, res, next) => {
  if (req.body) req.body = sanitizeObject(req.body);
  if (req.query) req.query = sanitizeObject(req.query);
  if (req.params) req.params = sanitizeObject(req.params);
  next();
};

/**
 * 2. Thoát ký tự đặc biệt Regex (Chống ReDoS và Regex Injection)
 */
const escapeRegex = (str = '') => {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * 3. Rate Limiters chống Brute-Force & Denial of Service (DoS)
 */

// Giới hạn chung cho toàn bộ API (300 requests / 15 phút)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã gửi quá nhiều yêu cầu đến máy chủ. Vui lòng thử lại sau ít phút.',
  },
});

// Giới hạn nghiêm ngặt cho Đăng nhập (15 lần / 15 phút) — Chống Brute Force mật khẩu
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Đăng nhập sai quá nhiều lần. Vui lòng đợi 15 phút trước khi thử lại.',
  },
});

// Giới hạn Đăng ký tài khoản (10 lần / 1 giờ) — Chống spam tạo tài khoản ảo
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Tạo tài khoản quá nhanh. Vui lòng thử lại sau 1 giờ.',
  },
});

// Giới hạn Quên mật khẩu (5 lần / 1 giờ) — Chống spam email & cạn kiệt quota SMTP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Yêu cầu gửi lại mật khẩu quá nhiều lần. Vui lòng thử lại sau 1 giờ.',
  },
});

module.exports = {
  noSqlSanitizer,
  escapeRegex,
  apiLimiter,
  authLimiter,
  registerLimiter,
  forgotPasswordLimiter,
};
