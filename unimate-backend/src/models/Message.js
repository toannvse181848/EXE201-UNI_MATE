const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    receiver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      trim: true,
      default: '',
    },
    type: {
      type: String,
      enum: ['text', 'image', 'video', 'file', 'venue'],
      default: 'text',
    },
    // Thẻ gợi ý quán (type = 'venue'): lưu bản chụp thông tin quán lúc gửi
    venue: {
      venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
      name: { type: String },
      address: { type: String },
      image: { type: String },
    },
    fileUrl: {
      type: String,
      default: null,
    },
    fileName: {
      type: String,
      default: null,
    },
    fileSize: {
      type: Number,
      default: null,
    },
    fileMimeType: {
      type: String,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

messageSchema.index({ sender: 1, receiver: 1 });
messageSchema.index({ matchId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
