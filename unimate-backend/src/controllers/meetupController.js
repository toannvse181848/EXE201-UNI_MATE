const Meetup = require('../models/Meetup');
const Match = require('../models/Match');
const Message = require('../models/Message');
const { findVisibleVenue } = require('../utils/visibility');
const User = require('../models/User');
const UserVoucher = require('../models/UserVoucher');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { isPremiumActive } = require('../utils/subscription');
const { earnCoins, vnDay } = require('../utils/coinService');
const { findMeetupRewards, grantMeetupVoucher, toRewardSummary } = require('../utils/meetupRewards');
const { FREE_INVITES_PER_WEEK, INVITE_WINDOW_DAYS, MEETUP_COMPLETE_COIN } = require('../config/meetup');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Số lời mời còn lại trong 7 ngày (Premium: không giới hạn). Lời mời đã huỷ / hết hạn được trả lại lượt. */
const getQuotaFor = async (user) => {
  if (isPremiumActive(user.studentProfile)) {
    return { isPremium: true, limit: null, used: null, remaining: null };
  }
  const used = await Meetup.countDocuments({
    proposedBy: user._id,
    status: { $nin: ['cancelled', 'expired'] },
    createdAt: { $gte: new Date(Date.now() - INVITE_WINDOW_DAYS * DAY_MS) },
  });
  return { isPremium: false, limit: FREE_INVITES_PER_WEEK, used, remaining: Math.max(0, FREE_INVITES_PER_WEEK - used) };
};

const findMatchFor = async (matchId, userId) => {
  const match = matchId ? await Match.findById(matchId).catch(() => null) : null;
  if (!match || match.status !== 'matched') throw new ApiError(404, 'Hai bạn cần kết bạn trước khi rủ đi cafe');
  const isUser1 = String(match.user1) === String(userId);
  if (!isUser1 && String(match.user2) !== String(userId)) throw new ApiError(403, 'Bạn không thuộc hội thoại này');
  return { match, buddyId: isUser1 ? match.user2 : match.user1 };
};

/** Cập nhật thẻ "Rủ cafe" trong hội thoại theo trạng thái mới của buổi hẹn */
const syncMeetupMessage = async (req, meetup, fields) => {
  if (!meetup.messageId) return null;
  const $set = {};
  for (const [key, value] of Object.entries(fields)) $set[`meetup.${key}`] = value;
  const message = await Message.findByIdAndUpdate(meetup.messageId, { $set }, { returnDocument: 'after' }).populate(
    'sender',
    'fullName avatar'
  );
  const io = req?.app?.get('io');
  if (io && message) io.to(String(meetup.matchId)).emit('message_updated', message);
  return message;
};

// GET /api/meetups/quota
const getQuota = catchAsync(async (req, res) => {
  res.status(200).json({ success: true, data: await getQuotaFor(req.user) });
});

// POST /api/meetups — { matchId, venueId, scheduledAt? }
const createMeetup = catchAsync(async (req, res) => {
  const me = req.user._id;
  const { match, buddyId } = await findMatchFor(req.body.matchId, me);

  const venue = await findVisibleVenue(req.body.venueId);
  if (!venue) throw new ApiError(404, 'Không tìm thấy quán');

  let scheduledAt = null;
  if (req.body.scheduledAt) {
    scheduledAt = new Date(req.body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) throw new ApiError(400, 'Thời gian hẹn không hợp lệ');
    if (scheduledAt.getTime() < Date.now() - 60 * 60 * 1000) throw new ApiError(400, 'Thời gian hẹn đã qua');
  }

  // Lời mời cũ chưa ai trả lời trong hội thoại này sẽ được thay bằng lời mời mới.
  // Lời mời cũ của chính mình bị huỷ thì được trả lượt, nên đổi quán không tốn thêm lượt.
  const pending = await Meetup.find({ matchId: match._id, status: 'proposed' });
  const replacingOwn = pending.filter((m) => String(m.proposedBy) === String(me)).length;
  const quota = await getQuotaFor(req.user);
  if (!quota.isPremium && quota.remaining + replacingOwn <= 0) {
    throw new ApiError(
      403,
      `Tài khoản miễn phí được rủ cafe ${FREE_INVITES_PER_WEEK} lần mỗi ${INVITE_WINDOW_DAYS} ngày. Nâng cấp Premium để rủ không giới hạn nhé!`,
      'MEETUP_QUOTA'
    );
  }

  for (const old of pending) {
    old.status = 'cancelled';
    await old.save();
    await syncMeetupMessage(req, old, { status: 'cancelled' });
  }

  const reward = (await findMeetupRewards([venue._id])).get(String(venue._id)) || null;
  const meetup = await Meetup.create({
    matchId: match._id,
    venueId: venue._id,
    proposedBy: me,
    invitee: buddyId,
    scheduledAt,
  });

  const message = await Message.create({
    matchId: match._id,
    sender: me,
    receiver: buddyId,
    type: 'meetup',
    // Chữ dự phòng cho bản xem trước hội thoại
    text: `☕ Rủ đi cafe: ${venue.name}`,
    meetup: {
      meetupId: meetup._id,
      proposedBy: me,
      venueId: venue._id,
      venueName: venue.name,
      venueAddress: venue.address,
      venueImage: venue.images?.[0] || venue.image || null,
      scheduledAt,
      status: 'proposed',
      rewardTitle: reward?.title || null,
    },
  });
  meetup.messageId = message._id;
  await meetup.save();
  match.proposedVenue = venue._id;
  await match.save();

  const populated = await message.populate('sender', 'fullName avatar');
  const io = req.app.get('io');
  if (io) io.to(String(match._id)).emit('new_message', populated);

  res.status(201).json({
    success: true,
    message: 'Đã gửi lời mời đi cafe!',
    data: { meetup, message: populated, reward: toRewardSummary(reward), quota: await getQuotaFor(req.user) },
  });
});

// POST /api/meetups/:id/respond — { action: 'accept' | 'decline' }
const respondMeetup = catchAsync(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) throw new ApiError(400, 'Hành động không hợp lệ');
  const accept = action === 'accept';

  // Cập nhật có điều kiện: chỉ người được mời, chỉ khi lời mời còn chờ (bấm 2 lần không cấp voucher 2 lần)
  const meetup = await Meetup.findOneAndUpdate(
    { _id: req.params.id, invitee: req.user._id, status: 'proposed' },
    { status: accept ? 'accepted' : 'declined', respondedAt: new Date() },
    { returnDocument: 'after' }
  ).catch(() => null);
  if (!meetup) {
    const existing = await Meetup.findById(req.params.id).catch(() => null);
    if (!existing) throw new ApiError(404, 'Không tìm thấy lời mời');
    if (String(existing.invitee) !== String(req.user._id)) throw new ApiError(403, 'Chỉ người được mời mới trả lời được');
    throw new ApiError(400, 'Lời mời này đã được trả lời hoặc đã huỷ');
  }

  let rewardGranted = 0;
  let rewardTitle = null;
  if (accept) {
    const reward = (await findMeetupRewards([meetup.venueId])).get(String(meetup.venueId));
    if (reward) {
      for (const userId of [meetup.proposedBy, meetup.invitee]) {
        if (await grantMeetupVoucher(reward, userId, meetup._id)) rewardGranted += 1;
      }
      if (rewardGranted > 0) {
        meetup.rewardVoucherId = reward._id;
        rewardTitle = reward.title;
        await meetup.save();
      }
    }
  }

  const message = await syncMeetupMessage(req, meetup, {
    status: meetup.status,
    ...(accept ? { rewardTitle } : {}),
  });

  res.status(200).json({
    success: true,
    message: accept
      ? rewardGranted > 0
        ? `Đã chốt hẹn! Ưu đãi "${rewardTitle}" đã vào ví voucher của cả hai.`
        : 'Đã chốt hẹn!'
      : 'Đã từ chối lời mời',
    data: { meetup, message, rewardGranted },
  });
});

// POST /api/meetups/:id/cancel — người mời huỷ lời mời đang chờ; buổi đã chốt thì ai trong 2 người cũng huỷ được
const cancelMeetup = catchAsync(async (req, res) => {
  const me = String(req.user._id);
  const meetup = await Meetup.findById(req.params.id).catch(() => null);
  if (!meetup) throw new ApiError(404, 'Không tìm thấy lời mời');
  const isProposer = String(meetup.proposedBy) === me;
  const isInvitee = String(meetup.invitee) === me;
  if (!isProposer && !isInvitee) throw new ApiError(403, 'Bạn không thuộc buổi hẹn này');

  const canCancel = (meetup.status === 'proposed' && isProposer) || meetup.status === 'accepted';
  if (!canCancel) throw new ApiError(400, 'Không thể huỷ buổi hẹn ở trạng thái này');

  const updated = await Meetup.findOneAndUpdate(
    { _id: meetup._id, status: meetup.status },
    { status: 'cancelled' },
    { returnDocument: 'after' }
  );
  if (!updated) throw new ApiError(400, 'Buổi hẹn vừa thay đổi trạng thái, vui lòng tải lại');

  const message = await syncMeetupMessage(req, updated, { status: 'cancelled' });
  res.status(200).json({ success: true, message: 'Đã huỷ buổi hẹn', data: { meetup: updated, message } });
});

/**
 * Gọi sau khi quán quét một voucher trong ví sinh viên.
 * Voucher nhận qua buổi hẹn và cả hai người đã dùng → buổi hẹn "đã diễn ra", thưởng UniCoin cho cả hai.
 */
const onMeetupVoucherRedeemed = async (req, userVoucher) => {
  if (!userVoucher?.meetupId) return null;
  const [total, used] = await Promise.all([
    UserVoucher.countDocuments({ meetupId: userVoucher.meetupId }),
    UserVoucher.countDocuments({ meetupId: userVoucher.meetupId, status: 'used' }),
  ]);
  if (total === 0 || used < total) return null;

  return completeMeetup(req, userVoucher.meetupId);
};

/** Chuyển buổi hẹn accepted → completed (có điều kiện, chỉ 1 lần) và thưởng UniCoin cho cả hai */
const completeMeetup = async (req, meetupId) => {
  const meetup = await Meetup.findOneAndUpdate(
    { _id: meetupId, status: 'accepted' },
    { status: 'completed', completedAt: new Date() },
    { returnDocument: 'after' }
  ).populate('venueId', 'name');
  if (!meetup) return null;

  for (const userId of [meetup.proposedBy, meetup.invitee]) {
    await earnCoins(userId, MEETUP_COMPLETE_COIN, {
      type: 'meetup_complete',
      description: `Hẹn cafe thành công tại ${meetup.venueId?.name || 'quán đối tác'} 🤝`,
    });
  }

  await syncMeetupMessage(req, meetup, { status: 'completed' });
  return meetup;
};

/**
 * Gọi sau khi sinh viên check-in QR tại quán. Buổi hẹn đã chốt tại quán này mà người kia
 * cũng đã check-in quán này hôm nay → buổi hẹn "đã diễn ra". Dùng được cả khi quán không có ưu đãi hẹn cafe.
 */
const onVenueCheckin = async (req, userId, venueId) => {
  const meetups = await Meetup.find({
    venueId,
    status: 'accepted',
    $or: [{ proposedBy: userId }, { invitee: userId }],
  });
  const today = vnDay();
  for (const meetup of meetups) {
    const buddyId = String(meetup.proposedBy) === String(userId) ? meetup.invitee : meetup.proposedBy;
    const buddyCheckedIn = await User.exists({
      _id: buddyId,
      'studentProfile.venueCheckinsToday': { $elemMatch: { venueId: String(venueId), day: today } },
    });
    if (buddyCheckedIn) {
      const done = await completeMeetup(req, meetup._id);
      if (done) return done;
    }
  }
  return null;
};

module.exports = {
  getQuota,
  createMeetup,
  respondMeetup,
  cancelMeetup,
  onMeetupVoucherRedeemed,
  onVenueCheckin,
  completeMeetup,
  syncMeetupMessage,
  getQuotaFor,
};
