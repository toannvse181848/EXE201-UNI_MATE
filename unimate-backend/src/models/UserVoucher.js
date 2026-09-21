const mongoose = require('mongoose');

/**
 * UserVoucher — "Ví voucher" của sinh viên
 * Khi sinh viên claim một voucher, một bản ghi UserVoucher được tạo.
 * Partner dùng redeemVoucher để đối soát → status chuyển sang 'used'.
 */
const userVoucherSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    status: {
      type: String,
      enum: ['saved', 'used', 'expired'],
      default: 'saved',
    },
    claimedAt: {
      type: Date,
      default: Date.now,
    },
    usedAt: {
      type: Date,
      default: null,
    },
    // QR code payload để partner quét đối soát
    qrPayload: {
      type: String,
      unique: true,
      sparse: true,
    },
  },
  { timestamps: true }
);

// Một user chỉ có thể claim cùng một voucher 1 lần
userVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });

module.exports = mongoose.model('UserVoucher', userVoucherSchema);
