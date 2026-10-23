const mongoose = require('mongoose');

/**
 * VenueCheckin — mỗi lượt sinh viên quét QR check-in dán tại quán (tối đa 1 lượt / quán / ngày).
 * Hồ sơ sinh viên chỉ giữ vài lượt gần nhất để chống trùng; bảng này giữ đủ lịch sử cho số liệu của quán.
 */
const venueCheckinSchema = new mongoose.Schema(
  {
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    partnerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    // Ngày theo giờ Việt Nam, dạng 2026-10-23
    day: { type: String, required: true },
    coinEarned: { type: Number, default: 0 },
  },
  { timestamps: true }
);

venueCheckinSchema.index({ venueId: 1, userId: 1, day: 1 }, { unique: true });
venueCheckinSchema.index({ partnerId: 1, createdAt: -1 });

module.exports = mongoose.model('VenueCheckin', venueCheckinSchema);
