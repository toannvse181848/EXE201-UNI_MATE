/**
 * Các hàm cộng UniCoin dùng chung (điểm danh, check-in quán, dùng voucher).
 * Mọi khoản kiếm coin đều đi qua đây để cùng chịu giới hạn MAX_DAILY_EARN mỗi ngày.
 */

const MAX_DAILY_EARN = 60;

function getEarnedToday(profile) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const lastEarnDate = profile.lastEarnDate ? new Date(profile.lastEarnDate) : null;
  const lastEarnDay = lastEarnDate ? new Date(new Date(lastEarnDate).setHours(0, 0, 0, 0)) : null;
  return lastEarnDay && lastEarnDay.getTime() === today.getTime() ? (profile.dailyEarned || 0) : 0;
}

function updateDailyEarned(profile, amount) {
  const currentEarned = getEarnedToday(profile);
  profile.dailyEarned = currentEarned + amount;
  profile.lastEarnDate = new Date();
}

function addCoinLog(profile, entry) {
  if (!Array.isArray(profile.coinLog)) profile.coinLog = [];
  profile.coinLog.push({ ...entry, createdAt: new Date() });
  // Giữ tối đa 100 giao dịch gần nhất
  if (profile.coinLog.length > 100) {
    profile.coinLog = profile.coinLog.slice(-100);
  }
}

/**
 * Cộng coin cho sinh viên, tự cắt theo giới hạn ngày.
 * Chỉ sửa document, người gọi tự save. Trả về số coin thực nhận (0 nếu đã chạm giới hạn).
 */
function earnCoins(user, amount, { type, description }) {
  if (!user.studentProfile) user.studentProfile = {};
  const profile = user.studentProfile;
  const earned = Math.max(0, Math.min(amount, MAX_DAILY_EARN - getEarnedToday(profile)));
  if (earned <= 0) return 0;

  profile.uniCoin = (profile.uniCoin || 0) + earned;
  addCoinLog(profile, { type, amount: earned, description });
  updateDailyEarned(profile, earned);
  user.markModified('studentProfile');
  return earned;
}

module.exports = {
  MAX_DAILY_EARN,
  getEarnedToday,
  updateDailyEarned,
  addCoinLog,
  earnCoins,
};
