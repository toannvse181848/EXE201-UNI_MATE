const mongoose = require('mongoose');

/**
 * Review — đánh giá của khách cho một đơn mua gói đã thanh toán (G3.4 bảng chấm OC3).
 * Chỉ chính người mua đơn đó mới đánh giá được; mỗi đơn một đánh giá, sửa lại thì ghi đè.
 */
const reviewSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true,
    },
    // Lưu kèm mã đơn để đối chiếu nhanh với sao kê và file xuất
    orderCode: { type: String, required: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, required: true, trim: true, maxlength: 1000 },
  },
  { timestamps: true }
);

reviewSchema.index({ userId: 1 });
reviewSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
