const ApiError = require('./ApiError');

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;

/**
 * Đọc tham số phân trang tin nhắn từ query string.
 * - before=<thời gian ISO>: lấy các tin cũ hơn mốc này (web dùng khi kéo lên xem tin cũ)
 * - page/limit: kiểu cũ, giữ để tương thích app mobile
 * Trả về filter createdAt, skip, limit để query Mongo.
 */
const parseMessagePaging = (query) => {
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || DEFAULT_LIMIT, 1), MAX_LIMIT);

  if (query.before) {
    const before = new Date(query.before);
    if (Number.isNaN(before.getTime())) {
      throw new ApiError(400, 'Mốc thời gian không hợp lệ');
    }
    return { limit, skip: 0, createdAtFilter: { createdAt: { $lt: before } } };
  }

  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  return { limit, skip: (page - 1) * limit, createdAtFilter: {} };
};

/**
 * Query lấy thêm 1 tin để biết còn tin cũ hơn không; hàm này cắt bớt tin thừa.
 * `messages` phải đang sắp xếp mới nhất trước.
 */
const trimExtraMessage = (messages, limit) => {
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();
  return hasMore;
};

module.exports = { parseMessagePaging, trimExtraMessage };
