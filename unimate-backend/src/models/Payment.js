const mongoose = require('mongoose');

/**
 * Payment — mọi giao dịch tiền vào SePay báo về, kể cả giao dịch không khớp đơn nào.
 * Trước đây giao dịch không khớp (sai nội dung, đơn đã huỷ, chuyển thiếu) chỉ bị bỏ qua:
 * người mua đã trả tiền mà không có gói, cũng không còn dấu vết để admin đối soát.
 */
const paymentSchema = new mongoose.Schema(
  {
    // Mã giao dịch SePay, để webhook gửi lại không ghi trùng
    sepayId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true },
    content: { type: String, default: '' },
    referenceCode: { type: String, default: null },
    transactionDate: { type: String, default: null },
    // Mã đơn tìm được trong nội dung chuyển khoản (có thể không có)
    orderCode: { type: String, default: null },
    /**
     * matched: đã kích hoạt gói cho đơn
     * underpaid: chuyển thiếu tiền
     * unmatched: không có mã đơn / mã đơn không tồn tại
     * order_closed: đơn đã thanh toán hoặc đã bị huỷ tay
     * resolved: admin đã xử lý tay (gán vào đơn hoặc đánh dấu đã hoàn tiền)
     */
    status: {
      type: String,
      enum: ['matched', 'underpaid', 'unmatched', 'order_closed', 'resolved'],
      required: true,
    },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Payment', paymentSchema);
