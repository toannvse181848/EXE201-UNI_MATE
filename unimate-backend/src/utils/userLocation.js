const User = require('../models/User');

/**
 * Lưu vị trí hiện tại của sinh viên nếu client gửi kèm ?lat=&lng= (dùng tính khoảng cách thật khi gợi ý bạn).
 * Cập nhật luôn object `me` trong bộ nhớ để lần tính điểm ngay sau dùng vị trí mới.
 */
const saveLocationFromQuery = async (me, query = {}) => {
  const lat = Number(query.lat);
  const lng = Number(query.lng);
  if (!me || !Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return;
  const location = { type: 'Point', coordinates: [lng, lat] };
  // Lưu vị trí lỗi thì vẫn gợi ý bình thường (chỉ thiếu điểm khoảng cách), không trả 500 cho cả trang
  try {
    await User.updateOne({ _id: me._id }, { 'studentProfile.location': location });
  } catch (err) {
    console.error('[userLocation] Không lưu được vị trí:', err.message);
    return;
  }
  if (!me.studentProfile) me.studentProfile = {};
  me.studentProfile.location = location;
};

module.exports = { saveLocationFromQuery };
