const UserVoucher = require('../models/UserVoucher');
const VoucherCode = require('../models/VoucherCode');
const { releaseSharedSlot } = require('./voucherStock');

/**
 * Voucher trong ví quá hạn giữ (holdUntil, xem config/wallet.js): chuyển sang 'expired' rồi trả lượt / mã cho quán.
 * Cập nhật có điều kiện nên mỗi voucher chỉ trả lượt một lần, kể cả khi việc định kỳ và lúc mở ví chạy cùng lúc,
 * và không đụng tới voucher vừa được quét (đã là 'used').
 * @returns true nếu voucher vừa hết hạn ở lần gọi này
 */
const expireHold = async (userVoucherId) => {
  const doc = await UserVoucher.findOneAndUpdate(
    { _id: userVoucherId, status: 'saved', holdUntil: { $ne: null, $lt: new Date() } },
    { status: 'expired' }
  );
  if (!doc) return false;
  if (doc.assignedCode) {
    await VoucherCode.updateOne(
      { voucherId: doc.voucherId, code: doc.assignedCode, userVoucherId: doc._id },
      { userId: null, userVoucherId: null, assignedAt: null }
    );
  } else {
    await releaseSharedSlot({ _id: doc.voucherId });
  }
  return true;
};

const isHoldOverdue = (userVoucher, now = new Date()) =>
  userVoucher?.status === 'saved' && Boolean(userVoucher.holdUntil) && new Date(userVoucher.holdUntil) < now;

/** Việc định kỳ: trả lượt cho mọi voucher quá hạn giữ */
const expireOverdueHolds = async () => {
  const ids = await UserVoucher.find({ status: 'saved', holdUntil: { $ne: null, $lt: new Date() } }).distinct('_id');
  let expired = 0;
  for (const id of ids) {
    if (await expireHold(id)) expired += 1;
  }
  return expired;
};

module.exports = { expireHold, isHoldOverdue, expireOverdueHolds };
