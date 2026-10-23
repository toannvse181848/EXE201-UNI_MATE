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
  await User.updateOne({ _id: me._id }, { 'studentProfile.location': location });
  if (!me.studentProfile) me.studentProfile = {};
  me.studentProfile.location = location;
};

module.exports = { saveLocationFromQuery };
