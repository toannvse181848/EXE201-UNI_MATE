const Message = require('../models/Message');
const Match = require('../models/Match');
const { findVisibleVenue } = require('../utils/visibility');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { getUploadedFileUrl } = require('../config/cloudinary');
const { parseMessagePaging, trimExtraMessage } = require('../utils/messagePagination');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

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
  const { limit, skip, createdAtFilter } = parseMessagePaging(req.query);
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

  const messages = await Message.find({ matchId, ...createdAtFilter })
    .populate('sender', 'fullName avatar')
    .sort({ createdAt: -1 }) // mới nhất trước
    .skip(skip)
    .limit(limit + 1);
  const hasMore = trimExtraMessage(messages, limit);

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
    hasMore, // còn tin cũ hơn để tải thêm
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
  const { type = 'text', fileUrl, fileName, fileSize, fileMimeType, venueId } = req.body;
  let { text } = req.body;
  const senderId = req.user._id;

  // Gợi ý quán: lấy thông tin quán từ DB (không tin dữ liệu client gửi lên)
  let venueSnapshot = null;
  if (type === 'venue') {
    const venue = await findVisibleVenue(venueId);
    if (!venue) throw new ApiError(404, 'Không tìm thấy quán');
    venueSnapshot = {
      venueId: venue._id,
      name: venue.name,
      address: venue.address,
      image: venue.images?.[0] || venue.image || null,
    };
    // Chữ dự phòng cho bản xem trước hội thoại & app mobile chưa hiển thị được thẻ quán
    if (!text?.trim()) text = `📍 Gợi ý quán: ${venue.name} - ${venue.address}`;
  }

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
    ...(venueSnapshot && { venue: venueSnapshot }),
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

/**
 * Tải file đính kèm với đúng tên gốc và header Content-Disposition
 * GET /api/chat/download?url=...&name=...
 */
const downloadChatFile = catchAsync(async (req, res) => {
  const { url, name } = req.query;
  if (!url) {
    throw new ApiError(400, 'Thiếu đường dẫn URL của file');
  }

  const rawFileName = name || 'tai-lieu';
  let safeFileName = rawFileName;
  try {
    safeFileName = decodeURIComponent(rawFileName);
  } catch (e) {
    safeFileName = rawFileName;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch (e) {
    throw new ApiError(400, 'Đường dẫn file không hợp lệ');
  }

  // Route này không yêu cầu đăng nhập (thẻ <a> không gửi được token),
  // nên chỉ cho tải file chat của chính hệ thống: Cloudinary hoặc thư mục uploads/chat.
  const isCloudinaryFile =
    parsedUrl.protocol === 'https:' && parsedUrl.hostname === 'res.cloudinary.com';
  const isLocalChatFile = parsedUrl.pathname.startsWith('/uploads/chat/');
  if (!isCloudinaryFile && !isLocalChatFile) {
    throw new ApiError(400, 'Đường dẫn file không hợp lệ');
  }

  // 1. File local trong uploads/chat/ — chỉ lấy tên file, chặn path traversal (../)
  if (isLocalChatFile) {
    const filename = path.basename(decodeURIComponent(parsedUrl.pathname));
    const filePath = path.join(__dirname, '../../uploads/chat', filename);
    if (!fs.existsSync(filePath)) {
      throw new ApiError(404, 'Không tìm thấy file');
    }
    return res.download(filePath, safeFileName);
  }

  // 2. File trên Cloudinary
  // Chuẩn hóa tên file theo chuẩn RFC 5987 để hỗ trợ tiếng Việt có dấu
  const encodedName = encodeURIComponent(safeFileName);
  // ASCII fallback name (bỏ cả dấu " và \ để không phá header)
  const asciiFallback = safeFileName.replace(/[^\x20-\x7E]|["\\]/g, '_');

  res.setHeader(
    'Content-Disposition',
    `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedName}`
  );

  let fetchRes;
  try {
    // Không đi theo redirect để không bị dẫn sang host ngoài Cloudinary
    fetchRes = await fetch(parsedUrl.href, { redirect: 'error' });
  } catch (err) {
    console.error('Lỗi khi tải file từ Cloudinary:', err.message);
    return res.redirect(parsedUrl.href);
  }
  if (!fetchRes.ok || !fetchRes.body) {
    return res.redirect(parsedUrl.href);
  }

  res.setHeader('Content-Type', fetchRes.headers.get('content-type') || 'application/octet-stream');
  const contentLength = fetchRes.headers.get('content-length');
  if (contentLength) res.setHeader('Content-Length', contentLength);

  // Stream thẳng về trình duyệt, không giữ cả file (tối đa 50MB) trong RAM server
  Readable.fromWeb(fetchRes.body)
    .on('error', (err) => {
      console.error('Lỗi khi stream download file:', err.message);
      res.destroy(err);
    })
    .pipe(res);
});

module.exports = { getConversations, getMessages, sendMessage, uploadMedia, downloadChatFile };
