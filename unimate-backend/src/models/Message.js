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
      enum: ['text', 'image', 'video', 'file', 'venue', 'meetup'],
      default: 'text',
    },
    // Thẻ "Rủ cafe" (type = 'meetup'): bản chụp lời mời, trạng thái được cập nhật khi trả lời / chốt
    meetup: {
      meetupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meetup' },
      proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
      venueName: { type: String },
      venueAddress: { type: String },
      venueImage: { type: String },
      scheduledAt: { type: Date },
      status: { type: String },
      // Tên ưu đãi hẹn cafe của quán (lúc mời: ưu đãi sẽ nhận; khi chốt: ưu đãi đã vào ví)
      rewardTitle: { type: String },
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
