const mongoose = require('mongoose');

/**
 * Setting — cấu hình nhỏ do admin nhập tay, lưu theo key.
 * VD: key "oc3" lưu chi phí, lượt tiếp cận, lượt nhấp của từng kênh truyền thông.
 */
const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, default: {} },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Setting', settingSchema);
