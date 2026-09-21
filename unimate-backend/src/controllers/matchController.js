const Match = require('../models/Match');
const User = require('../models/User');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

// Sinh viên: Lấy danh sách bạn học để quẹt thẻ khám phá
const getDiscoveryDeck = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  // Lấy các id người dùng đã quẹt (dù like hay pass)
  const existingSwipes = await Match.find({
    $or: [{ user1: currentUserId }, { user2: currentUserId }],
  }).select('user1 user2');

  const swipedUserIds = new Set();
  swipedUserIds.add(currentUserId.toString());

  existingSwipes.forEach((m) => {
    swipedUserIds.add(m.user1.toString());
    swipedUserIds.add(m.user2.toString());
  });

  // Tìm các sinh viên khác chưa từng quẹt
  const candidates = await User.find({
    _id: { $nin: Array.from(swipedUserIds) },
    role: 'student',
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

  // Kiểm tra xem đối phương đã từng quẹt mình trước đó chưa
  const reciprocalMatch = await Match.findOne({
    user1: targetUserId,
    user2: currentUserId,
  });

  let isMatch = false;
  let matchRecord = null;

  if (reciprocalMatch) {
    // Đối phương đã quẹt mình trước đó
    reciprocalMatch.user2Action = action;
    if (reciprocalMatch.user1Action === 'like' && action === 'like') {
      reciprocalMatch.status = 'matched';
      reciprocalMatch.matchedAt = new Date();
      isMatch = true;
    } else {
      reciprocalMatch.status = 'passed';
    }
    await reciprocalMatch.save();
    matchRecord = reciprocalMatch;
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

module.exports = {
  getDiscoveryDeck,
  swipe,
  getMyMatches,
  proposeVenue,
};
