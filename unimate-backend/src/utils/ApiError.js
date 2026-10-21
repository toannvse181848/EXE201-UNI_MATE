class ApiError extends Error {
  // errorCode: mã lỗi để client xử lý riêng (VD: 'MEETUP_QUOTA' → mời nâng cấp Premium)
  constructor(statusCode, message, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errorCode = errorCode;
  }
}

module.exports = ApiError;