import client from './client';

export const groupChatApi = {
  /** Lấy danh sách nhóm chat của tôi */
  getMyGroups: () => client.get('/api/group-chat'),

  /** Tạo nhóm chat mới */
  createGroup: (name, memberIds = []) =>
    client.post('/api/group-chat', { name, memberIds }),

  /** Lấy danh sách bạn bè có thể tạo nhóm */
  getMyFriends: () => client.get('/api/group-chat/friends'),

  /** Lấy danh sách bạn bè có thể mời vào nhóm */
  getInvitableFriends: (groupId) =>
    client.get(`/api/group-chat/${groupId}/invitable`),

  /** Thêm thành viên vào nhóm (bất kỳ thành viên nào cũng có quyền thêm bạn của mình) */
  addMembers: (groupId, memberIds = []) =>
    client.post(`/api/group-chat/${groupId}/members`, { memberIds }),

  /** Rời khỏi nhóm */
  leaveGroup: (groupId) =>
    client.delete(`/api/group-chat/${groupId}/members/me`),

  /** Lấy lịch sử tin nhắn nhóm */
  getGroupMessages: (groupId, params = {}) =>
    client.get(`/api/group-chat/${groupId}/messages`, { params }),

  /** Gửi tin nhắn vào nhóm */
  sendGroupMessage: (groupId, payload) => {
    const data = typeof payload === 'string' ? { text: payload } : payload;
    return client.post(`/api/group-chat/${groupId}/messages`, data);
  },

  /** Upload tệp/ảnh cho nhóm */
  uploadMedia: (formData) =>
    client.post('/api/group-chat/upload', formData, {
      timeout: 60000,
    }),
};
