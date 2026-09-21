import client from './client';

export const chatApi = {
  /** Danh sách hội thoại (inbox) */
  getConversations: () => client.get('/api/chat/conversations'),

  /** Lịch sử tin nhắn của một match */
  getMessages: (matchId, params = {}) =>
    client.get(`/api/chat/${matchId}/messages`, { params }),

  /** Gửi tin nhắn (REST fallback) */
  sendMessage: (matchId, text) =>
    client.post(`/api/chat/${matchId}/messages`, { text }),
};
