const crypto = require('crypto');
const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');
const VoucherCode = require('../models/VoucherCode');
const { describeVoucherValue } = require('./voucherFormat');
const Venue = require('../models/Venue');
const { visibleVenueFilter } = require('./visibility');

/** Voucher còn lượt để phát: mã riêng thì còn mã trống, mã chung thì chưa dùng hết số lượng */
const hasStock = async (voucher) => {
  if (voucher.codeType === 'unique') {
    return Boolean(await VoucherCode.exists({ voucherId: voucher._id, userId: null }));
  }
  return voucher.isUnlimited || voucher.usedCount < voucher.quantity;
};

/**
 * Ưu đãi hẹn cafe đang chạy của từng quán (mới nhất, còn hạn, còn lượt).
 * @returns Map<venueId string, Voucher>
 */
const findMeetupRewards = async (venueIds) => {
  if (!venueIds.length) return new Map();
  const visibleIds = await Venue.find(await visibleVenueFilter({ _id: { $in: venueIds } })).distinct('_id');
  const vouchers = await Voucher.find({
    venueId: { $in: visibleIds },
    meetupReward: true,
    isActive: true,
    validUntil: { $gte: new Date() },
  }).sort({ createdAt: -1 });

  const rewards = new Map();
  for (const voucher of vouchers) {
    const key = String(voucher.venueId);
    if (!rewards.has(key) && (await hasStock(voucher))) rewards.set(key, voucher);
  }
  return rewards;
};

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
  } else if (!voucher.isUnlimited && voucher.usedCount >= voucher.quantity) {
    return null;
  }

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
      userVoucher = await UserVoucher.findOneAndUpdate({ userId, voucherId: voucher._id }, { meetupId }, { returnDocument: 'after' });
    }
  }

  if (reservedCode) {
    await VoucherCode.updateOne({ _id: reservedCode._id }, { userVoucherId: userVoucher._id });
  }
  return userVoucher;
};

module.exports = { hasStock, findMeetupRewards, toRewardSummary, grantMeetupVoucher };
