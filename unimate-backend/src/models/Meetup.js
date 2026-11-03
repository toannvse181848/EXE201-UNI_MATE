const mongoose = require('mongoose');

/**
 * Meetup — một lời "Rủ cafe" giữa 2 sinh viên đã kết bạn, hoặc của cả một nhóm chat.
 * proposed → (người được mời) accepted | declined; người mời có thể cancelled;
 * accepted → completed khi quán đã quét ưu đãi hẹn của cả hai;
 * accepted → cancelled | no_show thì ưu đãi chưa dùng bị thu hồi khỏi ví.
 * Nhóm: proposed → accepted khi có người bấm Tham gia, không còn ai tham gia thì quay về proposed;
 * accepted → completed khi quán quét ưu đãi của từ 2 người trở lên.
 */
const meetupSchema = new mongoose.Schema(
  {
    // Rủ 2 người: có matchId và invitee. Rủ cả nhóm: có groupId và participants.
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match', required() { return !this.groupId; } },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'GroupChat', default: null },
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue', required: true },
    proposedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invitee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required() { return !this.groupId; } },
    // Nhóm: những người đã bấm Tham gia (gồm cả người rủ)
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Những người đã nhận thưởng hẹn cafe của buổi này (mỗi người chỉ nhận 1 lần)
    rewardedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    // Thời gian hẹn (không bắt buộc)
    scheduledAt: { type: Date, default: null },
    status: {
      type: String,
      // expired: lời mời không được trả lời kịp; no_show: đã chốt nhưng quá giờ hẹn chưa thấy tới quán
      enum: ['proposed', 'accepted', 'declined', 'cancelled', 'completed', 'expired', 'no_show'],
      default: 'proposed',
    },
    // Ưu đãi hẹn cafe của quán đã tặng cho cả hai khi chốt hẹn (null = quán chưa có ưu đãi)
    rewardVoucherId: { type: mongoose.Schema.Types.ObjectId, ref: 'Voucher', default: null },
    // Tin nhắn thẻ "Rủ cafe" trong hội thoại, cập nhật theo trạng thái
    messageId: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    respondedAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

meetupSchema.index({ proposedBy: 1, createdAt: -1 });
meetupSchema.index({ matchId: 1, status: 1 });
meetupSchema.index({ venueId: 1, status: 1 });
meetupSchema.index({ groupId: 1, status: 1 });
meetupSchema.index({ participants: 1, status: 1 });

module.exports = mongoose.model('Meetup', meetupSchema);
