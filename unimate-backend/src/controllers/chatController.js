const Message = require('../models/Message');
const Match = require('../models/Match');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');

/**
 * Lấy danh sách hội thoại của user hiện tại.
 * Mỗi hội thoại = 1 Match đã thành công, kèm tin nhắn cuối cùng.
 */
const getConversations = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  const matches = await Match.find({
    $or: [{ user1: currentUserId }, { user2: currentUserId }],
    status: 'matched',
  })
    .populate('user1', 'fullName avatar studentProfile')
    .populate('user2', 'fullName avatar studentProfile')
    .sort({ matchedAt: -1 });

  // Với mỗi match, lấy tin nhắn cuối + số chưa đọc
  const conversations = await Promise.all(
    matches.map(async (match) => {
      const buddy =
        match.user1._id.toString() === currentUserId.toString()
          ? match.user2
          : match.user1;

      const lastMessage = await Message.findOne({ matchId: match._id })
        .sort({ createdAt: -1 })
        .select('text sender createdAt isRead');

      const unreadCount = await Message.countDocuments({
        matchId: match._id,
        receiver: currentUserId,
        isRead: false,
      });

      return {
        matchId: match._id,
        matchedAt: match.matchedAt,
        buddy: {
          id: buddy._id,
          fullName: buddy.fullName,
          avatar: buddy.avatar,
          university: buddy.studentProfile?.university,
          major: buddy.studentProfile?.major,
        },
        lastMessage: lastMessage
          ? {
              text: lastMessage.text,
              isFromMe: lastMessage.sender.toString() === currentUserId.toString(),
              createdAt: lastMessage.createdAt,
              isRead: lastMessage.isRead,
            }
          : null,
        unreadCount,
      };
    })
  );

  // Sort: hội thoại có tin nhắn mới nhất lên đầu
  conversations.sort((a, b) => {
    const timeA = a.lastMessage?.createdAt || a.matchedAt;
    const timeB = b.lastMessage?.createdAt || b.matchedAt;
    return new Date(timeB) - new Date(timeA);
  });

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});

/**
 * Lấy lịch sử tin nhắn của một match (có phân trang)
 */
const getMessages = catchAsync(async (req, res) => {
  const { matchId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const currentUserId = req.user._id;

  // Kiểm tra user thuộc match này không
  const match = await Match.findById(matchId);
  if (!match) throw new ApiError(404, 'Không tìm thấy hội thoại');
  const isParticipant =
    match.user1.toString() === currentUserId.toString() ||
    match.user2.toString() === currentUserId.toString();
  if (!isParticipant) throw new ApiError(403, 'Bạn không thuộc hội thoại này');

  const skip = (Number(page) - 1) * Number(limit);

  const messages = await Message.find({ matchId })
    .populate('sender', 'fullName avatar')
    .sort({ createdAt: -1 }) // mới nhất trước
    .skip(skip)
    .limit(Number(limit));

  // Đánh dấu đã đọc tất cả tin nhắn gửi đến mình
  await Message.updateMany(
    { matchId, receiver: currentUserId, isRead: false },
    { isRead: true }
  );

  // Emit event read-receipt qua socket nếu có
  const io = req.app.get('io');
  if (io) {
    io.to(matchId.toString()).emit('messages_read', {
      matchId,
      readBy: currentUserId,
    });
  }

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages.reverse(), // trả về từ cũ → mới
  });
});

/**
 * Gửi tin nhắn (REST fallback, Socket.io là primary)
 */
const sendMessage = catchAsync(async (req, res) => {
  const { matchId } = req.params;
  const { text } = req.body;
  const senderId = req.user._id;

  if (!text?.trim()) throw new ApiError(400, 'Nội dung tin nhắn không được trống');

  const match = await Match.findById(matchId);
  if (!match || match.status !== 'matched') {
    throw new ApiError(404, 'Hội thoại không tồn tại hoặc chưa được kích hoạt');
  }

  const isParticipant =
    match.user1.toString() === senderId.toString() ||
    match.user2.toString() === senderId.toString();
  if (!isParticipant) throw new ApiError(403, 'Bạn không thuộc hội thoại này');

  const receiverId =
    match.user1.toString() === senderId.toString() ? match.user2 : match.user1;

  const message = await Message.create({
    matchId,
    sender: senderId,
    receiver: receiverId,
    text: text.trim(),
  });

  const populated = await message.populate('sender', 'fullName avatar');

  // Emit real-time qua Socket.io (nếu có)
  const io = req.app.get('io');
  if (io) {
    io.to(matchId.toString()).emit('new_message', populated);
  }

  res.status(201).json({
    success: true,
    data: populated,
  });
});

module.exports = { getConversations, getMessages, sendMessage };
