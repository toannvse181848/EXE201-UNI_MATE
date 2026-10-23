require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const Message = require('./models/Message');
const Match = require('./models/Match');
const User = require('./models/User');
const GroupChat = require('./models/GroupChat');
const GroupMessage = require('./models/GroupMessage');
const { startExpiryJobs } = require('./utils/expiryJobs');

const PORT = process.env.PORT || 3000;

// Tạo HTTP server từ Express app
const httpServer = http.createServer(app);

// Khởi tạo Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: '*', // Trong production, chỉ định domain cụ thể
    methods: ['GET', 'POST'],
  },
});

// Expose io instance để các controller dùng (req.app.get('io'))
app.set('io', io);

// ─── SOCKET.IO EVENT HANDLERS ────────────────────────────────────────────────
// Danh tính lấy từ JWT lúc kết nối (socket.data.userId), không tin userId / senderId client gửi lên:
// trước đây ai biết matchId là nghe được hội thoại và gửi tin dưới tên người khác.
// Client kết nối: io(URL, { auth: { token } })
io.use(async (socket, next) => {
  try {
    const raw = socket.handshake.auth?.token || socket.handshake.headers?.authorization || '';
    const token = String(raw).replace(/^Bearer\s+/i, '');
    if (!token) return next(new Error('Vui lòng đăng nhập'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('status');
    if (!user || user.status === 'suspended') return next(new Error('Vui lòng đăng nhập'));
    socket.data.userId = String(user._id);
    next();
  } catch {
    next(new Error('Vui lòng đăng nhập'));
  }
});

const SOCKET_MESSAGE_TYPES = ['text', 'image', 'video', 'file'];

/** Match đang kết bạn (không bị chặn) mà người dùng là một trong hai bên */
const findOwnMatch = async (matchId, userId) => {
  const match = await Match.findById(matchId).catch(() => null);
  if (!match || match.status !== 'matched') return null;
  const isParticipant = String(match.user1) === userId || String(match.user2) === userId;
  return isParticipant ? match : null;
};

/** Nhóm đang hoạt động mà người dùng là thành viên */
const findOwnGroup = async (groupId, userId) => {
  const group = await GroupChat.findById(groupId).catch(() => null);
  if (!group || !group.isActive) return null;
  return group.members.some((m) => String(m.user) === userId) ? group : null;
};

io.on('connection', (socket) => {
  const me = socket.data.userId;

  // Client emit: join_room({ matchId })
  socket.on('join_room', async ({ matchId } = {}) => {
    try {
      if (!(await findOwnMatch(matchId, me))) {
        return socket.emit('error', { message: 'Bạn không thuộc hội thoại này' });
      }
      socket.join(String(matchId));
      socket.emit('joined_room', { matchId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Client emit: send_message({ matchId, text, type, fileUrl, fileName, fileSize, fileMimeType })
  socket.on('send_message', async ({ matchId, text, type = 'text', fileUrl, fileName, fileSize, fileMimeType } = {}) => {
    try {
      const hasText = Boolean(text?.trim());
      const hasFile = Boolean(fileUrl);
      if (!hasText && !hasFile) return socket.emit('error', { message: 'Tin nhắn trống' });
      // Thẻ quán / thẻ rủ cafe chỉ tạo qua API riêng
      if (!SOCKET_MESSAGE_TYPES.includes(type)) return socket.emit('error', { message: 'Loại tin nhắn không hợp lệ' });

      const match = await findOwnMatch(matchId, me);
      if (!match) return socket.emit('error', { message: 'Hội thoại không hợp lệ' });

      const message = await Message.create({
        matchId,
        sender: me,
        receiver: String(match.user1) === me ? match.user2 : match.user1,
        text: text?.trim() || '',
        type,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileMimeType: fileMimeType || null,
      });
      const populated = await Message.findById(message._id).populate('sender', 'fullName avatar');
      io.to(String(matchId)).emit('new_message', populated);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Typing (1-1): chỉ phát vào phòng mình đã join
  socket.on('typing', ({ matchId, isTyping } = {}) => {
    if (!matchId || !socket.rooms.has(String(matchId))) return;
    socket.to(String(matchId)).emit('user_typing', { userId: me, isTyping: Boolean(isTyping) });
  });

  socket.on('mark_read', async ({ matchId } = {}) => {
    try {
      if (!(await findOwnMatch(matchId, me))) return;
      await Message.updateMany({ matchId, receiver: me, isRead: false }, { isRead: true });
      io.to(String(matchId)).emit('messages_read', { matchId, readBy: me });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── GROUP CHAT SOCKET EVENTS ─────────────────────────────────────────────

  // Client emit: join_group_room({ groupId })
  socket.on('join_group_room', async ({ groupId } = {}) => {
    try {
      if (!(await findOwnGroup(groupId, me))) {
        return socket.emit('error', { message: 'Bạn không phải thành viên nhóm này' });
      }
      socket.join(`group_${groupId}`);
      socket.emit('joined_group_room', { groupId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // Client emit: send_group_message({ groupId, text, type, fileUrl, ... })
  socket.on('send_group_message', async ({ groupId, text, type = 'text', fileUrl, fileName, fileSize, fileMimeType } = {}) => {
    try {
      const hasText = Boolean(text?.trim());
      const hasFile = Boolean(fileUrl);
      if (!hasText && !hasFile) return socket.emit('error', { message: 'Tin nhắn trống' });
      if (!SOCKET_MESSAGE_TYPES.includes(type)) return socket.emit('error', { message: 'Loại tin nhắn không hợp lệ' });

      if (!(await findOwnGroup(groupId, me))) {
        return socket.emit('error', { message: 'Bạn không phải thành viên nhóm này' });
      }

      const message = await GroupMessage.create({
        groupId,
        sender: me,
        text: text?.trim() || '',
        type,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileMimeType: fileMimeType || null,
        readBy: [me],
      });

      await GroupChat.findByIdAndUpdate(groupId, {
        lastMessage: message._id,
        lastMessageAt: message.createdAt,
      });

      const populated = await GroupMessage.findById(message._id).populate('sender', 'fullName avatar');
      io.to(`group_${groupId}`).emit('new_group_message', populated);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  socket.on('group_typing', ({ groupId, userName, isTyping } = {}) => {
    if (!groupId || !socket.rooms.has(`group_${groupId}`)) return;
    socket.to(`group_${groupId}`).emit('group_user_typing', { userId: me, userName, isTyping: Boolean(isTyping) });
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready on ws://localhost:${PORT}`);
  });
  // Huỷ / hết hạn các lời mời, buổi hẹn, đơn hàng treo quá lâu
  startExpiryJobs(io);
});
