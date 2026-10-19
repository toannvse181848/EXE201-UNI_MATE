const UserActivity = require('../models/UserActivity');

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Ngày theo giờ Việt Nam, dạng 2026-10-19 */
const vnDay = (date = new Date()) => new Date(new Date(date).getTime() + VN_OFFSET_MS).toISOString().slice(0, 10);

// App React Native gửi request qua okhttp (Android) hoặc CFNetwork/Darwin (iOS); còn lại là trình duyệt
const detectPlatform = (userAgent = '') => (/okhttp|CFNetwork|Darwin|Dalvik|Expo/i.test(userAgent) ? 'mobile' : 'web');

// Đã ghi trong ngày hôm nay → bỏ qua, để không ghi database ở mọi request
const recorded = new Set();
let recordedDay = vnDay();

/** Ghi nhận người dùng có dùng app hôm nay (không chờ, lỗi không ảnh hưởng request) */
const recordActivity = (userId, userAgent) => {
  if (!userId) return;
  const day = vnDay();
  if (day !== recordedDay) {
    recorded.clear();
    recordedDay = day;
  }
  const platform = detectPlatform(userAgent);
  const key = `${userId}:${platform}`;
  if (recorded.has(key)) return;
  recorded.add(key);

  UserActivity.updateOne({ userId, day }, { $addToSet: { platforms: platform } }, { upsert: true }).catch((err) => {
    // Hai request cùng lúc có thể cùng upsert → lỗi trùng khoá; lần sau sẽ ghi lại
    recorded.delete(key);
    if (err.code !== 11000) console.error('Ghi hoạt động người dùng thất bại:', err.message);
  });
};

module.exports = { recordActivity, vnDay, detectPlatform };
