const User = require('../models/User');
const Venue = require('../models/Venue');
const VenueCheckin = require('../models/VenueCheckin');
const { isVenueVisible } = require('../utils/visibility');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { MAX_DAILY_EARN, getEarnedToday, earnCoins, vnDay } = require('../utils/coinService');
const {
  CHECKIN_RADIUS_METERS,
  parseQrContent,
  secretMatches,
  hasRealCoordinates,
  distanceMeters,
} = require('../utils/venueCheckin');
const { onVenueCheckin } = require('./meetupController');

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
 *
 * "Ngày" luôn theo giờ Việt Nam (vnDay). Mọi thay đổi ghi bằng cập nhật có điều kiện, không lưu đè cả hồ sơ.
 */
const DAILY_CHECKIN_COIN = 10;
const STREAK_BONUS_3 = 5;
const STREAK_BONUS_7 = 15;
const VENUE_CHECKIN_COIN = 20;
const MAX_VENUE_CHECKINS_PER_DAY = 2;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày điểm danh gần nhất (giờ VN); tài khoản cũ chỉ có lastDailyCheckin */
const lastCheckinDayOf = (profile = {}) =>
  profile.lastCheckinDay || (profile.lastDailyCheckin ? vnDay(profile.lastDailyCheckin) : null);

/** Ngày hôm qua theo giờ VN */
const vnYesterday = () => vnDay(Date.now() - DAY_MS);

/** Lượt check-in quán hôm nay (giờ VN); bản ghi cũ chưa có `day` thì suy ra từ `date` */
const todayVenueCheckins = (profile = {}) => {
  const today = vnDay();
  return (profile.venueCheckinsToday || []).filter((vc) => (vc.day || (vc.date ? vnDay(vc.date) : null)) === today);
};

// GET /api/coins/status — trạng thái coin + lịch sử check-in
const getCoinStatus = catchAsync(async (req, res) => {
  const user = await User.findById(req.user._id);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const profile = user.studentProfile || {};
  const today = vnDay();
  const lastDay = lastCheckinDayOf(profile);
  const canCheckinToday = lastDay !== today;

  // Streak còn hiệu lực nếu lần điểm danh gần nhất là hôm nay hoặc hôm qua
  const streak = profile.checkinStreak || 0;
  const currentStreak = lastDay === today || lastDay === vnYesterday() ? streak : 0;

  res.status(200).json({
    success: true,
    data: {
      uniCoin: profile.uniCoin || 0,
      canCheckinToday,
      currentStreak,
      nextStreakBonus: currentStreak >= 7 ? 'Streak 7 ngày! +15 bonus' : currentStreak >= 3 ? 'Streak 3 ngày! +5 bonus' : null,
      earnedToday: getEarnedToday(profile),
      maxDailyEarn: MAX_DAILY_EARN,
      venueCheckinsToday: todayVenueCheckins(profile).length,
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

  const today = vnDay();
  const lastDay = lastCheckinDayOf(user.studentProfile);
  if (lastDay === today) {
    throw new ApiError(400, 'Bạn đã điểm danh hôm nay rồi! Quay lại vào ngày mai nhé 🌅');
  }
  if (getEarnedToday(user.studentProfile) >= MAX_DAILY_EARN) {
    throw new ApiError(400, `Bạn đã đạt giới hạn ${MAX_DAILY_EARN} UniCoin kiếm mỗi ngày!`);
  }

  const prevStreak = user.studentProfile?.checkinStreak || 0;
  const newStreak = lastDay === vnYesterday() ? prevStreak + 1 : 1;

  // Đánh dấu đã điểm danh hôm nay (có điều kiện): 2 request cùng lúc chỉ 1 cái qua được
  const marked = await User.updateOne(
    { _id: user._id, 'studentProfile.lastCheckinDay': { $ne: today } },
    {
      $set: {
        'studentProfile.lastCheckinDay': today,
        'studentProfile.lastDailyCheckin': new Date(),
        'studentProfile.checkinStreak': newStreak,
      },
    }
  );
  if (marked.modifiedCount === 0) {
    throw new ApiError(400, 'Bạn đã điểm danh hôm nay rồi! Quay lại vào ngày mai nhé 🌅');
  }

  let coinPlanned = DAILY_CHECKIN_COIN;
  let bonusReason = '';
  if (newStreak === 3 || (newStreak > 3 && newStreak % 3 === 0 && newStreak < 7)) {
    coinPlanned += STREAK_BONUS_3;
    bonusReason = `+${STREAK_BONUS_3} streak ${newStreak} ngày liên tiếp 🔥`;
  }
  if (newStreak === 7 || (newStreak > 7 && newStreak % 7 === 0)) {
    coinPlanned += STREAK_BONUS_7;
    bonusReason = `+${STREAK_BONUS_7} streak ${newStreak} ngày liên tiếp 🔥🔥`;
  }

  const coinEarned = await earnCoins(user._id, coinPlanned, {
    type: 'daily_checkin',
    description: `Điểm danh ngày ${newStreak}${bonusReason ? ` — ${bonusReason}` : ''}`,
  });
  const fresh = await User.findById(user._id).select('studentProfile.uniCoin');

  res.status(200).json({
    success: true,
    message: `✅ Điểm danh thành công! +${coinEarned} UniCoin${bonusReason ? ` (${bonusReason})` : ''}`,
    data: {
      coinEarned,
      bonusReason,
      newStreak,
      uniCoin: fresh?.studentProfile?.uniCoin ?? 0,
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

  const venue = await Venue.findById(parsedQr.venueId).select('+checkinSecret name location status partnerId');
  if (!venue || !(await isVenueVisible(venue._id))) throw new ApiError(404, 'Không tìm thấy quán cafe này');
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
  const venueName = venue.name || 'Quán cafe';
  const today = vnDay();

  // Ghi lượt check-in có điều kiện: chưa check-in quán này hôm nay và chưa đủ số quán trong ngày.
  // Vẫn ghi lượt dù đã chạm giới hạn coin ngày (để tính buổi hẹn cafe đã diễn ra).
  const recorded = await User.updateOne(
    {
      _id: req.user._id,
      'studentProfile.venueCheckinsToday': { $not: { $elemMatch: { venueId, day: today } } },
      $expr: {
        $lt: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ['$studentProfile.venueCheckinsToday', []] },
                cond: { $eq: ['$$this.day', today] },
              },
            },
          },
          MAX_VENUE_CHECKINS_PER_DAY,
        ],
      },
    },
    {
      $push: {
        'studentProfile.venueCheckinsToday': {
          $each: [{ venueId, venueName, date: new Date(), day: today, coinEarned: 0 }],
          $slice: -20,
        },
      },
    }
  );

  if (recorded.modifiedCount === 0) {
    const user = await User.findById(req.user._id).select('studentProfile.venueCheckinsToday');
    const todays = todayVenueCheckins(user?.studentProfile);
    if (todays.some((vc) => vc.venueId === venueId)) {
      throw new ApiError(400, 'Bạn đã check-in quán này hôm nay rồi! Mỗi quán chỉ tính 1 lần/ngày 📍');
    }
    throw new ApiError(400, `Bạn đã check-in tối đa ${MAX_VENUE_CHECKINS_PER_DAY} quán hôm nay rồi! Quay lại ngày mai nhé ☕`);
  }

  const coinEarned = await earnCoins(req.user._id, VENUE_CHECKIN_COIN, {
    type: 'venue_checkin',
    description: `Check-in tại ${venueName} ☕`,
  });
  if (coinEarned > 0) {
    await User.updateOne(
      { _id: req.user._id, 'studentProfile.venueCheckinsToday': { $elemMatch: { venueId, day: today } } },
      { $set: { 'studentProfile.venueCheckinsToday.$.coinEarned': coinEarned } }
    );
  }
  // Lịch sử đầy đủ cho số liệu của quán (lỗi ghi không ảnh hưởng sinh viên)
  await VenueCheckin.create({ venueId: venue._id, partnerId: venue.partnerId, userId: req.user._id, day: today, coinEarned }).catch(
    (err) => err.code !== 11000 && console.error('Ghi lượt check-in quán thất bại:', err.message)
  );

  // Buổi "Rủ cafe" đã chốt tại quán này: cả hai cùng check-in trong ngày → tính là đã gặp
  const meetup = await onVenueCheckin(req, req.user._id, venueId);

  const fresh = await User.findById(req.user._id).select('studentProfile.uniCoin studentProfile.venueCheckinsToday');

  res.status(200).json({
    success: true,
    message:
      coinEarned > 0
        ? `🎉 Check-in thành công tại ${venueName}! +${coinEarned} UniCoin`
        : `Check-in thành công tại ${venueName}. Hôm nay bạn đã đạt giới hạn ${MAX_DAILY_EARN} UniCoin.`,
    data: {
      coinEarned,
      uniCoin: fresh?.studentProfile?.uniCoin ?? 0,
      venueName,
      // false = quán chưa có toạ độ thật nên chưa kiểm tra được vị trí
      locationVerified: distance !== null,
      distanceMeters: distance,
      venueCheckinsToday: todayVenueCheckins(fresh?.studentProfile).length,
      meetupCompleted: Boolean(meetup),
    },
  });
});

module.exports = { getCoinStatus, dailyCheckin, venueCheckin };
