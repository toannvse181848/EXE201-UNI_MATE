const GroupChat = require('../models/GroupChat');
const GroupMessage = require('../models/GroupMessage');
const Match = require('../models/Match');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/ApiError');
const { getUploadedFileUrl } = require('../config/cloudinary');

/**
 * Helper: Lấy danh sách bạn bè (đã match) của user
 */
const getMatchedFriends = async (userId) => {
  const matches = await Match.find({
    $or: [{ user1: userId }, { user2: userId }],
    status: 'matched',
  })
    .populate('user1', 'fullName avatar studentProfile')
    .populate('user2', 'fullName avatar studentProfile');

  return matches
    .filter((m) => m.user1 && m.user2)
    .map((m) => {
      const friend =
        m.user1._id.toString() === userId.toString() ? m.user2 : m.user1;
      return {
        id: friend._id,
        _id: friend._id,
        fullName: friend.fullName,
        avatar: friend.avatar,
        university: friend.studentProfile?.university,
        major: friend.studentProfile?.major,
      };
    });
};

/**
 * Lấy danh sách nhóm chat của user hiện tại
 * GET /api/group-chat
 */
const getMyGroups = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;

  const groups = await GroupChat.find({
    'members.user': currentUserId,
    isActive: true,
  })
    .populate('members.user', 'fullName avatar')
    .populate('creator', 'fullName avatar')
    .sort({ lastMessageAt: -1, createdAt: -1 });

  // Lấy lastMessage và unreadCount cho mỗi nhóm
  const result = await Promise.all(
    groups.map(async (group) => {
      const lastMsg = await GroupMessage.findOne({ groupId: group._id })
        .sort({ createdAt: -1 })
        .populate('sender', 'fullName')
        .select('text type fileName sender createdAt');

      const unreadCount = await GroupMessage.countDocuments({
        groupId: group._id,
        readBy: { $ne: currentUserId },
        sender: { $ne: currentUserId },
      });

      let previewText = '';
      if (lastMsg) {
        const senderName = lastMsg.sender?.fullName?.split(' ').pop() || 'Ai đó';
        if (lastMsg.type === 'system') {
          previewText = lastMsg.text;
        } else if (lastMsg.text) {
          previewText = `${senderName}: ${lastMsg.text}`;
        } else if (lastMsg.type === 'image') {
          previewText = `${senderName}: 📷 [Hình ảnh]`;
        } else if (lastMsg.type === 'video') {
          previewText = `${senderName}: 🎥 [Video]`;
        } else if (lastMsg.type === 'file') {
          previewText = `${senderName}: 📎 [Tệp]`;
        }
      }

      const myMembership = group.members.find(
        (m) => m.user._id.toString() === currentUserId.toString()
      );

      return {
        groupId: group._id,
        name: group.name,
        avatar: group.avatar,
        memberCount: group.members.length,
        members: group.members.map((m) => ({
          id: m.user._id,
          fullName: m.user.fullName,
          avatar: m.user.avatar,
          role: m.role,
          joinedAt: m.joinedAt,
        })),
        myRole: myMembership?.role || 'member',
        creator: {
          id: group.creator._id,
          fullName: group.creator.fullName,
        },
        lastMessage: lastMsg
          ? {
              text: previewText,
              type: lastMsg.type,
              createdAt: lastMsg.createdAt,
            }
          : null,
        unreadCount,
        createdAt: group.createdAt,
      };
    })
  );

  res.status(200).json({ success: true, count: result.length, data: result });
});

/**
 * Tạo nhóm chat mới
 * POST /api/group-chat
 * Body: { name, memberIds: [] }
 */
const createGroup = catchAsync(async (req, res) => {
  const { name } = req.body;
  const rawMemberIds = req.body.memberIds || req.body.userIds || [];
  const currentUserId = req.user._id;

  if (!name?.trim()) throw new ApiError(400, 'Tên nhóm không được để trống');

  // Kiểm tra tất cả memberIds phải là bạn bè (đã match) của creator
  const friends = await getMatchedFriends(currentUserId);
  const friendIds = friends.map((f) => f.id.toString());

  const validMemberIds = [...new Set(rawMemberIds)].filter((id) =>
    friendIds.includes(id.toString())
  );

  // Tạo danh sách members: creator là admin, còn lại là member
  const members = [
    { user: currentUserId, role: 'admin', joinedAt: new Date() },
    ...validMemberIds.map((id) => ({
      user: id,
      role: 'member',
      joinedAt: new Date(),
    })),
  ];

  const group = await GroupChat.create({
    name: name.trim(),
    creator: currentUserId,
    members,
  });

  // Populate để trả về
  const populated = await GroupChat.findById(group._id)
    .populate('members.user', 'fullName avatar')
    .populate('creator', 'fullName avatar');

  // Gửi tin nhắn hệ thống "Nhóm đã được tạo"
  const io = req.app.get('io');
  const sysMsg = await GroupMessage.create({
    groupId: group._id,
    sender: currentUserId,
    text: `${req.user.fullName || 'Ai đó'} đã tạo nhóm "${name.trim()}"`,
    type: 'system',
  });

  if (io) {
    io.to(`group_${group._id}`).emit('new_group_message', {
      ...sysMsg.toObject(),
      groupId: group._id,
    });
  }

  res.status(201).json({
    success: true,
    data: {
      groupId: populated._id,
      name: populated.name,
      avatar: populated.avatar,
      memberCount: populated.members.length,
      members: populated.members.map((m) => ({
        id: m.user._id,
        fullName: m.user.fullName,
        avatar: m.user.avatar,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
      myRole: 'admin',
      creator: { id: populated.creator._id, fullName: populated.creator.fullName },
      lastMessage: null,
      unreadCount: 0,
      createdAt: populated.createdAt,
    },
  });
});

/**
 * Lấy tin nhắn của một nhóm
 * GET /api/group-chat/:groupId/messages
 */
const getGroupMessages = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { page = 1, limit = 50 } = req.query;
  const currentUserId = req.user._id;

  const group = await GroupChat.findById(groupId).populate(
    'members.user',
    'fullName avatar studentProfile lastActiveAt'
  );

  if (!group || !group.isActive) throw new ApiError(404, 'Nhóm không tồn tại');

  const isMember = group.members.some(
    (m) => m.user._id.toString() === currentUserId.toString()
  );
  if (!isMember) throw new ApiError(403, 'Bạn không phải thành viên nhóm này');

  const skip = (Number(page) - 1) * Number(limit);

  const messages = await GroupMessage.find({ groupId })
    .populate('sender', 'fullName avatar')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));

  // Đánh dấu đã đọc
  await GroupMessage.updateMany(
    {
      groupId,
      readBy: { $ne: currentUserId },
      sender: { $ne: currentUserId },
    },
    { $addToSet: { readBy: currentUserId } }
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`group_${groupId}`).emit('group_messages_read', {
      groupId,
      readBy: currentUserId,
    });
  }

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages.reverse(),
    group: {
      id: group._id,
      name: group.name,
      avatar: group.avatar,
      memberCount: group.members.length,
      members: group.members.map((m) => ({
        id: m.user._id,
        fullName: m.user.fullName,
        avatar: m.user.avatar,
        role: m.role,
      })),
    },
  });
});

/**
 * Gửi tin nhắn vào nhóm (REST fallback)
 * POST /api/group-chat/:groupId/messages
 */
const sendGroupMessage = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const { text, type = 'text', fileUrl, fileName, fileSize, fileMimeType } = req.body;
  const senderId = req.user._id;

  const hasText = Boolean(text?.trim());
  const hasFile = Boolean(fileUrl);
  if (!hasText && !hasFile) throw new ApiError(400, 'Nội dung tin nhắn không được trống');

  const group = await GroupChat.findById(groupId);
  if (!group || !group.isActive) throw new ApiError(404, 'Nhóm không tồn tại');

  const isMember = group.members.some(
    (m) => m.user.toString() === senderId.toString()
  );
  if (!isMember) throw new ApiError(403, 'Bạn không phải thành viên nhóm này');

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

  // Cập nhật lastMessageAt của nhóm
  await GroupChat.findByIdAndUpdate(groupId, {
    lastMessage: message._id,
    lastMessageAt: message.createdAt,
  });

  const populated = await GroupMessage.findById(message._id).populate(
    'sender',
    'fullName avatar'
  );

  const io = req.app.get('io');
  if (io) {
    io.to(`group_${groupId}`).emit('new_group_message', populated);
  }

  res.status(201).json({ success: true, data: populated });
});

/**
 * Thêm thành viên vào nhóm
 * POST /api/group-chat/:groupId/members
 * Body: { userIds: [] }
 * Quyền: Tất cả thành viên nhóm đều có thể thêm (từ danh sách bạn bè của họ)
 */
const addMembers = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const rawUserIds = req.body.userIds || req.body.memberIds || [];
  const userIds = Array.isArray(rawUserIds) ? rawUserIds : [rawUserIds];
  const currentUserId = req.user._id;

  if (!userIds.length) throw new ApiError(400, 'Vui lòng chọn ít nhất 1 người để thêm vào nhóm');

  const group = await GroupChat.findById(groupId);
  if (!group || !group.isActive) throw new ApiError(404, 'Nhóm không tồn tại');

  // Kiểm tra người thêm có phải thành viên nhóm không
  const isMember = group.members.some(
    (m) => m.user.toString() === currentUserId.toString()
  );
  if (!isMember) throw new ApiError(403, 'Bạn không phải thành viên nhóm này');

  // Chỉ cho phép thêm người đã là bạn bè (đã match) với người thêm
  const friends = await getMatchedFriends(currentUserId);
  const friendIds = friends.map((f) => f.id.toString());

  const existingMemberIds = group.members.map((m) => m.user.toString());

  const toAdd = [...new Set(userIds)]
    .filter((id) => friendIds.includes(id.toString()))
    .filter((id) => !existingMemberIds.includes(id.toString()));

  if (!toAdd.length) {
    throw new ApiError(400, 'Không có thành viên hợp lệ để thêm (phải là bạn bè chưa có trong nhóm)');
  }

  const newMembers = toAdd.map((id) => ({
    user: id,
    role: 'member',
    joinedAt: new Date(),
  }));

  await GroupChat.findByIdAndUpdate(groupId, {
    $push: { members: { $each: newMembers } },
  });

  // Gửi tin nhắn hệ thống
  const User = require('../models/User');
  const addedUsers = await User.find({ _id: { $in: toAdd } }).select('fullName');
  const addedNames = addedUsers.map((u) => u.fullName).join(', ');

  const sysMsg = await GroupMessage.create({
    groupId,
    sender: currentUserId,
    text: `${req.user.fullName || 'Ai đó'} đã thêm ${addedNames} vào nhóm`,
    type: 'system',
    readBy: [currentUserId],
  });

  await GroupChat.findByIdAndUpdate(groupId, {
    lastMessage: sysMsg._id,
    lastMessageAt: sysMsg.createdAt,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`group_${groupId}`).emit('group_members_updated', { groupId, action: 'added', userIds: toAdd });
    io.to(`group_${groupId}`).emit('new_group_message', sysMsg);
  }

  const updatedGroup = await GroupChat.findById(groupId).populate(
    'members.user',
    'fullName avatar'
  );

  res.status(200).json({
    success: true,
    message: `Đã thêm ${toAdd.length} thành viên vào nhóm`,
    data: updatedGroup.members.map((m) => ({
      id: m.user._id,
      fullName: m.user.fullName,
      avatar: m.user.avatar,
      role: m.role,
      joinedAt: m.joinedAt,
    })),
  });
});

/**
 * Rời nhóm
 * DELETE /api/group-chat/:groupId/members/me
 */
const leaveGroup = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const currentUserId = req.user._id;

  const group = await GroupChat.findById(groupId);
  if (!group || !group.isActive) throw new ApiError(404, 'Nhóm không tồn tại');

  const myMembership = group.members.find(
    (m) => m.user.toString() === currentUserId.toString()
  );
  if (!myMembership) throw new ApiError(400, 'Bạn không phải thành viên nhóm này');

  // Nếu creator rời nhóm mà chỉ còn 1 người => giải tán nhóm
  const remaining = group.members.filter(
    (m) => m.user.toString() !== currentUserId.toString()
  );

  if (remaining.length === 0) {
    await GroupChat.findByIdAndUpdate(groupId, { isActive: false });
    return res.status(200).json({ success: true, message: 'Nhóm đã được giải tán vì không còn thành viên nào' });
  }

  // Nếu admin rời nhóm, chuyển quyền cho thành viên tiếp theo
  let updateOps = {
    $pull: { members: { user: currentUserId } },
  };

  if (myMembership.role === 'admin') {
    const nextAdmin = remaining[0];
    await GroupChat.findByIdAndUpdate(groupId, {
      $set: { 'members.$[elem].role': 'admin' },
    }, {
      arrayFilters: [{ 'elem.user': nextAdmin.user }],
    });
  }

  await GroupChat.findByIdAndUpdate(groupId, {
    $pull: { members: { user: currentUserId } },
  });

  // Tin nhắn hệ thống
  const sysMsg = await GroupMessage.create({
    groupId,
    sender: currentUserId,
    text: `${req.user.fullName || 'Ai đó'} đã rời nhóm`,
    type: 'system',
    readBy: [],
  });

  await GroupChat.findByIdAndUpdate(groupId, {
    lastMessage: sysMsg._id,
    lastMessageAt: sysMsg.createdAt,
  });

  const io = req.app.get('io');
  if (io) {
    io.to(`group_${groupId}`).emit('group_members_updated', {
      groupId,
      action: 'left',
      userId: currentUserId,
    });
    io.to(`group_${groupId}`).emit('new_group_message', sysMsg);
  }

  res.status(200).json({ success: true, message: 'Bạn đã rời nhóm thành công' });
});

/**
 * Lấy danh sách bạn bè có thể mời vào nhóm
 * GET /api/group-chat/:groupId/invitable
 */
const getInvitableFriends = catchAsync(async (req, res) => {
  const { groupId } = req.params;
  const currentUserId = req.user._id;

  const group = await GroupChat.findById(groupId);
  if (!group || !group.isActive) throw new ApiError(404, 'Nhóm không tồn tại');

  const isMember = group.members.some(
    (m) => m.user.toString() === currentUserId.toString()
  );
  if (!isMember) throw new ApiError(403, 'Bạn không phải thành viên nhóm này');

  const friends = await getMatchedFriends(currentUserId);
  const existingMemberIds = group.members.map((m) => m.user.toString());

  // Lọc bỏ những người đã trong nhóm
  const invitable = friends.filter(
    (f) => !existingMemberIds.includes(f.id.toString())
  );

  res.status(200).json({ success: true, count: invitable.length, data: invitable });
});

/**
 * Lấy danh sách bạn bè có thể tạo nhóm cùng
 * GET /api/group-chat/friends
 */
const getMyFriends = catchAsync(async (req, res) => {
  const currentUserId = req.user._id;
  const friends = await getMatchedFriends(currentUserId);
  res.status(200).json({ success: true, count: friends.length, data: friends });
});

module.exports = {
  getMyGroups,
  createGroup,
  getGroupMessages,
  sendGroupMessage,
  addMembers,
  leaveGroup,
  getInvitableFriends,
  getMyFriends,
};
