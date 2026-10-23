const Match = require('../models/Match');
const Meetup = require('../models/Meetup');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { computeMatchScore, commonInterests, sortByRank } = require('../utils/matchingAlgorithm');
const { isPremiumActive } = require('../utils/subscription');
const { isVenueVisible } = require('../utils/visibility');
const { toPublicStudent } = require('../utils/publicProfile');
const { saveLocationFromQuery } = require('../utils/userLocation');

const DECK_SIZE = 30;

/** Bản ghi tương tác giữa 2 người (theo cả 2 chiều) */
const findPair = (a, b) =>
  Match.findOne({
    $or: [
      { user1: a, user2: b },
      { user1: b, user2: a },
    ],
  });

/** Huỷ các lời mời / buổi hẹn còn mở của cặp này (khi huỷ kết bạn hoặc chặn) */
const cancelOpenMeetups = (matchId) =>
  Meetup.updateMany({ matchId, status: { $in: ['proposed', 'accepted'] } }, { status: 'cancelled' });

// Sinh viên: Lấy danh sách bạn học để quẹt thẻ khám phá
const getDiscoveryDeck = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  // Lấy các người dùng mà currentUserId ĐÃ TỰ TAY QUẸT:
  // 1. currentUserId là user1 (đã quẹt lượt đầu)
  // 2. currentUserId là user2 VÀ user2Action !== 'pending' (đã quẹt phản hồi)
  const mySwipes = await Match.find({
    $or: [
      { user1: currentUserId },
      { user2: currentUserId, user2Action: { $ne: 'pending' } },
    ],
  }).select('user1 user2');

  const excludedIds = new Set();
  excludedIds.add(currentUserId.toString());

  mySwipes.forEach((m) => {
    if (m.user1.toString() === currentUserId.toString()) {
      excludedIds.add(m.user2.toString());
    } else {
      excludedIds.add(m.user1.toString());
    }
  });

  // Bị chặn hoặc đã chặn thì không bao giờ thấy nhau (kể cả khi người kia chưa từng quẹt)
  const blocked = await Match.find({
    $or: [{ user1: currentUserId }, { user2: currentUserId }],
    status: 'blocked',
  }).select('user1 user2');
  blocked.forEach((m) => {
    excludedIds.add(m.user1.toString());
    excludedIds.add(m.user2.toString());
  });

  const me = await User.findById(currentUserId);

  // Lưu vị trí hiện tại nếu client gửi kèm (?lat=&lng=) để tính khoảng cách thật
  await saveLocationFromQuery(me, req.query);

  // Tìm các sinh viên khác chưa từng được currentUserId quẹt.
  // Lấy 2 nhóm rồi mới xếp hạng: cùng trường trước, phần còn lại theo người hoạt động gần đây
  // (trước đây lấy 100 người đầu theo thứ tự trong DB nên người đăng ký sau gần như không được gợi ý).
  const baseFilter = {
    _id: { $nin: Array.from(excludedIds) },
    role: { $in: ['student', 'user'] },
    status: 'active',
  };
  const myUniversity = me?.studentProfile?.university;
  const sameSchool = myUniversity
    ? await User.find({ ...baseFilter, 'studentProfile.university': myUniversity })
        .select('fullName avatar studentProfile lastActiveAt')
        .sort({ lastActiveAt: -1 })
        .limit(100)
    : [];
  const others = await User.find({ ...baseFilter, _id: { $nin: [...excludedIds, ...sameSchool.map((u) => String(u._id))] } })
    .select('fullName avatar studentProfile lastActiveAt')
    .sort({ lastActiveAt: -1 })
    .limit(100);
  const candidates = [...sameSchool, ...others];

  const scoredCandidates = candidates.map((them) => {
    const matchPercentage = me ? computeMatchScore(me, them) : 0;
    const commonTags = me
      ? commonInterests(
          me.studentProfile?.interests || [],
          them.studentProfile?.interests || []
        )
      : [];
    // Chỉ hồ sơ công khai (không MSSV, coin...); Premium hết hạn thì mất tích xanh và mất ưu tiên xếp hạng
    return { ...toPublicStudent(them), matchPercentage, commonTags };
  });

  const ranked = sortByRank(scoredCandidates);
  // Biết ai đã thích mình là quyền lợi Premium (GET /received-likes), nên chỉ Premium mới được
  // xếp những người đó lên đầu. Tài khoản miễn phí giữ thứ tự theo điểm, không đoán được ai thích mình.
  let deck = ranked;
  if (isPremiumActive(req.user.studentProfile)) {
    const likerIds = new Set(
      (await Match.find({ user2: currentUserId, user1Action: 'like', user2Action: 'pending' }).distinct('user1')).map(String)
    );
    deck = [
      ...ranked.filter((c) => likerIds.has(String(c._id))),
      ...ranked.filter((c) => !likerIds.has(String(c._id))),
    ];
  }
  deck = deck.slice(0, DECK_SIZE);

  res.status(200).json({
    success: true,
    count: deck.length,
    data: deck,
  });
});

// Sinh viên: Thực hiện quẹt thẻ (Like hoặc Pass)
const swipe = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;
  const { targetUserId, action } = req.body; // action: 'like' | 'pass'

  if (!targetUserId || !['like', 'pass'].includes(action)) {
    throw new ApiError(400, 'Thiếu targetUserId hoặc hành động (like/pass)');
  }

  if (targetUserId.toString() === currentUserId.toString()) {
    throw new ApiError(400, 'Không thể tự quẹt chính mình');
  }
  const target = await User.exists({ _id: targetUserId, role: { $in: ['student', 'user'] }, status: 'active' }).catch(() => null);
  if (!target) throw new ApiError(404, 'Không tìm thấy sinh viên này');

  // Kiểm tra xem đã có bản ghi tương tác giữa 2 người chưa (theo cả 2 chiều)
  let existingMatch = await findPair(currentUserId, targetUserId);

  let isMatch = false;
  let matchRecord = null;

  if (existingMatch && ['blocked', 'matched'].includes(existingMatch.status)) {
    // Đã chặn nhau: không quẹt lại được. Đã là bạn: huỷ kết bạn qua API riêng, không quẹt đè.
    throw new ApiError(400, existingMatch.status === 'blocked' ? 'Không thể tương tác với người này' : 'Hai bạn đã kết bạn rồi');
  }

  if (existingMatch) {
    // Đã có bản ghi trước đó
    if (existingMatch.user1.toString() === currentUserId.toString()) {
      // Mình là người tạo bản ghi đầu tiên (user1), cập nhật lại hành động nếu có
      existingMatch.user1Action = action;
      if (action === 'like' && existingMatch.user2Action === 'like') {
        existingMatch.status = 'matched';
        if (!existingMatch.matchedAt) existingMatch.matchedAt = new Date();
        isMatch = true;
      } else if (action === 'pass') {
        existingMatch.status = 'passed';
      }
    } else {
      // Đối phương là user1, mình là user2 phản hồi lại
      existingMatch.user2Action = action;
      if (existingMatch.user1Action === 'like' && action === 'like') {
        existingMatch.status = 'matched';
        if (!existingMatch.matchedAt) existingMatch.matchedAt = new Date();
        isMatch = true;
      } else {
        existingMatch.status = 'passed';
      }
    }
    await existingMatch.save();
    matchRecord = existingMatch;
  } else {
    // Lần đầu quẹt
    matchRecord = await Match.create({
      user1: currentUserId,
      user2: targetUserId,
      user1Action: action,
      status: 'pending',
    });
  }

  res.status(200).json({
    success: true,
    isMatch,
    message: isMatch
      ? 'Tuyệt vời! Cả hai bạn đều đã thích nhau 🎉'
      : action === 'like'
        ? 'Đã gửi lượt thích'
        : 'Đã bỏ qua',
    data: matchRecord,
  });
});

// Lấy danh sách các cặp đôi đã ghép đôi thành công
const getMyMatches = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  const matches = await Match.find({
    $or: [{ user1: currentUserId }, { user2: currentUserId }],
    status: 'matched',
  })
    .populate('user1', 'fullName avatar studentProfile lastActiveAt')
    .populate('user2', 'fullName avatar studentProfile lastActiveAt')
    .populate('proposedVenue', 'name address image')
    .sort({ matchedAt: -1 });

  // Format trả về thông tin người bạn học được ghép đôi
  const formatted = matches.map((m) => {
    const partner =
      m.user1._id.toString() === currentUserId.toString() ? m.user2 : m.user1;
    const isOnline = partner?.lastActiveAt
      ? Date.now() - new Date(partner.lastActiveAt).getTime() < 3 * 60 * 1000
      : false;
    return {
      matchId: m._id,
      matchedAt: m.matchedAt,
      proposedVenue: m.proposedVenue,
      buddy: {
        id: partner?._id,
        fullName: partner?.fullName,
        avatar: partner?.avatar,
        studentProfile: partner ? toPublicStudent(partner).studentProfile : undefined,
        lastActiveAt: partner?.lastActiveAt || null,
        isOnline,
      },
    };
  });

  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted,
  });
});

// Đề xuất quán cafe gặp mặt
const proposeVenue = catchAsync(async (req, res) => {
  const { matchId, venueId } = req.body;

  const match = await Match.findById(matchId);
  if (!match) {
    throw new ApiError(404, 'Không tìm thấy thông tin ghép đôi');
  }

  const userId = req.user._id.toString();
  if (match.user1.toString() !== userId && match.user2.toString() !== userId) {
    throw new ApiError(403, 'Bạn không thuộc cặp ghép đôi này');
  }

  if (!(await isVenueVisible(venueId))) {
    throw new ApiError(404, 'Không tìm thấy quán');
  }
  match.proposedVenue = venueId;
  await match.save();

  const updated = await Match.findById(matchId)
    .populate('proposedVenue', 'name address image voucherBadge')
    .populate('user1', 'fullName')
    .populate('user2', 'fullName');

  res.status(200).json({
    success: true,
    message: 'Đã gửi lời mời hẹn tại quán cafe thành công!',
    data: updated,
  });
});

// Lấy danh sách những người mình đã gửi lời thích (đang chờ họ phản hồi)
const getSentLikes = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  const pending = await Match.find({
    user1: currentUserId,
    user1Action: 'like',
    status: 'pending',
  })
    .populate('user2', 'fullName avatar studentProfile lastActiveAt')
    .sort({ createdAt: -1 });

  const data = pending
    .filter((m) => m.user2)
    .map((m) => {
      const isOnline = m.user2?.lastActiveAt
        ? Date.now() - new Date(m.user2.lastActiveAt).getTime() < 3 * 60 * 1000
        : false;
      return {
        matchId: m._id,
        createdAt: m.createdAt,
        status: 'pending',
        buddy: {
          id: m.user2._id,
          fullName: m.user2.fullName,
          avatar: m.user2.avatar,
          university: m.user2.studentProfile?.university,
          major: m.user2.studentProfile?.major,
          trustScore: m.user2.studentProfile?.trustScore || 95,
          lastActiveAt: m.user2.lastActiveAt || null,
          isOnline,
        },
      };
    });

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

// Lấy danh sách những người đã thích mình (mình chưa phản hồi)
const getReceivedLikes = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  const received = await Match.find({
    user2: currentUserId,
    user1Action: 'like',
    user2Action: 'pending',
    status: 'pending',
  })
    .populate('user1', 'fullName avatar studentProfile lastActiveAt')
    .sort({ createdAt: -1 });

  const data = received
    .filter((m) => m.user1)
    .map((m) => {
      const isOnline = m.user1?.lastActiveAt
        ? Date.now() - new Date(m.user1.lastActiveAt).getTime() < 3 * 60 * 1000
        : false;
      return {
        matchId: m._id,
        createdAt: m.createdAt,
        status: 'pending',
        buddy: {
          id: m.user1._id,
          fullName: m.user1.fullName,
          avatar: m.user1.avatar,
          university: m.user1.studentProfile?.university,
          major: m.user1.studentProfile?.major,
          trustScore: m.user1.studentProfile?.trustScore || 95,
          lastActiveAt: m.user1.lastActiveAt || null,
          isOnline,
        },
      };
    });

  // Quyền lợi Premium: xem ai đã thích mình. Tài khoản miễn phí chỉ biết số lượng.
  if (!isPremiumActive(req.user.studentProfile)) {
    return res.status(200).json({ success: true, count: data.length, locked: true, data: [] });
  }

  res.status(200).json({
    success: true,
    count: data.length,
    locked: false,
    data,
  });
});

// POST /api/matches/:matchId/unmatch — huỷ kết bạn: mất hội thoại, không gợi ý lại cho nhau
const unmatch = catchAsync(async (req, res) => {
  const me = req.user._id;
  const match = await Match.findOneAndUpdate(
    { _id: req.params.matchId, status: 'matched', $or: [{ user1: me }, { user2: me }] },
    { status: 'passed', unmatchedBy: me },
    { returnDocument: 'after' }
  ).catch(() => null);
  if (!match) throw new ApiError(404, 'Không tìm thấy bạn bè này');
  await cancelOpenMeetups(match._id);
  res.status(200).json({ success: true, message: 'Đã huỷ kết bạn', data: { matchId: match._id } });
});

// POST /api/matches/block — { targetUserId }: chặn một sinh viên (đã kết bạn hay chưa đều được)
const blockUser = catchAsync(async (req, res) => {
  const me = req.user._id;
  const { targetUserId } = req.body;
  if (!targetUserId || String(targetUserId) === String(me)) throw new ApiError(400, 'Người dùng không hợp lệ');
  const target = await User.exists({ _id: targetUserId, role: { $in: ['student', 'user'] } }).catch(() => null);
  if (!target) throw new ApiError(404, 'Không tìm thấy sinh viên này');

  let match = await findPair(me, targetUserId);
  if (match?.status === 'blocked') {
    return res.status(200).json({ success: true, message: 'Bạn đã chặn người này', data: { matchId: match._id } });
  }
  if (match) {
    match.status = 'blocked';
    match.blockedBy = me;
    await match.save();
  } else {
    match = await Match.create({ user1: me, user2: targetUserId, user1Action: 'pass', status: 'blocked', blockedBy: me });
  }
  await cancelOpenMeetups(match._id);
  res.status(200).json({
    success: true,
    message: 'Đã chặn. Hai bạn sẽ không thấy nhau và không nhắn tin được nữa.',
    data: { matchId: match._id },
  });
});

// GET /api/matches/blocked — danh sách người mình đã chặn
const getBlockedUsers = catchAsync(async (req, res) => {
  const blocked = await Match.find({ status: 'blocked', blockedBy: req.user._id })
    .populate('user1', 'fullName avatar')
    .populate('user2', 'fullName avatar')
    .sort({ updatedAt: -1 });
  const data = blocked.map((m) => {
    const other = String(m.user1?._id) === String(req.user._id) ? m.user2 : m.user1;
    return { matchId: m._id, user: other ? { id: other._id, fullName: other.fullName, avatar: other.avatar } : null };
  });
  res.status(200).json({ success: true, count: data.length, data });
});

// DELETE /api/matches/block/:userId — bỏ chặn (không tự kết bạn lại, phải quẹt lại từ đầu)
const unblockUser = catchAsync(async (req, res) => {
  const me = req.user._id;
  const match = await Match.findOne({
    status: 'blocked',
    blockedBy: me,
    $or: [
      { user1: me, user2: req.params.userId },
      { user1: req.params.userId, user2: me },
    ],
  }).catch(() => null);
  if (!match) throw new ApiError(404, 'Bạn chưa chặn người này');
  await Match.deleteOne({ _id: match._id });
  res.status(200).json({ success: true, message: 'Đã bỏ chặn' });
});

module.exports = {
  unmatch,
  blockUser,
  getBlockedUsers,
  unblockUser,
  getDiscoveryDeck,
  swipe,
  getMyMatches,
  proposeVenue,
  getSentLikes,
  getReceivedLikes,
};
