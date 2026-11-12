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
    // Các lượt của cùng một lần bấm xác nhận (VD: cả nhóm hẹn cafe) có chung batchId, huỷ lượt là huỷ cả lần đó
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    // UniCoin sinh viên thực nhận vì dùng voucher ở lượt này, để trừ lại khi huỷ lượt
    coinAwarded: {
      type: Number,
      default: 0,
    },
    // Chỉ ghi ở lượt đầu tiên của lần xác nhận: buổi hẹn được ghi nhận nhờ lần này và thưởng hẹn cafe đã cộng
    meetupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meetup',
      default: null,
    },
    completedMeetup: {
      type: Boolean,
      default: false,
    },
    meetupCoins: [
      {
        _id: false,
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        coin: Number,
      },
    ],
  },
  { timestamps: true }
);

redemptionSchema.index({ partnerId: 1, createdAt: -1 });
redemptionSchema.index({ voucherId: 1, createdAt: -1 });
redemptionSchema.index({ batchId: 1 });

module.exports = mongoose.model('Redemption', redemptionSchema);
