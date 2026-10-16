const Message = require('../models/Message');
const Match = require('../models/Match');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { getUploadedFileUrl } = require('../config/cloudinary');

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
    .populate('user1', 'fullName avatar studentProfile lastActiveAt')
    .populate('user2', 'fullName avatar studentProfile lastActiveAt')
    .sort({ matchedAt: -1 });

  // Với mỗi match, lấy tin nhắn cuối + số chưa đọc + trạng thái trực tuyến
  const conversations = await Promise.all(
    matches.map(async (match) => {
      const buddy =
        match.user1._id.toString() === currentUserId.toString()
          ? match.user2
          : match.user1;

      const isOnline = buddy?.lastActiveAt
        ? Date.now() - new Date(buddy.lastActiveAt).getTime() < 3 * 60 * 1000
        : false;

      const lastMessage = await Message.findOne({ matchId: match._id })
        .sort({ createdAt: -1 })
        .select('text type fileName sender createdAt isRead');

      const unreadCount = await Message.countDocuments({
        matchId: match._id,
        receiver: currentUserId,
        isRead: false,
      });

      let previewText = '';
      if (lastMessage) {
        if (lastMessage.text) {
          previewText = lastMessage.text;
        } else if (lastMessage.type === 'image') {
          previewText = '📷 [Hình ảnh]';
        } else if (lastMessage.type === 'video') {
          previewText = '🎥 [Video]';
        } else if (lastMessage.type === 'file') {
          previewText = `📎 [Tệp] ${lastMessage.fileName || 'Tài liệu'}`;
        }
      }

      return {
        matchId: match._id,
        matchedAt: match.matchedAt,
        buddy: {
          id: buddy?._id,
          fullName: buddy?.fullName,
          avatar: buddy?.avatar,
          university: buddy?.studentProfile?.university,
          major: buddy?.studentProfile?.major,
          lastActiveAt: buddy?.lastActiveAt || null,
          isOnline,
        },
        lastMessage: lastMessage
          ? {
              text: previewText,
              type: lastMessage.type || 'text',
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
 * Lấy lịch sử tin nhắn của một match (có phân trang) kèm trạng thái trực tuyến của buddy
 */
const getMessages = catchAsync(async (req, res) => {
  const { matchId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const currentUserId = req.user._id;

  // Kiểm tra user thuộc match này không và lấy thông tin buddy
  const match = await Match.findById(matchId)
    .populate('user1', 'fullName avatar studentProfile lastActiveAt')
    .populate('user2', 'fullName avatar studentProfile lastActiveAt');

  if (!match) throw new ApiError(404, 'Không tìm thấy hội thoại');
  const isParticipant =
    match.user1._id.toString() === currentUserId.toString() ||
    match.user2._id.toString() === currentUserId.toString();
  if (!isParticipant) throw new ApiError(403, 'Bạn không thuộc hội thoại này');

  const buddy =
    match.user1._id.toString() === currentUserId.toString()
      ? match.user2
      : match.user1;

  const isOnline = buddy?.lastActiveAt
    ? Date.now() - new Date(buddy.lastActiveAt).getTime() < 3 * 60 * 1000
    : false;

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
    buddy: {
      id: buddy?._id,
      fullName: buddy?.fullName,
      avatar: buddy?.avatar,
      university: buddy?.studentProfile?.university,
      major: buddy?.studentProfile?.major,
      lastActiveAt: buddy?.lastActiveAt || null,
      isOnline,
    },
  });
});

/**
 * Gửi tin nhắn (REST fallback, Socket.io là primary)
 */
const sendMessage = catchAsync(async (req, res) => {
  const { matchId } = req.params;
  const { text, type = 'text', fileUrl, fileName, fileSize, fileMimeType } = req.body;
  const senderId = req.user._id;

  const hasText = Boolean(text?.trim());
  const hasFile = Boolean(fileUrl);

  if (!hasText && !hasFile) {
    throw new ApiError(400, 'Nội dung tin nhắn hoặc file đính kèm không được trống');
  }

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
    text: text?.trim() || '',
    type: type || 'text',
    fileUrl: fileUrl || null,
    fileName: fileName || null,
    fileSize: fileSize || null,
    fileMimeType: fileMimeType || null,
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

/**
 * Upload file/ảnh/video cho chat
 * POST /api/chat/upload
 */
const uploadMedia = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new ApiError(400, 'Vui lòng chọn file cần gửi');
  }

  const fileUrl = getUploadedFileUrl(req, req.file, 'chat');
  const mimetype = req.file.mimetype || '';
  let mediaType = 'file';
  if (mimetype.startsWith('image/')) mediaType = 'image';
  else if (mimetype.startsWith('video/')) mediaType = 'video';

  // Sửa lỗi encoding tên file tiếng Việt do multer đọc latin1
  let safeFileName = req.file.originalname;
  try {
    safeFileName = Buffer.from(req.file.originalname, 'latin1').toString('utf8');
  } catch (err) {
    safeFileName = req.file.originalname;
  }

  res.status(200).json({
    success: true,
    data: {
      fileUrl,
      fileName: safeFileName,
      fileSize: req.file.size,
      fileMimeType: mimetype,
      mediaType,
    },
  });
});

module.exports = { getConversations, getMessages, sendMessage, uploadMedia };
