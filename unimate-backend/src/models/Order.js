const mongoose = require('mongoose');

/**
 * Order — đơn mua gói trả phí.
 * Người mua chuyển khoản với nội dung = code (VD: UM000123), admin đối chiếu sao kê rồi xác nhận.
 * Danh sách đơn được xuất Excel làm minh chứng giao dịch.
 */
const orderSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    plan: {
      type: String,
      required: true,
    },
    planName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true },
    status: {
      type: String,
      enum: ['pending', 'paid', 'cancelled'],
      default: 'pending',
    },
    paidAt: { type: Date, default: null },
    // Admin đã xác nhận nhận tiền
    confirmedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    cancelledAt: { type: Date, default: null },
    // Ghi chú của admin, VD: mã giao dịch ngân hàng
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
