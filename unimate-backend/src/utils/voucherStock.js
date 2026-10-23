const Voucher = require('../models/Voucher');
const UserVoucher = require('../models/UserVoucher');

/**
 * Số lượng voucher mã chung tính theo "lượt đã phát" (issuedCount), không phải lượt đã dùng:
 * - Sinh viên lưu vào ví (hoặc nhận ưu đãi hẹn cafe) → giữ 1 lượt ngay lúc lưu.
 * - Thu ngân gõ mã chung tại quầy (không qua ví) → cũng chiếm 1 lượt.
 * - Quét QR ví chỉ tăng usedCount, không chiếm thêm lượt (đã giữ lúc lưu).
 * Trước đây lưu ví không trừ lượt và quét ví không kiểm tra số lượng, nên quán phát 100 lượt có thể bị dùng quá 100.
 */
const issuedOf = (voucher) => voucher.issuedCount ?? voucher.usedCount ?? 0;

const hasSharedStock = (voucher) => voucher.isUnlimited || issuedOf(voucher) < voucher.quantity;

/** Giữ 1 lượt (có điều kiện, an toàn khi nhiều người bấm cùng lúc). Trả về false nếu đã hết lượt. */
const reserveSharedSlot = async (voucher) => {
  if (voucher.isUnlimited) {
    await Voucher.updateOne({ _id: voucher._id }, { $inc: { issuedCount: 1 } });
    return true;
  }
  const res = await Voucher.updateOne(
    { _id: voucher._id, $expr: { $lt: ['$issuedCount', '$quantity'] } },
    { $inc: { issuedCount: 1 } }
  );
  return res.modifiedCount > 0;
};

/** Trả lại lượt đã giữ (khi lưu ví thất bại giữa chừng) */
const releaseSharedSlot = (voucher) =>
  Voucher.updateOne({ _id: voucher._id, issuedCount: { $gt: 0 } }, { $inc: { issuedCount: -1 } });

/** Voucher tạo trước khi có issuedCount: lượt đã phát = đã dùng + đang nằm trong ví chưa dùng */
const migrateIssuedCount = async () => {
  const legacy = await Voucher.find({ issuedCount: { $exists: false } }).select('usedCount');
  for (const v of legacy) {
    const saved = await UserVoucher.countDocuments({ voucherId: v._id, status: 'saved' });
    await Voucher.updateOne({ _id: v._id, issuedCount: { $exists: false } }, { issuedCount: (v.usedCount || 0) + saved });
  }
  return legacy.length;
};

module.exports = { issuedOf, hasSharedStock, reserveSharedSlot, releaseSharedSlot, migrateIssuedCount };
