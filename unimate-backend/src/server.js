require('dotenv').config();
const http = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const connectDB = require('./config/db');
const Message = require('./models/Message');
const Match = require('./models/Match');

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
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  /**
   * Sinh viên join vào room chat của một match
   * Client emit: join_room({ matchId, userId })
   */
  socket.on('join_room', async ({ matchId, userId }) => {
    try {
      // Kiểm tra user thuộc match này
      const match = await Match.findById(matchId);
      if (!match) return socket.emit('error', { message: 'Match không tồn tại' });

      const isParticipant =
        match.user1.toString() === userId ||
        match.user2.toString() === userId;
      if (!isParticipant) return socket.emit('error', { message: 'Bạn không thuộc hội thoại này' });

      socket.join(matchId.toString());
      console.log(`[Socket] User ${userId} joined room ${matchId}`);
      socket.emit('joined_room', { matchId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Gửi tin nhắn real-time (chat 1-1)
   * Client emit: send_message({ matchId, senderId, text })
   * Server broadcast: new_message(message)
   */
  socket.on('send_message', async ({ matchId, senderId, text, type = 'text', fileUrl, fileName, fileSize, fileMimeType }) => {
    try {
      const hasText = Boolean(text?.trim());
      const hasFile = Boolean(fileUrl);
      if (!hasText && !hasFile) return socket.emit('error', { message: 'Tin nhắn trống' });

      const match = await Match.findById(matchId);
      if (!match || match.status !== 'matched') {
        return socket.emit('error', { message: 'Hội thoại không hợp lệ' });
      }

      const receiverId =
        match.user1.toString() === senderId ? match.user2 : match.user1;

      // Lưu vào DB
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

      const populated = await Message.findById(message._id)
        .populate('sender', 'fullName avatar');

      // Broadcast tới tất cả người trong room
      io.to(matchId.toString()).emit('new_message', populated);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Typing indicator (1-1)
   * Client emit: typing({ matchId, userId, isTyping })
   */
  socket.on('typing', ({ matchId, userId, isTyping }) => {
    socket.to(matchId.toString()).emit('user_typing', { userId, isTyping });
  });

  /**
   * Mark messages as read (1-1)
   * Client emit: mark_read({ matchId, userId })
   */
  socket.on('mark_read', async ({ matchId, userId }) => {
    try {
      await Message.updateMany(
        { matchId, receiver: userId, isRead: false },
        { isRead: true }
      );
      io.to(matchId.toString()).emit('messages_read', { matchId, readBy: userId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  // ─── GROUP CHAT SOCKET EVENTS ─────────────────────────────────────────────

  /**
   * Join vào room của một nhóm chat
   * Client emit: join_group_room({ groupId, userId })
   */
  socket.on('join_group_room', async ({ groupId, userId }) => {
    try {
      const GroupChat = require('./models/GroupChat');
      const group = await GroupChat.findById(groupId);
      if (!group || !group.isActive) {
        return socket.emit('error', { message: 'Nhóm không tồn tại' });
      }

      const isMember = group.members.some(
        (m) => m.user.toString() === userId
      );
      if (!isMember) {
        return socket.emit('error', { message: 'Bạn không phải thành viên nhóm này' });
      }

      socket.join(`group_${groupId}`);
      console.log(`[Socket] User ${userId} joined group room group_${groupId}`);
      socket.emit('joined_group_room', { groupId });
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Gửi tin nhắn vào nhóm real-time
   * Client emit: send_group_message({ groupId, senderId, text, type, fileUrl, ... })
   * Server broadcast: new_group_message(message)
   */
  socket.on('send_group_message', async ({ groupId, senderId, text, type = 'text', fileUrl, fileName, fileSize, fileMimeType }) => {
    try {
      const GroupChat = require('./models/GroupChat');
      const GroupMessage = require('./models/GroupMessage');

      const hasText = Boolean(text?.trim());
      const hasFile = Boolean(fileUrl);
      if (!hasText && !hasFile) return socket.emit('error', { message: 'Tin nhắn trống' });

      const group = await GroupChat.findById(groupId);
      if (!group || !group.isActive) {
        return socket.emit('error', { message: 'Nhóm không tồn tại' });
      }

      const isMember = group.members.some(
        (m) => m.user.toString() === senderId
      );
      if (!isMember) {
        return socket.emit('error', { message: 'Bạn không phải thành viên nhóm này' });
      }

      const message = await GroupMessage.create({
        groupId,
        sender: senderId,
        text: text?.trim() || '',
        type: type || 'text',
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileSize: fileSize || null,
        fileMimeType: fileMimeType || null,
        readBy: [senderId],
      });

      // Cập nhật lastMessageAt
      await GroupChat.findByIdAndUpdate(groupId, {
        lastMessage: message._id,
        lastMessageAt: message.createdAt,
      });

      const populated = await GroupMessage.findById(message._id)
        .populate('sender', 'fullName avatar');

      io.to(`group_${groupId}`).emit('new_group_message', populated);
    } catch (err) {
      socket.emit('error', { message: err.message });
    }
  });

  /**
   * Typing indicator trong nhóm
   * Client emit: group_typing({ groupId, userId, userName, isTyping })
   */
  socket.on('group_typing', ({ groupId, userId, userName, isTyping }) => {
    socket.to(`group_${groupId}`).emit('group_user_typing', { userId, userName, isTyping });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ─── START SERVER ─────────────────────────────────────────────────────────────
connectDB().then(() => {
  httpServer.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Socket.io ready on ws://localhost:${PORT}`);
  });
});