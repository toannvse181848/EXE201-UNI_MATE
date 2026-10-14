const mongoose = require('mongoose');

const voucherSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Mã voucher là bắt buộc'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    title: {
      type: String,
      required: [true, 'Tiêu đề voucher là bắt buộc'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    discountPercent: {
      type: Number,
      default: 20,
      min: 0,
      max: 100,
    },
    discountAmount: {
      type: Number,
      default: 0,
    },
    minBill: {
      type: Number,
      default: 0,
    },
    venueId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Cần chỉ định địa điểm áp dụng voucher'],
    },
    partnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /**
     * Cách quán phát mã:
     * - shared: 1 mã chung (field code) dùng nhiều lượt, giới hạn bởi quantity hoặc không giới hạn
     * - unique: danh sách mã riêng (collection VoucherCode), mỗi sinh viên nhận 1 mã, dùng 1 lần.
     *   Khi đó field code chỉ là mã chiến dịch nội bộ, quantity = tổng số mã riêng đã nạp.
     */
    codeType: {
      type: String,
      enum: ['shared', 'unique'],
      default: 'shared',
    },
    // Chỉ áp dụng cho mã chung: true = không giới hạn số lượt dùng
    isUnlimited: {
      type: Boolean,
      default: false,
    },
    quantity: {
      type: Number,
      default: 100,
      min: 0,
    },
    // Giá đổi bằng UniCoin khi sinh viên nhận voucher (0 = miễn phí)
    coinCost: {
      type: Number,
      default: 0,
      min: 0,
    },
    usedCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    validUntil: {
      type: Date,
      required: [true, 'Hạn sử dụng là bắt buộc'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    terms: [{ type: String }],
  },
  { timestamps: true }
);

module.exports = mongoose.model('Voucher', voucherSchema);
