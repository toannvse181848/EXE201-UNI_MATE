/**
 * Giới hạn lượt dùng mỗi ngày của một voucher (voucher.dailyLimit, 0 = không giới hạn).
 *
 * Lượt của một ngày (giờ Việt Nam) = lượt đã quét tại quầy trong ngày đó
 * + ưu đãi hẹn cafe đang giữ chỗ cho buổi hẹn đặt giờ trong ngày đó (chưa dùng).
 * - Chốt hẹn: chỉ tặng ưu đãi khi ngày hẹn còn đủ chỗ cho mọi người, nên bạn đã được giữ chỗ tới quầy không bị chặn.
 * - Hẹn không đặt giờ thì không giữ chỗ trước, tới quầy mà quán hết lượt hôm nay thì phải dùng vào hôm khác.
 */
const Redemption = require('../models/Redemption');
const UserVoucher = require('../models/UserVoucher');
const Meetup = require('../models/Meetup');

const DAY_MS = 24 * 60 * 60 * 1000;
const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Đầu và cuối ngày giờ Việt Nam chứa thời điểm `time` */
const vnDayRange = (time = Date.now()) => {
  const start = Math.floor((new Date(time).getTime() + VN_OFFSET_MS) / DAY_MS) * DAY_MS - VN_OFFSET_MS;
  return { $gte: new Date(start), $lt: new Date(start + DAY_MS) };
};

/** Buổi hẹn còn hiệu lực tại quán, đặt giờ trong ngày chứa `time` */
const meetupsOnDay = (voucher, time) =>
  Meetup.find({
    venueId: voucher.venueId?._id || voucher.venueId,
    scheduledAt: vnDayRange(time),
    status: { $in: ['proposed', 'accepted', 'completed'] },
  }).distinct('_id');

/** Số lượt đã dùng + đã giữ chỗ trong ngày. excludeIds: voucher trong ví đang được chuyển sang buổi hẹn khác */
const countDailyUsage = async (voucher, time = Date.now(), excludeIds = []) => {
  const [redeemed, meetupIds] = await Promise.all([
    Redemption.countDocuments({ voucherId: voucher._id, createdAt: vnDayRange(time) }),
    meetupsOnDay(voucher, time),
  ]);
  const booked = meetupIds.length
    ? await UserVoucher.countDocuments({
        voucherId: voucher._id,
        status: 'saved',
        meetupId: { $in: meetupIds },
        _id: { $nin: excludeIds.filter(Boolean) },
      })
    : 0;
  return redeemed + booked;
};

/** Số lượt còn lại trong ngày, null = không giới hạn */
const dailyRemaining = async (voucher, time = Date.now(), excludeIds = []) => {
  const limit = Number(voucher.dailyLimit) || 0;
  if (limit <= 0) return null;
  return Math.max(0, limit - (await countDailyUsage(voucher, time, excludeIds)));
};

/** Ngày chứa `time` còn đủ `need` lượt không */
const hasDailyRoom = async (voucher, time, need = 1, excludeIds = []) => {
  const remaining = await dailyRemaining(voucher, time, excludeIds);
  return remaining === null || remaining >= need;
};

/** Voucher trong ví đã được giữ chỗ cho hôm nay (buổi hẹn đặt giờ hôm nay) nên đã nằm trong số lượt của ngày */
const isBookedToday = async (userVoucher) => {
  if (!userVoucher?.meetupId || userVoucher.status !== 'saved') return false;
  return Boolean(await Meetup.exists({ _id: userVoucher.meetupId, scheduledAt: vnDayRange() }));
};

module.exports = { vnDayRange, countDailyUsage, dailyRemaining, hasDailyRoom, isBookedToday };
