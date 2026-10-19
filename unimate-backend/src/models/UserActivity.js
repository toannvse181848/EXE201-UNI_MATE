const mongoose = require('mongoose');

/**
 * UserActivity — mỗi người dùng 1 bản ghi cho mỗi ngày có dùng UNI-MATE (web hoặc app mobile).
 * Dùng tính người dùng hoạt động theo tuần và tỷ lệ quay lại ngày 1 / ngày 7 cho báo cáo OC3.
 */
const userActivitySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Ngày theo giờ Việt Nam, dạng 2026-10-19
    day: {
      type: String,
      required: true,
    },
    platforms: [{ type: String, enum: ['web', 'mobile'] }],
  },
  { timestamps: true }
);

userActivitySchema.index({ userId: 1, day: 1 }, { unique: true });
userActivitySchema.index({ day: 1 });

module.exports = mongoose.model('UserActivity', userActivitySchema);
