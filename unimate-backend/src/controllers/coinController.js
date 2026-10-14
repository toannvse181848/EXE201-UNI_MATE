const User = require('../models/User');
const Venue = require('../models/Venue');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const {
  MAX_DAILY_EARN,
  getEarnedToday: _getEarnedToday,
  updateDailyEarned: _updateDailyEarned,
  addCoinLog: _addCoinLog,
} = require('../utils/coinService');
const {
  CHECKIN_RADIUS_METERS,
  parseQrContent,
  secretMatches,
  hasRealCoordinates,
  distanceMeters,
} = require('../utils/venueCheckin');

/**
 * Thiết kế cơ chế UniCoin — chống lạm phát, duy trì engagement:
 *
 * KIẾM ĐIỂM:
 *  - Điểm danh hằng ngày (Daily Check-in): +10 coin/ngày
 *    - Streak 3 ngày: +5 bonus
 *    - Streak 7 ngày: +15 bonus  → max streak bonus/tuần = 20 coin
 *  - Check-in quán cafe (QR): +20 coin (tối đa 1 lần/quán/ngày, 2 quán/ngày)
 *  - Giới hạn kiếm mỗi ngày: 60 coin/ngày (chặn abuse)
 *
 * TIÊU ĐIỂM:
 *  - Đổi voucher: tuỳ theo voucher (50-200 coin)
 *  - Nâng cấp Premium (monthly): 800 coin
 *
 * PHÂN TÍCH:
 *  - User chăm check-in daily (7 ngày/tuần): 70 + 20 bonus = 90 coin/tuần
 *  - Cộng QR 2 lần/ngày * 7 ngày: +280 → NHƯNG giới hạn 60/ngày nên thực tế 60*7 = 420 coin/tuần max
 *  - Premium monthly cần 800 coin → ~2-3 tuần chăm chỉ (đủ để retain user)
 */

const DAILY_CHECKIN_COIN = 10;
const STREAK_BONUS_3 = 5;
const STREAK_BONUS_7 = 15;
const VENUE_CHECKIN_COIN = 20;
const MAX_VENUE_CHECKINS_PER_DAY = 2;

// GET /api/coins/status — trạng thái coin + lịch sử check-in
const getCoinStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const profile = user.studentProfile || {};
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCheckin = profile.lastDailyCheckin ? new Date(profile.lastDailyCheckin) : null;
  const lastCheckinDay = lastCheckin ? new Date(lastCheckin.setHours(0, 0, 0, 0)) : null;

  const canCheckinToday = !lastCheckinDay || lastCheckinDay.getTime() < today.getTime();

  // Tính streak
  const streak = profile.checkinStreak || 0;
  const yesterdayTs = today.getTime() - 86400000;
  const streakStillActive = lastCheckinDay && lastCheckinDay.getTime() >= yesterdayTs;
  const currentStreak = streakStillActive ? streak : (canCheckinToday ? streak : 0);

  // Daily earned today
  const dailyEarned = profile.dailyEarned || 0;
  const lastEarnDate = profile.lastEarnDate ? new Date(profile.lastEarnDate) : null;
  const lastEarnDay = lastEarnDate ? new Date(lastEarnDate.setHours(0, 0, 0, 0)) : null;
  const earnedToday = lastEarnDay && lastEarnDay.getTime() === today.getTime() ? dailyEarned : 0;

  // Venue checkins today
  const venueCheckinsToday = (profile.venueCheckinsToday || []).filter(vc => {
    const vcDay = new Date(vc.date);
    vcDay.setHours(0, 0, 0, 0);
    return vcDay.getTime() === today.getTime();
  });

  res.status(200).json({
    success: true,
    data: {
      uniCoin: profile.uniCoin || 0,
      canCheckinToday,
      currentStreak: currentStreak,
      nextStreakBonus: currentStreak >= 7 ? 'Streak 7 ngày! +15 bonus' : currentStreak >= 3 ? 'Streak 3 ngày! +5 bonus' : null,
      earnedToday,
      maxDailyEarn: MAX_DAILY_EARN,
      venueCheckinsToday: venueCheckinsToday.length,
      maxVenueCheckinsPerDay: MAX_VENUE_CHECKINS_PER_DAY,
      checkinHistory: profile.checkinHistory || [],
      coinLog: (profile.coinLog || []).slice(-20).reverse(), // 20 giao dịch gần nhất
    },
  });
});

// POST /api/coins/daily-checkin — điểm danh hằng ngày
const dailyCheckin = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  if (!user.studentProfile) user.studentProfile = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastCheckin = user.studentProfile.lastDailyCheckin
    ? new Date(user.studentProfile.lastDailyCheckin)
    : null;
  const lastCheckinDay = lastCheckin ? new Date(new Date(lastCheckin).setHours(0, 0, 0, 0)) : null;

  if (lastCheckinDay && lastCheckinDay.getTime() === today.getTime()) {
    throw new ApiError(400, 'Bạn đã điểm danh hôm nay rồi! Quay lại vào ngày mai nhé 🌅');
  }

  // Tính streak
  const yesterdayTs = today.getTime() - 86400000;
  const prevStreak = user.studentProfile.checkinStreak || 0;
  const streakContinues = lastCheckinDay && lastCheckinDay.getTime() === yesterdayTs;
  const newStreak = streakContinues ? prevStreak + 1 : 1;

  // Tính coin nhận được
  let coinEarned = DAILY_CHECKIN_COIN;
  let bonusReason = '';

  if (newStreak === 3 || (newStreak > 3 && newStreak % 3 === 0 && newStreak < 7)) {
    coinEarned += STREAK_BONUS_3;
    bonusReason = `+${STREAK_BONUS_3} streak ${newStreak} ngày liên tiếp 🔥`;
  }
  if (newStreak === 7 || (newStreak > 7 && newStreak % 7 === 0)) {
    coinEarned += STREAK_BONUS_7;
    bonusReason = `+${STREAK_BONUS_7} streak ${newStreak} ngày liên tiếp 🔥🔥`;
  }

  // Kiểm tra giới hạn ngày
  const earnedToday = _getEarnedToday(user.studentProfile);
  const canEarn = Math.min(coinEarned, MAX_DAILY_EARN - earnedToday);
  if (canEarn <= 0) {
    throw new ApiError(400, `Bạn đã đạt giới hạn ${MAX_DAILY_EARN} UniCoin kiếm mỗi ngày!`);
  }
  coinEarned = canEarn;

  // Cập nhật
  user.studentProfile.uniCoin = (user.studentProfile.uniCoin || 0) + coinEarned;
  user.studentProfile.lastDailyCheckin = new Date();
  user.studentProfile.checkinStreak = newStreak;

  // Ghi log
  _addCoinLog(user.studentProfile, {
    type: 'daily_checkin',
    amount: coinEarned,
    description: `Điểm danh ngày ${newStreak}${bonusReason ? ` — ${bonusReason}` : ''}`,
  });
  _updateDailyEarned(user.studentProfile, coinEarned);

  user.markModified('studentProfile');
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `✅ Điểm danh thành công! +${coinEarned} UniCoin${bonusReason ? ` (${bonusReason})` : ''}`,
    data: {
      coinEarned,
      bonusReason,
      newStreak,
      uniCoin: user.studentProfile.uniCoin,
    },
  });
});

// POST /api/coins/venue-checkin — quét QR dán tại quán cafe nhận điểm
// Body: { qrContent: "UNIMATE-CHECKIN:<venueId>:<secret>", lat, lng }
const venueCheckin = catchAsync(async (req, res) => {
  const parsedQr = parseQrContent(req.body.qrContent);
  if (!parsedQr) {
    throw new ApiError(400, 'Mã QR không hợp lệ. Vui lòng quét mã QR check-in dán tại quán 📷');
  }

  const venue = await Venue.findById(parsedQr.venueId).select('+checkinSecret name location status');
  if (!venue || venue.status !== 'approved') throw new ApiError(404, 'Không tìm thấy quán cafe này');
  if (!secretMatches(venue.checkinSecret, parsedQr.secret)) {
    throw new ApiError(400, 'Mã QR đã hết hiệu lực. Vui lòng quét mã QR mới tại quán');
  }

  // Quán đã có toạ độ thật thì bắt buộc sinh viên phải đứng gần quán
  let distance = null;
  if (hasRealCoordinates(venue)) {
    const lat = Number(req.body.lat);
    const lng = Number(req.body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      throw new ApiError(400, 'Vui lòng bật định vị (GPS) để check-in tại quán 📍');
    }
    const [venueLng, venueLat] = venue.location.coordinates;
    distance = Math.round(distanceMeters(lat, lng, venueLat, venueLng));
    if (distance > CHECKIN_RADIUS_METERS) {
      throw new ApiError(400, `Bạn đang cách quán khoảng ${distance}m. Hãy đến quán để check-in nhé ☕`);
    }
  }

  const venueId = venue._id.toString();
  const venueName = venue.name;

  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  if (!user.studentProfile) user.studentProfile = {};

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Khởi tạo mảng nếu chưa có
  if (!Array.isArray(user.studentProfile.venueCheckinsToday)) {
    user.studentProfile.venueCheckinsToday = [];
  }

  // Lọc check-in hôm nay
  const todayCheckins = user.studentProfile.venueCheckinsToday.filter(vc => {
    const vcDay = new Date(vc.date);
    vcDay.setHours(0, 0, 0, 0);
    return vcDay.getTime() === today.getTime();
  });

  // Kiểm tra đã check-in quán này hôm nay chưa
  const alreadyCheckedIn = todayCheckins.find(vc => vc.venueId === venueId);
  if (alreadyCheckedIn) {
    throw new ApiError(400, 'Bạn đã check-in quán này hôm nay rồi! Mỗi quán chỉ tính 1 lần/ngày 📍');
  }

  // Kiểm tra giới hạn số quán/ngày
  if (todayCheckins.length >= MAX_VENUE_CHECKINS_PER_DAY) {
    throw new ApiError(400, `Bạn đã check-in tối đa ${MAX_VENUE_CHECKINS_PER_DAY} quán hôm nay rồi! Quay lại ngày mai nhé ☕`);
  }

  // Kiểm tra giới hạn coin/ngày
  const earnedToday = _getEarnedToday(user.studentProfile);
  const canEarn = Math.min(VENUE_CHECKIN_COIN, MAX_DAILY_EARN - earnedToday);
  if (canEarn <= 0) {
    throw new ApiError(400, `Bạn đã đạt giới hạn ${MAX_DAILY_EARN} UniCoin kiếm mỗi ngày!`);
  }

  const coinEarned = canEarn;

  // Cập nhật
  user.studentProfile.uniCoin = (user.studentProfile.uniCoin || 0) + coinEarned;
  user.studentProfile.venueCheckinsToday.push({
    venueId,
    venueName: venueName || 'Quán cafe',
    date: new Date(),
    coinEarned,
  });

  _addCoinLog(user.studentProfile, {
    type: 'venue_checkin',
    amount: coinEarned,
    description: `Check-in tại ${venueName || 'quán cafe'} ☕`,
  });
  _updateDailyEarned(user.studentProfile, coinEarned);

  user.markModified('studentProfile');
  await user.save({ validateBeforeSave: false });

  res.status(200).json({
    success: true,
    message: `🎉 Check-in thành công tại ${venueName || 'quán cafe'}! +${coinEarned} UniCoin`,
    data: {
      coinEarned,
      uniCoin: user.studentProfile.uniCoin,
      venueName,
      // false = quán chưa có toạ độ thật nên chưa kiểm tra được vị trí
      locationVerified: distance !== null,
      distanceMeters: distance,
      venueCheckinsToday:user.studentProfile.venueCheckinsToday.filter(vc => {
        const d = new Date(vc.date); d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
      }).length,
    },
  });
});

module.exports = { getCoinStatus, dailyCheckin, venueCheckin };
