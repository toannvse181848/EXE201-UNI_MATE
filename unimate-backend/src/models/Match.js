const mongoose = require('mongoose');

const matchSchema = new mongoose.Schema(
  {
    user1: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user2: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    user1Action: {
      type: String,
      enum: ['like', 'pass'],
      required: true,
    },
    user2Action: {
      type: String,
      enum: ['like', 'pass', 'pending'],
      default: 'pending',
    },
    status: {
      type: String,
      // blocked: một bên đã chặn bên kia → ẩn khỏi khám phá, khoá chat và rủ cafe cả hai chiều
      enum: ['pending', 'matched', 'passed', 'blocked'],
      default: 'pending',
    },
    matchedAt: {
      type: Date,
      default: null,
    },
    // Người đã chặn (khi status = blocked); chỉ người này bỏ chặn được
    blockedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    // Người đã huỷ kết bạn (status matched → passed)
    unmatchedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    proposedVenue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      default: null,
    },
  },
  { timestamps: true }
);

// Tránh duplicate cặp ghép đôi
matchSchema.index({ user1: 1, user2: 1 }, { unique: true });

module.exports = mongoose.model('Match', matchSchema);
