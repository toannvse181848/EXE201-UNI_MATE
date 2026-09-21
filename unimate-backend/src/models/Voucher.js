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
    quantity: {
      type: Number,
      default: 100,
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
