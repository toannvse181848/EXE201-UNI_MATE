const ApiError = require('../utils/ApiError');

// Route không tồn tại
const notFound = (req, res, next) => {
  next(new ApiError(404, `Không tìm thấy đường dẫn: ${req.originalUrl}`));
};

// Xử lý tập trung mọi lỗi
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Lỗi hệ thống';

  // Lỗi validate của Mongoose
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(err.errors).map((e) => e.message).join(', ');
  }

  // Trùng dữ liệu unique (vd: email)
  if (err.code === 11000) {
    statusCode = 409;
    const field = Object.keys(err.keyValue)[0];
    message = `${field} đã được sử dụng`;
  }

  // ID sai định dạng ObjectId
  if (err.name === 'CastError') {
    statusCode = 400;
    message = 'ID không hợp lệ';
  }

  // JSON gửi lên bị hỏng cú pháp
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Dữ liệu gửi lên không đúng định dạng JSON';
  }

  // Token hỏng / hết hạn
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Vui lòng đăng nhập';
  }
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Phiên đăng nhập đã hết hạn';
  }

  // Lỗi 500 thật thì log ra terminal để dev biết, nhưng không trả về cho client
  if (statusCode === 500) {
    console.error('SERVER ERROR:', err);
    if (process.env.NODE_ENV === 'production') {
      message = 'Lỗi hệ thống, vui lòng thử lại sau';
    }
  }

  res.status(statusCode).json({ success: false, message });
};

module.exports = { notFound, errorHandler };