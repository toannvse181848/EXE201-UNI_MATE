/**
 * Các hàm cộng UniCoin dùng chung (điểm danh, check-in quán, dùng voucher, hẹn cafe).
 * Mọi khoản kiếm coin đều đi qua đây để cùng chịu giới hạn MAX_DAILY_EARN mỗi ngày.
 *
 * - "Ngày" tính theo giờ Việt Nam (vnDay, dùng chung với nhật ký hoạt động), không theo giờ máy chủ:
 *   máy chủ chạy UTC thì ngày mới bắt đầu lúc 7:00 sáng, streak và giới hạn ngày bị lệch.
 * - Cộng coin bằng cập nhật có điều kiện trên database ($inc), không đọc → sửa → lưu cả studentProfile:
 *   hai request cùng lúc không thể vượt giới hạn ngày hay ghi đè lần trừ coin vừa xảy ra.
 */
const User = require('../models/User');
const { vnDay } = require('./activityTracker');

const MAX_DAILY_EARN = 60;
const MAX_RETRIES = 5;

/** Coin đã kiếm trong ngày (giờ VN) theo dữ liệu trong profile */
function getEarnedToday(profile = {}) {
  return profile.earnDay === vnDay() ? profile.dailyEarned || 0 : 0;
}

const logEntry = (type, amount, description) => ({ type, amount, description, createdAt: new Date() });

/**
 * Cộng coin cho sinh viên, tự cắt theo giới hạn ngày. Ghi thẳng vào database.
 * @returns số coin thực nhận (0 nếu đã chạm giới hạn)
 */
async function earnCoins(userId, amount, { type, description }) {
  const today = vnDay();
  // Sang ngày mới thì đặt lại bộ đếm (có điều kiện, chạy nhiều lần cũng chỉ đặt lại 1 lần)
  await User.updateOne(
    { _id: userId, 'studentProfile.earnDay': { $ne: today } },
    { $set: { 'studentProfile.earnDay': today, 'studentProfile.dailyEarned': 0 } }
  );

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    const user = await User.findById(userId).select('studentProfile.dailyEarned studentProfile.earnDay');
    if (!user) return 0;
    const earnedToday = user.studentProfile?.dailyEarned || 0;
    const earned = Math.max(0, Math.min(amount, MAX_DAILY_EARN - earnedToday));
    if (earned <= 0) return 0;

    // Chỉ cộng khi bộ đếm vẫn đúng như vừa đọc; có request khác chen vào thì đọc lại và thử lại
    const res = await User.updateOne(
      { _id: userId, 'studentProfile.earnDay': today, 'studentProfile.dailyEarned': earnedToday },
      {
        $inc: { 'studentProfile.uniCoin': earned, 'studentProfile.dailyEarned': earned },
        $set: { 'studentProfile.lastEarnDate': new Date() },
        $push: { 'studentProfile.coinLog': { $each: [logEntry(type, earned, description)], $slice: -100 } },
      }
    );
    if (res.modifiedCount > 0) return earned;
  }
  return 0;
}

module.exports = {
  MAX_DAILY_EARN,
  getEarnedToday,
  earnCoins,
  vnDay,
};
