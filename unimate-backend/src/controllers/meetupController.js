const Meetup = require('../models/Meetup');
const Match = require('../models/Match');
const Message = require('../models/Message');
const GroupChat = require('../models/GroupChat');
const GroupMessage = require('../models/GroupMessage');
const { findVisibleVenue } = require('../utils/visibility');
const User = require('../models/User');
const UserVoucher = require('../models/UserVoucher');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { isPremiumActive } = require('../utils/subscription');
const { earnCoins, vnDay } = require('../utils/coinService');
const {
  findMeetupRewards,
  findRunningReward,
  grantMeetupVoucher,
  grantMeetupVouchers,
  revokeMeetupVouchers,
  toRewardSummary,
} = require('../utils/meetupRewards');
const { FREE_INVITES_PER_WEEK, INVITE_WINDOW_DAYS, MEETUP_COMPLETE_COIN, GROUP_MEETUP_MAX_PEOPLE } = require('../config/meetup');

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ưu đãi hẹn cafe dùng được cho buổi hẹn: quán đang có ưu đãi còn lượt, và còn hạn tới giờ hẹn */
const findRewardFor = async (venueId, scheduledAt) => {
  const reward = (await findMeetupRewards([venueId])).get(String(venueId)) || null;
  if (reward && scheduledAt && new Date(scheduledAt) > reward.validUntil) return null;
  return reward;
};

/**
 * Mỗi người chỉ giữ 1 buổi đã chốt có ưu đãi tại một quán: ví chỉ có 1 voucher cho mỗi ưu đãi,
 * 2 buổi chồng nhau sẽ giành nhau voucher đó và ghi nhận sai buổi hẹn.
 */
const assertNoRewardClash = async (venueId, userIds, { excludeId = null, who = 'Một trong hai bạn' } = {}) => {
  const clash = await Meetup.exists({
    venueId,
    status: 'accepted',
    rewardVoucherId: { $ne: null },
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    $or: [{ proposedBy: { $in: userIds } }, { invitee: { $in: userIds } }, { participants: { $in: userIds } }],
  });
  if (clash) {
    throw new ApiError(
      400,
      `${who} đang có buổi hẹn đã chốt tại quán này. Dùng xong ưu đãi hoặc huỷ buổi đó rồi hẹn lại nhé.`,
      'MEETUP_VENUE_CLASH'
    );
  }
};

/** Giờ hẹn gửi lên (không bắt buộc) → Date hoặc null */
const parseScheduledAt = (value) => {
  if (!value) return null;
  const scheduledAt = new Date(value);
  if (Number.isNaN(scheduledAt.getTime())) throw new ApiError(400, 'Thời gian hẹn không hợp lệ');
  if (scheduledAt.getTime() < Date.now() - 60 * 60 * 1000) throw new ApiError(400, 'Thời gian hẹn đã qua');
  return scheduledAt;
};

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

/** Hết lượt mời thì báo mời nâng cấp. replacingOwn: số lời mời cũ của chính mình sắp được thay (được trả lượt) */
const assertInviteQuota = async (user, replacingOwn) => {
  const quota = await getQuotaFor(user);
  if (!quota.isPremium && quota.remaining + replacingOwn <= 0) {
    throw new ApiError(
      403,
      `Tài khoản miễn phí được rủ cafe ${FREE_INVITES_PER_WEEK} lần mỗi ${INVITE_WINDOW_DAYS} ngày. Nâng cấp Premium để rủ không giới hạn nhé!`,
      'MEETUP_QUOTA'
    );
  }
};

const findMatchFor = async (matchId, userId) => {
  const match = matchId ? await Match.findById(matchId).catch(() => null) : null;
  if (!match || match.status !== 'matched') throw new ApiError(404, 'Hai bạn cần kết bạn trước khi rủ đi cafe');
  const isUser1 = String(match.user1) === String(userId);
  if (!isUser1 && String(match.user2) !== String(userId)) throw new ApiError(403, 'Bạn không thuộc hội thoại này');
  return { match, buddyId: isUser1 ? match.user2 : match.user1 };
};

const findGroupFor = async (groupId, userId) => {
  const group = groupId ? await GroupChat.findById(groupId).catch(() => null) : null;
  if (!group || !group.isActive) throw new ApiError(404, 'Nhóm không tồn tại');
  if (!group.members.some((m) => String(m.user) === String(userId))) throw new ApiError(403, 'Bạn không phải thành viên nhóm này');
  return group;
};

/** Cập nhật thẻ "Rủ cafe" trong hội thoại (1-1 hoặc nhóm) theo trạng thái mới của buổi hẹn */
const syncMeetupMessage = async (req, meetup, fields) => {
  if (!meetup.messageId) return null;
  const $set = {};
  for (const [key, value] of Object.entries(fields)) $set[`meetup.${key}`] = value;
  const MessageModel = meetup.groupId ? GroupMessage : Message;
  const message = await MessageModel.findByIdAndUpdate(meetup.messageId, { $set }, { returnDocument: 'after' }).populate(
    'sender',
    'fullName avatar'
  );
  const io = req?.app?.get('io');
  if (io && message) {
    if (meetup.groupId) io.to(`group_${meetup.groupId}`).emit('group_message_updated', message);
    else io.to(String(meetup.matchId)).emit('message_updated', message);
  }
  return message;
};

/** Người tham gia kèm tên, để hiện trên thẻ trong chat nhóm */
const toCardParticipants = async (userIds) => {
  const users = await User.find({ _id: { $in: userIds } }).select('fullName');
  const nameOf = new Map(users.map((u) => [String(u._id), u.fullName]));
  return userIds.map((id) => ({ user: id, fullName: nameOf.get(String(id)) || 'Thành viên' }));
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

  const scheduledAt = parseScheduledAt(req.body.scheduledAt);

  const reward = await findRewardFor(venue._id, scheduledAt);
  if (reward) await assertNoRewardClash(venue._id, [me, buddyId]);

  // Lời mời cũ chưa ai trả lời trong hội thoại này sẽ được thay bằng lời mời mới.
  // Lời mời cũ của chính mình bị huỷ thì được trả lượt, nên đổi quán không tốn thêm lượt.
  const pending = await Meetup.find({ matchId: match._id, status: 'proposed' });
  await assertInviteQuota(req.user, pending.filter((m) => String(m.proposedBy) === String(me)).length);

  for (const old of pending) {
    old.status = 'cancelled';
    await old.save();
    await syncMeetupMessage(req, old, { status: 'cancelled' });
  }

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

// POST /api/meetups/group — { groupId, venueId, scheduledAt? }: rủ cả nhóm, ai muốn đi thì bấm Tham gia
const createGroupMeetup = catchAsync(async (req, res) => {
  const me = req.user._id;
  const group = await findGroupFor(req.body.groupId, me);
  if (group.members.length < 2) throw new ApiError(400, 'Nhóm cần ít nhất 2 thành viên để rủ đi cafe');

  const venue = await findVisibleVenue(req.body.venueId);
  if (!venue) throw new ApiError(404, 'Không tìm thấy quán');

  const scheduledAt = parseScheduledAt(req.body.scheduledAt);

  const reward = await findRewardFor(venue._id, scheduledAt);
  if (reward) await assertNoRewardClash(venue._id, [me], { who: 'Bạn' });

  // Lời mời cũ chưa ai tham gia của chính mình trong nhóm này được thay bằng lời mời mới (trả lại lượt)
  const pending = await Meetup.find({ groupId: group._id, proposedBy: me, status: 'proposed' });
  await assertInviteQuota(req.user, pending.length);

  for (const old of pending) {
    old.status = 'cancelled';
    await old.save();
    await syncMeetupMessage(req, old, { status: 'cancelled' });
  }

  const meetup = await Meetup.create({
    groupId: group._id,
    venueId: venue._id,
    proposedBy: me,
    participants: [me],
    scheduledAt,
  });

  const message = await GroupMessage.create({
    groupId: group._id,
    sender: me,
    type: 'meetup',
    // Chữ dự phòng cho bản xem trước hội thoại và ứng dụng cũ
    text: `☕ Rủ cả nhóm đi cafe: ${venue.name}`,
    readBy: [me],
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
      maxPeople: GROUP_MEETUP_MAX_PEOPLE,
      participants: await toCardParticipants([me]),
    },
  });
  meetup.messageId = message._id;
  await meetup.save();
  await GroupChat.findByIdAndUpdate(group._id, { lastMessage: message._id, lastMessageAt: message.createdAt });

  const populated = await message.populate('sender', 'fullName avatar');
  const io = req.app.get('io');
  if (io) io.to(`group_${group._id}`).emit('new_group_message', populated);

  res.status(201).json({
    success: true,
    message: 'Đã rủ cả nhóm đi cafe!',
    data: { meetup, message: populated, reward: toRewardSummary(reward), quota: await getQuotaFor(req.user) },
  });
});

// POST /api/meetups/:id/join — thành viên nhóm tham gia buổi hẹn nhóm; có từ 2 người là chốt hẹn
const joinMeetup = catchAsync(async (req, res) => {
  const me = req.user._id;
  const existing = await Meetup.findById(req.params.id).catch(() => null);
  if (!existing?.groupId) throw new ApiError(404, 'Không tìm thấy buổi hẹn nhóm');
  await findGroupFor(existing.groupId, me);
  if (!['proposed', 'accepted'].includes(existing.status)) throw new ApiError(400, 'Buổi hẹn này đã kết thúc hoặc đã huỷ');
  if (existing.participants.some((id) => String(id) === String(me))) throw new ApiError(400, 'Bạn đã tham gia buổi hẹn này rồi');
  if (existing.participants.length >= GROUP_MEETUP_MAX_PEOPLE) throw new ApiError(400, `Buổi hẹn này đã đủ ${GROUP_MEETUP_MAX_PEOPLE} bạn`);

  // Chưa ai có voucher thì tìm ưu đãi của quán; đã có thì bạn tham gia sau nhận đúng ưu đãi của buổi này
  const isFirstGrant = !existing.rewardVoucherId;
  const reward = isFirstGrant
    ? await findRewardFor(existing.venueId, existing.scheduledAt)
    : await findRunningReward(existing.rewardVoucherId);
  if (reward) {
    await assertNoRewardClash(existing.venueId, isFirstGrant ? [...existing.participants, me] : [me], {
      excludeId: existing._id,
      who: isFirstGrant ? 'Bạn hoặc người rủ' : 'Bạn',
    });
  }

  // Cập nhật có điều kiện: bấm 2 lần không tham gia 2 lần, nhiều người bấm cùng lúc không vượt số người tối đa
  const meetup = await Meetup.findOneAndUpdate(
    {
      _id: existing._id,
      status: { $in: ['proposed', 'accepted'] },
      participants: { $ne: me },
      [`participants.${GROUP_MEETUP_MAX_PEOPLE - 1}`]: { $exists: false },
    },
    { $addToSet: { participants: me }, status: 'accepted', respondedAt: existing.respondedAt || new Date() },
    { returnDocument: 'after' }
  );
  if (!meetup) throw new ApiError(400, 'Buổi hẹn vừa thay đổi, vui lòng tải lại');

  let rewardGranted = 0;
  if (reward && isFirstGrant) {
    if (await grantMeetupVouchers(reward, meetup.participants, meetup._id)) {
      rewardGranted = meetup.participants.length;
      meetup.rewardVoucherId = reward._id;
      await meetup.save();
    }
  } else if (reward && (await grantMeetupVoucher(reward, me, meetup._id))) {
    rewardGranted = 1;
  }

  const message = await syncMeetupMessage(req, meetup, {
    status: meetup.status,
    participants: await toCardParticipants(meetup.participants),
    ...(isFirstGrant ? { rewardTitle: rewardGranted > 0 ? reward.title : null } : {}),
  });

  res.status(200).json({
    success: true,
    message:
      rewardGranted > 0
        ? `Đã tham gia! Ưu đãi "${reward.title}" đã vào ví voucher của bạn.`
        : isFirstGrant
          ? 'Đã tham gia buổi hẹn!'
          : 'Đã tham gia buổi hẹn! Ưu đãi của quán vừa hết nên bạn không nhận được voucher.',
    data: { meetup, message, rewardGranted },
  });
});

// POST /api/meetups/:id/leave — bạn đã tham gia đổi ý: thu voucher của mình. Người rủ thì dùng huỷ buổi hẹn.
const leaveMeetup = catchAsync(async (req, res) => {
  const me = req.user._id;
  const left = await Meetup.findOneAndUpdate(
    { _id: req.params.id, groupId: { $ne: null }, status: 'accepted', proposedBy: { $ne: me }, participants: me },
    { $pull: { participants: me } },
    { returnDocument: 'after' }
  ).catch(() => null);
  if (!left) throw new ApiError(400, 'Bạn không thể rời buổi hẹn này');

  await revokeMeetupVouchers(left._id, me);

  // Chỉ còn người rủ thì chưa đủ 2 người: quay về chờ, voucher của người rủ cũng được thu lại
  const reopened =
    left.participants.length < 2
      ? await Meetup.findOneAndUpdate(
          { _id: left._id, status: 'accepted', 'participants.1': { $exists: false } },
          { status: 'proposed', rewardVoucherId: null, respondedAt: null },
          { returnDocument: 'after' }
        )
      : null;
  if (reopened) await revokeMeetupVouchers(reopened._id);
  const meetup = reopened || left;

  const reward = reopened ? await findRewardFor(meetup.venueId, meetup.scheduledAt) : null;
  const message = await syncMeetupMessage(req, meetup, {
    status: meetup.status,
    participants: await toCardParticipants(meetup.participants),
    ...(reopened ? { rewardTitle: reward?.title || null } : {}),
  });

  res.status(200).json({
    success: true,
    message: 'Bạn đã rời buổi hẹn. Ưu đãi chưa dùng của bạn đã được thu hồi.',
    data: { meetup, message },
  });
});

// POST /api/meetups/:id/respond — { action: 'accept' | 'decline' }
const respondMeetup = catchAsync(async (req, res) => {
  const { action } = req.body;
  if (!['accept', 'decline'].includes(action)) throw new ApiError(400, 'Hành động không hợp lệ');
  const accept = action === 'accept';

  const existing = await Meetup.findById(req.params.id).catch(() => null);
  if (!existing) throw new ApiError(404, 'Không tìm thấy lời mời');
  if (String(existing.invitee) !== String(req.user._id)) throw new ApiError(403, 'Chỉ người được mời mới trả lời được');

  const reward = accept && existing.status === 'proposed' ? await findRewardFor(existing.venueId, existing.scheduledAt) : null;
  if (reward) await assertNoRewardClash(existing.venueId, [existing.proposedBy, existing.invitee]);

  // Cập nhật có điều kiện: chỉ khi lời mời còn chờ (bấm 2 lần không cấp voucher 2 lần)
  const meetup = await Meetup.findOneAndUpdate(
    { _id: existing._id, status: 'proposed' },
    { status: accept ? 'accepted' : 'declined', respondedAt: new Date() },
    { returnDocument: 'after' }
  );
  if (!meetup) throw new ApiError(400, 'Lời mời này đã được trả lời hoặc đã huỷ');

  let rewardGranted = 0;
  let rewardTitle = null;
  if (reward && (await grantMeetupVouchers(reward, [meetup.proposedBy, meetup.invitee], meetup._id))) {
    rewardGranted = 2;
    rewardTitle = reward.title;
    meetup.rewardVoucherId = reward._id;
    await meetup.save();
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

// POST /api/meetups/:id/cancel — người mời huỷ lời mời đang chờ; buổi đã chốt thì ai trong 2 người cũng huỷ được.
// Buổi hẹn nhóm chỉ người rủ huỷ được, bạn tham gia thì rời buổi hẹn.
const cancelMeetup = catchAsync(async (req, res) => {
  const me = String(req.user._id);
  const meetup = await Meetup.findById(req.params.id).catch(() => null);
  if (!meetup) throw new ApiError(404, 'Không tìm thấy lời mời');
  const isProposer = String(meetup.proposedBy) === me;
  const isInvitee = String(meetup.invitee) === me;
  if (meetup.groupId && !isProposer) throw new ApiError(403, 'Chỉ người rủ mới huỷ được buổi hẹn nhóm');
  if (!isProposer && !isInvitee) throw new ApiError(403, 'Bạn không thuộc buổi hẹn này');

  const canCancel = (meetup.status === 'proposed' && isProposer) || meetup.status === 'accepted';
  if (!canCancel) throw new ApiError(400, 'Không thể huỷ buổi hẹn ở trạng thái này');

  const updated = await Meetup.findOneAndUpdate(
    { _id: meetup._id, status: meetup.status },
    { status: 'cancelled' },
    { returnDocument: 'after' }
  );
  if (!updated) throw new ApiError(400, 'Buổi hẹn vừa thay đổi trạng thái, vui lòng tải lại');

  // Không còn buổi hẹn thì không còn ưu đãi của buổi hẹn: voucher chưa dùng không ở lại trong ví
  const revoked = await revokeMeetupVouchers(updated._id);

  const message = await syncMeetupMessage(req, updated, { status: 'cancelled' });
  res.status(200).json({
    success: true,
    message: revoked > 0 ? 'Đã huỷ buổi hẹn. Ưu đãi chưa dùng của buổi này đã được thu hồi.' : 'Đã huỷ buổi hẹn',
    data: { meetup: updated, message },
  });
});

/** Thưởng UniCoin hẹn cafe cho những người có mặt; mỗi người chỉ nhận 1 lần trong 1 buổi. @returns { [userId]: số coin thực nhận } */
const rewardAttendees = async (meetup, userIds) => {
  const coinAwarded = {};
  for (const userId of userIds) {
    const claimed = await Meetup.updateOne({ _id: meetup._id, rewardedUsers: { $ne: userId } }, { $addToSet: { rewardedUsers: userId } });
    if (claimed.modifiedCount === 0) continue;
    coinAwarded[String(userId)] = await earnCoins(userId, MEETUP_COMPLETE_COIN, {
      type: 'meetup_complete',
      description: `Hẹn cafe thành công tại ${meetup.venueId?.name || 'quán đối tác'} 🤝`,
    });
  }
  return coinAwarded;
};

/**
 * Gọi sau khi quán quét voucher trong ví sinh viên. studentIds: những sinh viên vừa được quét.
 * - 2 người: cả hai đã dùng → buổi hẹn "đã diễn ra", thưởng UniCoin cho cả hai.
 * - Nhóm: từ 2 người đã dùng → buổi hẹn "đã diễn ra", chỉ người có mặt mới được thưởng;
 *   bạn đến muộn quét sau vẫn được thưởng phần của mình.
 */
const onMeetupVoucherRedeemed = async (req, userVoucher, studentIds = []) => {
  if (!userVoucher?.meetupId) return null;
  const meetup = await Meetup.findById(userVoucher.meetupId).populate('venueId', 'name');
  if (!meetup) return null;
  if (meetup.groupId && meetup.status === 'completed') {
    return { meetup, coinAwarded: await rewardAttendees(meetup, studentIds) };
  }
  const used = await UserVoucher.countDocuments({ meetupId: meetup._id, status: 'used' });
  if (used < 2) return null;

  return completeMeetup(req, meetup._id, meetup.groupId ? studentIds : null);
};

/**
 * Chuyển buổi hẹn accepted → completed (có điều kiện, chỉ 1 lần) và thưởng UniCoin.
 * attendees: những người được thưởng; không truyền thì là cả hai bạn của buổi hẹn 2 người.
 * @returns { meetup, coinAwarded: { [userId]: số coin thực nhận } }, hoặc null nếu buổi hẹn không còn ở trạng thái accepted
 */
const completeMeetup = async (req, meetupId, attendees = null) => {
  const meetup = await Meetup.findOneAndUpdate(
    { _id: meetupId, status: 'accepted' },
    { status: 'completed', completedAt: new Date() },
    { returnDocument: 'after' }
  ).populate('venueId', 'name');
  if (!meetup) return null;

  const coinAwarded = await rewardAttendees(meetup, attendees || [meetup.proposedBy, meetup.invitee]);

  await syncMeetupMessage(req, meetup, { status: 'completed' });
  return { meetup, coinAwarded };
};

/**
 * Gọi sau khi sinh viên check-in QR tại quán. Buổi hẹn đã chốt tại quán này mà người đi cùng
 * cũng đã check-in quán này hôm nay → buổi hẹn "đã diễn ra". Dùng được cả khi quán không có ưu đãi hẹn cafe.
 * Buổi hẹn nhóm chỉ thưởng những người đã check-in.
 */
const onVenueCheckin = async (req, userId, venueId) => {
  const meetups = await Meetup.find({
    venueId,
    status: 'accepted',
    $or: [{ proposedBy: userId }, { invitee: userId }, { participants: userId }],
  });
  const today = vnDay();
  for (const meetup of meetups) {
    const others = meetup.groupId
      ? meetup.participants.filter((id) => String(id) !== String(userId))
      : [String(meetup.proposedBy) === String(userId) ? meetup.invitee : meetup.proposedBy];
    const present = await User.find({
      _id: { $in: others },
      'studentProfile.venueCheckinsToday': { $elemMatch: { venueId: String(venueId), day: today } },
    }).distinct('_id');
    if (present.length > 0) {
      const done = await completeMeetup(req, meetup._id, meetup.groupId ? [userId, ...present] : null);
      if (done) return done;
    }
  }
  return null;
};

module.exports = {
  getQuota,
  createMeetup,
  createGroupMeetup,
  joinMeetup,
  leaveMeetup,
  respondMeetup,
  cancelMeetup,
  onMeetupVoucherRedeemed,
  onVenueCheckin,
  completeMeetup,
  syncMeetupMessage,
  getQuotaFor,
};
