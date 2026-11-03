const mongoose = require('mongoose');

const groupMessageSchema = new mongoose.Schema(
  {
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'GroupChat',
      required: true,
    },
    sender: {
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
      enum: ['text', 'image', 'video', 'file', 'system', 'meetup'],
      default: 'text',
    },
    // Thẻ "Rủ cả nhóm đi cafe" (type = 'meetup'): bản chụp lời mời, cập nhật khi có người tham gia / chốt / huỷ
    meetup: {
      meetupId: { type: mongoose.Schema.Types.ObjectId, ref: 'Meetup' },
      proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
      venueName: { type: String },
      venueAddress: { type: String },
      venueImage: { type: String },
      scheduledAt: { type: Date },
      status: { type: String },
      rewardTitle: { type: String },
      maxPeople: { type: Number },
      participants: [
        {
          _id: false,
          user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          fullName: { type: String },
        },
      ],
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
    // Danh sách user đã đọc tin nhắn này
    readBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  { timestamps: true }
);

groupMessageSchema.index({ groupId: 1, createdAt: -1 });
groupMessageSchema.index({ sender: 1 });

module.exports = mongoose.model('GroupMessage', groupMessageSchema);
