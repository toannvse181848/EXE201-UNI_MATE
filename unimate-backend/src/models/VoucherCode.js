const mongoose = require('mongoose');

/**
 * VoucherCode — từng mã riêng trong voucher loại "unique" (quán đưa danh sách mã, mỗi mã dùng 1 lần).
 * Khi sinh viên nhận voucher, hệ thống gán 1 mã còn trống cho sinh viên đó.
 */
const voucherCodeSchema = new mongoose.Schema(
  {
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    // null = mã còn trống, chưa phát cho ai
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    userVoucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'UserVoucher',
      default: null,
    },
    assignedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

voucherCodeSchema.index({ voucherId: 1, userId: 1 });

module.exports = mongoose.model('VoucherCode', voucherCodeSchema);
