const crypto = require('crypto');
const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const VoucherCode = require('../models/VoucherCode');
const { describeVoucherValue, isWithinSchedule } = require('./voucherFormat');
const Venue = require('../models/Venue');
const { visibleVenueFilter } = require('./visibility');
const { issuedOf, reserveSharedSlot, releaseSharedSlot } = require('./voucherStock');

// Mỗi buổi hẹn tặng ưu đãi cho ít nhất 2 người
const SLOTS_PER_MEETUP = 2;

/** Voucher còn đủ lượt cho một buổi hẹn: mã riêng thì đủ mã trống, mã chung thì đủ lượt chưa phát */
const hasStockForMeetup = async (voucher) => {
  if (voucher.codeType === 'unique') {
    const freeCodes = await VoucherCode.countDocuments({ voucherId: voucher._id, userId: null });
    return freeCodes >= SLOTS_PER_MEETUP;
  }
  return voucher.isUnlimited || voucher.quantity - issuedOf(voucher) >= SLOTS_PER_MEETUP;
};

/**
 * Ưu đãi hẹn cafe đang chạy của từng quán (mới nhất, còn hạn, còn đủ lượt cho 2 người).
 * Có scheduledAt thì ưu đãi phải dùng được vào đúng giờ hẹn đó (còn hạn, đúng ngày và giờ áp dụng).
 * @returns Map<venueId string, Voucher>
 */
const findMeetupRewards = async (venueIds, scheduledAt = null) => {
  if (!venueIds.length) return new Map();
  const visibleIds = await Venue.find(await visibleVenueFilter({ _id: { $in: venueIds } })).distinct('_id');
  const vouchers = await Voucher.find({
    venueId: { $in: visibleIds },
    meetupReward: true,
    isActive: true,
    validUntil: { $gte: new Date() },
  }).sort({ createdAt: -1 });

  const meetupTime = scheduledAt ? new Date(scheduledAt).getTime() : null;
  const usableAtMeetup = (voucher) =>
    meetupTime === null || (meetupTime <= voucher.validUntil.getTime() && isWithinSchedule(voucher, meetupTime));

  const rewards = new Map();
  for (const voucher of vouchers) {
    const key = String(voucher.venueId);
    if (!rewards.has(key) && usableAtMeetup(voucher) && (await hasStockForMeetup(voucher))) rewards.set(key, voucher);
  }
  return rewards;
};

/** Ưu đãi đã gắn với buổi hẹn nhóm còn chạy không (bạn tham gia sau nhận đúng ưu đãi này) */
const findRunningReward = (voucherId) => Voucher.findOne({ _id: voucherId, isActive: true, validUntil: { $gte: new Date() } });

/** Thông tin ưu đãi gửi cho client (không lộ mã voucher) */
const toRewardSummary = (voucher) =>
  voucher
    ? {
        id: voucher._id,
        title: voucher.title,
        discountPercent: voucher.discountPercent,
        discountAmount: voucher.discountAmount,
        minBill: voucher.minBill,
        validUntil: voucher.validUntil,
        ...describeVoucherValue(voucher),
      }
    : null;

/**
 * Đưa ưu đãi hẹn cafe vào ví của một sinh viên, gắn với buổi hẹn.
 * - Đang có sẵn trong ví (chưa dùng): chỉ gắn vào buổi hẹn mới.
 * - Đã dùng / hết hạn ở buổi hẹn trước: cấp lại lượt mới (lịch sử dùng vẫn nằm trong Redemption).
 * @returns UserVoucher, hoặc null nếu ưu đãi vừa hết lượt
 */
const grantMeetupVoucher = async (voucher, userId, meetupId) => {
  const existing = await UserVoucher.findOne({ userId, voucherId: voucher._id });
  if (existing && existing.status === 'saved') {
    existing.meetupId = meetupId;
    await existing.save();
    return existing;
  }

  let reservedCode = null;
  if (voucher.codeType === 'unique') {
    reservedCode = await VoucherCode.findOneAndUpdate(
      { voucherId: voucher._id, userId: null },
      { userId, assignedAt: new Date() },
      { returnDocument: 'after', sort: { _id: 1 } }
    );
    if (!reservedCode) return null;
  } else if (!(await reserveSharedSlot(voucher))) {
    return null;
  }
  const reservedSlot = voucher.codeType !== 'unique';

  const fields = {
    status: 'saved',
    claimedAt: new Date(),
    usedAt: null,
    qrPayload: `UVM-${crypto.randomBytes(8).toString('hex').toUpperCase()}`,
    assignedCode: reservedCode?.code || null,
    meetupId,
  };

  let userVoucher;
  if (existing) {
    existing.set(fields);
    userVoucher = await existing.save();
  } else {
    try {
      userVoucher = await UserVoucher.create({ userId, voucherId: voucher._id, ...fields });
    } catch (err) {
      // Hai yêu cầu chạy cùng lúc: bản kia đã tạo trước → dùng bản đó
      if (err.code !== 11000) throw err;
      if (reservedCode) {
        await VoucherCode.updateOne({ _id: reservedCode._id }, { userId: null, assignedAt: null });
        reservedCode = null;
      }
      if (reservedSlot) await releaseSharedSlot(voucher);
      userVoucher = await UserVoucher.findOneAndUpdate({ userId, voucherId: voucher._id }, { meetupId }, { returnDocument: 'after' });
    }
  }

  if (reservedCode) {
    await VoucherCode.updateOne({ _id: reservedCode._id }, { userVoucherId: userVoucher._id });
  }
  return userVoucher;
};

/**
 * Thu hồi voucher chưa dùng của một buổi hẹn (huỷ hẹn, huỷ kết bạn, không diễn ra):
 * xoá khỏi ví và trả lại lượt / mã cho quán. Voucher đã dùng giữ nguyên để đối soát.
 * Có userId thì chỉ thu hồi của người đó (rời buổi hẹn nhóm).
 * @returns số voucher đã thu hồi
 */
const revokeMeetupVouchers = async (meetupId, userId = null) => {
  const vouchers = await UserVoucher.find({ meetupId, status: 'saved', ...(userId ? { userId } : {}) }).select('_id');
  let revoked = 0;
  for (const { _id } of vouchers) {
    // Xoá có điều kiện: quán vừa quét đúng lúc này thì voucher đã là "used", không thu hồi nữa
    const removed = await UserVoucher.findOneAndDelete({ _id, status: 'saved' });
    if (!removed) continue;
    if (removed.assignedCode) {
      await VoucherCode.updateOne(
        { voucherId: removed.voucherId, code: removed.assignedCode },
        { userId: null, userVoucherId: null, assignedAt: null }
      );
    } else {
      await releaseSharedSlot({ _id: removed.voucherId });
    }
    revoked += 1;
  }
  return revoked;
};

/**
 * Tặng ưu đãi cho những người chốt buổi hẹn: đủ tất cả hoặc không ai nhận.
 * Hết lượt giữa chừng thì trả lại phần đã cấp, không để một người có voucher còn người kia không.
 * @returns true nếu tất cả đã có voucher
 */
const grantMeetupVouchers = async (voucher, userIds, meetupId) => {
  for (const userId of userIds) {
    if (!(await grantMeetupVoucher(voucher, userId, meetupId))) {
      await revokeMeetupVouchers(meetupId);
      return false;
    }
  }
  return true;
};

module.exports = { findMeetupRewards, findRunningReward, toRewardSummary, grantMeetupVoucher, grantMeetupVouchers, revokeMeetupVouchers };
