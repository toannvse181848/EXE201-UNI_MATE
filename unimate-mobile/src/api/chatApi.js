import client from './client';

export const chatApi = {
  /** Danh sách hội thoại (inbox) */
  getConversations: () => client.get('/api/chat/conversations'),

  /** Lịch sử tin nhắn của một match */
  getMessages: (matchId, params = {}) =>
    client.get(`/api/chat/${matchId}/messages`, { params }),

  /** Gửi tin nhắn (văn bản hoặc đa phương tiện) */
  sendMessage: (matchId, payload) => {
    const data = typeof payload === 'string' ? { text: payload } : payload;
    return client.post(`/api/chat/${matchId}/messages`, data);
  },

  /** Upload tệp/ảnh đính kèm cho chat */
  uploadMedia: (formData) =>
    client.post('/api/chat/upload', formData, {
      timeout: 60000,
    }),
};

