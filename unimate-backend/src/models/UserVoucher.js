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
    // Mã riêng được gán cho sinh viên (chỉ có với voucher loại "unique")
    assignedCode: {
      type: String,
      default: null,
    },
    // Hạn giữ trong ví của voucher miễn phí tự lưu (xem config/wallet.js). Quá hạn chưa dùng thì trả lượt cho quán.
    // null = không giới hạn: voucher đổi UniCoin, ưu đãi hẹn cafe (theo buổi hẹn), voucher lưu trước khi có luật này
    holdUntil: {
      type: Date,
      default: null,
    },
    // Nhận qua buổi "Rủ cafe" nào (null = tự lưu từ danh sách voucher)
    meetupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meetup',
      default: null,
    },
  },
  { timestamps: true }
);

// Một user chỉ có thể claim cùng một voucher 1 lần
userVoucherSchema.index({ userId: 1, voucherId: 1 }, { unique: true });
userVoucherSchema.index({ status: 1, holdUntil: 1 });

module.exports = mongoose.model('UserVoucher', userVoucherSchema);
