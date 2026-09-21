const Match = require('../models/Match');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

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

  // Tìm các sinh viên khác chưa từng được currentUserId quẹt
  const candidates = await User.find({
    _id: { $nin: Array.from(excludedIds) },
    role: { $in: ['student', 'user'] },
    status: 'active',
  })
    .select('fullName avatar studentProfile')
    .limit(20);

  res.status(200).json({
    success: true,
    count: candidates.length,
    data: candidates,
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

  // Kiểm tra xem đã có bản ghi tương tác giữa 2 người chưa (theo cả 2 chiều)
  let existingMatch = await Match.findOne({
    $or: [
      { user1: currentUserId, user2: targetUserId },
      { user1: targetUserId, user2: currentUserId },
    ],
  });

  let isMatch = false;
  let matchRecord = null;

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
    .populate('user1', 'fullName avatar studentProfile')
    .populate('user2', 'fullName avatar studentProfile')
    .populate('proposedVenue', 'name address image')
    .sort({ matchedAt: -1 });

  // Format trả về thông tin người bạn học được ghép đôi
  const formatted = matches.map((m) => {
    const partner =
      m.user1._id.toString() === currentUserId.toString() ? m.user2 : m.user1;
    return {
      matchId: m._id,
      matchedAt: m.matchedAt,
      proposedVenue: m.proposedVenue,
      buddy: partner,
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
    .populate('user2', 'fullName avatar studentProfile')
    .sort({ createdAt: -1 });

  const data = pending
    .filter((m) => m.user2)
    .map((m) => ({
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
      },
    }));

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
    .populate('user1', 'fullName avatar studentProfile')
    .sort({ createdAt: -1 });

  const data = received
    .filter((m) => m.user1)
    .map((m) => ({
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
      },
    }));

  res.status(200).json({
    success: true,
    count: data.length,
    data,
  });
});

module.exports = {
  getDiscoveryDeck,
  swipe,
  getMyMatches,
  proposeVenue,
  getSentLikes,
  getReceivedLikes,
};
