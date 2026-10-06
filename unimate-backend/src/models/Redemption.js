const mongoose = require('mongoose');

/**
 * Redemption — mỗi lượt partner áp dụng voucher tại quầy (check-in).
 * Dùng cho lịch sử check-in của partner và thống kê của admin.
 */
const redemptionSchema = new mongoose.Schema(
  {
    voucherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Voucher',
      required: true,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Người thao tác áp voucher (partner hoặc admin)
    redeemedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Sinh viên sở hữu voucher — chỉ có khi quét QR từ ví (null nếu nhập mã chung)
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
    method: {
      type: String,
      enum: ['qr', 'code'],
      required: true,
    },
  },
  { timestamps: true }
);

redemptionSchema.index({ partnerId: 1, createdAt: -1 });

module.exports = mongoose.model('Redemption', redemptionSchema);
