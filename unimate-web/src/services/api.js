import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://unimate-api.onrender.com';

// Upload ảnh cần lâu hơn: Render free có thể đang ngủ + thời gian đẩy ảnh lên Cloudinary
const UPLOAD_TIMEOUT = 60000;

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Gắn JWT token vào request nếu có
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('unimate_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý response
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Lỗi kết nối máy chủ';
    const wrapped = new Error(message);
    // Không có response = lỗi mạng hoặc timeout (vd: server Render free đang khởi động)
    wrapped.isNetworkError = !error.response;
    return Promise.reject(wrapped);
  }
);

// Upload file chat; tự thử lại 1 lần nếu lỗi mạng/timeout
const uploadChatFile = async (url, file) => {
  const send = () => {
    const formData = new FormData();
    formData.append('file', file);
    return client.post(url, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });
  };
  try {
    return (await send()).data;
  } catch (err) {
    if (!err.isNetworkError) throw err;
    return (await send()).data;
  }
};

// === AUTH API ===
export const authApi = {
  login: async (email, password) => {
    const res = await client.post('/api/auth/login', { email, password });
    return res.data;
  },
  register: async (userData) => {
    const res = await client.post('/api/auth/register', userData);
    return res.data;
  },
  getMe: async () => {
    const res = await client.get('/api/auth/me');
    return res.data;
  },
  forgotPassword: async (email) => {
    const res = await client.post('/api/auth/forgot-password', { email });
    return res.data;
  },
  resetPassword: async (token, newPassword) => {
    const res = await client.post('/api/auth/reset-password', { token, newPassword });
    return res.data;
  },
  changePassword: async (currentPassword, newPassword) => {
    const res = await client.post('/api/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },
};



// === VENUE API ===
export const venueApi = {
  getPublicVenues: async (params = {}) => {
    const res = await client.get('/api/venues', { params });
    return res.data;
  },
  getVenueById: async (id) => {
    const res = await client.get(`/api/venues/${id}`);
    return res.data;
  },
  getMyVenues: async () => {
    const res = await client.get('/api/venues/my/list');
    return res.data;
  },
  createVenue: async (data) => {
    const res = await client.post('/api/venues', data);
    return res.data;
  },
  updateVenue: async (id, data) => {
    const res = await client.put(`/api/venues/${id}`, data);
    return res.data;
  },
  getAllVenuesAdmin: async (params = {}) => {
    const res = await client.get('/api/venues/admin/all', { params });
    return res.data;
  },
  // Upload ảnh quán lên server (Cloudinary), trả về { urls: [...] }
  uploadImages: async (files) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    const res = await client.post('/api/venues/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });
    return res.data;
  },
  updateVenueStatus: async (id, status, rejectionReason) => {
    const res = await client.patch(`/api/venues/${id}/status`, {
      status,
      rejectionReason,
    });
    return res.data;
  },
  // Lấy ảnh QR check-in của quán (dán tại quán cho sinh viên quét nhận điểm)
  getCheckinQr: async (venueId) => {
    const res = await client.get(`/api/venues/${venueId}/checkin-qr`);
    return res.data;
  },
  // Tạo lại mã QR check-in mới (khi ảnh cũ bị lộ)
  regenerateCheckinQr: async (venueId) => {
    const res = await client.post(`/api/venues/${venueId}/checkin-qr/regenerate`);
    return res.data;
  },
};

// === VOUCHER API ===
export const voucherApi = {
  getPublicVouchers: async (params = {}) => {
    const res = await client.get('/api/vouchers', { params });
    return res.data;
  },
  claimVoucher: async (voucherId) => {
    const res = await client.post(`/api/vouchers/claim/${voucherId}`);
    return res.data;
  },
  getMyWallet: async () => {
    const res = await client.get('/api/vouchers/my-wallet');
    return res.data;
  },
  getMyPartnerVouchers: async () => {
    const res = await client.get('/api/vouchers/partner/my-vouchers');
    return res.data;
  },
  createVoucher: async (data) => {
    const res = await client.post('/api/vouchers', data);
    return res.data;
  },
  // Partner: kiểm tra mã voucher / QR payload trước khi áp dụng (không trừ lượt)
  verifyVoucher: async (payload) => {
    const res = await client.post('/api/vouchers/verify', payload);
    return res.data;
  },
  redeemVoucher: async (payload) => {
    const res = await client.post('/api/vouchers/redeem', payload);
    return res.data;
  },
  getPartnerRedemptions: async (limit = 50) => {
    const res = await client.get('/api/vouchers/partner/redemptions', { params: { limit } });
    return res.data;
  },
  toggleVoucher: async (id) => {
    const res = await client.patch(`/api/vouchers/${id}/toggle`);
    return res.data;
  },
  getAllVouchersAdmin: async () => {
    const res = await client.get('/api/vouchers/admin/all');
    return res.data;
  },
  // Nhập liệu từ Excel / Google Sheet
  downloadTemplate: async () => {
    const res = await client.get('/api/vouchers/partner/template', {
      responseType: 'blob',
    });
    return res.data;
  },
  previewImport: async (payload) => {
    if (payload instanceof FormData) {
      const res = await client.post('/api/vouchers/partner/preview', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await client.post('/api/vouchers/partner/preview', payload);
    return res.data;
  },
  importSpreadsheet: async (payload) => {
    if (payload instanceof FormData) {
      const res = await client.post('/api/vouchers/partner/import', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await client.post('/api/vouchers/partner/import', payload);
    return res.data;
  },
  // Nạp danh sách mã riêng (JSON { codes: [...] } hoặc file Excel/CSV qua FormData)
  addVoucherCodes: async (voucherId, payload) => {
    if (payload instanceof FormData) {
      const res = await client.post(`/api/vouchers/${voucherId}/codes`, payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    }
    const res = await client.post(`/api/vouchers/${voucherId}/codes`, payload);
    return res.data;
  },
  // Xem tình trạng từng mã riêng của voucher (available / assigned / used)
  getVoucherCodes: async (voucherId) => {
    const res = await client.get(`/api/vouchers/${voucherId}/codes`);
    return res.data;
  },
};

// === MATCH / DISCOVER API ===
export const matchApi = {
  getDiscoveryDeck: async () => {
    const res = await client.get('/api/matches/discover');
    return res.data;
  },
  swipe: async (targetUserId, action) => {
    const res = await client.post('/api/matches/swipe', {
      targetUserId,
      action,
    });
    return res.data;
  },
  getMyMatches: async () => {
    const res = await client.get('/api/matches/my-matches');
    return res.data;
  },
  proposeVenue: async (matchId, venueId) => {
    const res = await client.post('/api/matches/propose-venue', {
      matchId,
      venueId,
    });
    return res.data;
  },
  getSentLikes: async () => {
    const res = await client.get('/api/matches/sent-likes');
    return res.data;
  },
  getReceivedLikes: async () => {
    const res = await client.get('/api/matches/received-likes');
    return res.data;
  },
};

// === CHAT API ===
export const chatApi = {
  getConversations: async () => {
    const res = await client.get('/api/chat/conversations');
    return res.data;
  },
  getMessages: async (matchId, params = {}) => {
    const res = await client.get(`/api/chat/${matchId}/messages`, { params });
    return res.data;
  },
  sendMessage: async (matchId, payload) => {
    const body = typeof payload === 'string' ? { text: payload } : payload;
    const res = await client.post(`/api/chat/${matchId}/messages`, body);
    return res.data;
  },
  uploadMedia: (file) => uploadChatFile('/api/chat/upload', file),
};

// === GROUP CHAT API ===
export const groupChatApi = {
  // Lấy danh sách bạn bè có thể tạo nhóm
  getMyFriends: async () => {
    const res = await client.get('/api/group-chat/friends');
    return res.data;
  },
  // Lấy danh sách nhóm của tôi
  getMyGroups: async () => {
    const res = await client.get('/api/group-chat');
    return res.data;
  },
  // Tạo nhóm mới
  createGroup: async (name, memberIds = []) => {
    const res = await client.post('/api/group-chat', { name, memberIds });
    return res.data;
  },
  // Lấy tin nhắn nhóm
  getGroupMessages: async (groupId, params = {}) => {
    const res = await client.get(`/api/group-chat/${groupId}/messages`, { params });
    return res.data;
  },
  // Gửi tin nhắn nhóm (REST fallback)
  sendGroupMessage: async (groupId, payload) => {
    const body = typeof payload === 'string' ? { text: payload } : payload;
    const res = await client.post(`/api/group-chat/${groupId}/messages`, body);
    return res.data;
  },
  // Lấy danh sách bạn bè có thể mời vào nhóm cụ thể
  getInvitableFriends: async (groupId) => {
    const res = await client.get(`/api/group-chat/${groupId}/invitable`);
    return res.data;
  },
  // Thêm thành viên vào nhóm
  addMembers: async (groupId, userIds = []) => {
    const res = await client.post(`/api/group-chat/${groupId}/members`, { userIds });
    return res.data;
  },
  // Rời nhóm
  leaveGroup: async (groupId) => {
    const res = await client.delete(`/api/group-chat/${groupId}/members/me`);
    return res.data;
  },
  // Upload file cho nhóm (dùng chung upload endpoint)
  uploadMedia: (file) => uploadChatFile('/api/group-chat/upload', file),
};

// === REPORT API ===
export const reportApi = {
  createReport: async (data) => {
    const res = await client.post('/api/reports', data);
    return res.data;
  },
  getAllReportsAdmin: async (params = {}) => {
    const res = await client.get('/api/reports', { params });
    return res.data;
  },
  resolveReport: async (id, status, adminNote) => {
    const res = await client.patch(`/api/reports/${id}`, {
      status,
      adminNote,
    });
    return res.data;
  },
};

// === USER MANAGEMENT API ===
export const userApi = {
  getSuggestedStudents: async (limit = 10) => {
    const res = await client.get(`/api/users/students?limit=${limit}`);
    return res.data;
  },
  getAllUsers: async (params = {}) => {
    const res = await client.get('/api/users/all', { params });
    return res.data;
  },
  updateUserStatus: async (userId, status) => {
    const res = await client.patch(`/api/users/${userId}/status`, { status });
    return res.data;
  },
  updateAvatar: async (formData) => {
    const res = await client.put('/api/users/me/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: UPLOAD_TIMEOUT,
    });
    return res.data;
  },
  // Cập nhật hồ sơ của chính mình (fullName, phone, bio, major, year...)
  updateMe: async (data) => {
    const res = await client.put('/api/users/me', data);
    return res.data;
  },
  // Nâng cấp / Mua gói Premium để nhận tích xanh xác thực
  buyPremium: async (data = { plan: 'monthly', paymentMethod: 'coin' }) => {
    const res = await client.post('/api/users/premium/buy', data);
    return res.data;
  },
  // Admin cấp / thu hồi Premium và Tích xanh
  toggleUserPremium: async (userId, isPremium, plan = 'monthly') => {
    const res = await client.patch(`/api/users/${userId}/premium`, { isPremium, plan });
    return res.data;
  },
  // Admin xuất file Excel danh sách người dùng
  exportUsersAdmin: async (role = '') => {
    const res = await client.get(`/api/users/admin/export${role ? `?role=${role}` : ''}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

// === UNICOIN API ===
export const coinApi = {
  getStatus: async () => {
    const res = await client.get('/api/coins/status');
    return res.data;
  },
  dailyCheckin: async () => {
    const res = await client.post('/api/coins/daily-checkin');
    return res.data;
  },
  // Check-in quán cafe qua mã QR: { qrContent, lat, lng }
  venueCheckin: async (paramsOrVenueId, venueName) => {
    const payload =
      typeof paramsOrVenueId === 'object' && paramsOrVenueId !== null
        ? paramsOrVenueId
        : { qrContent: paramsOrVenueId, venueName };
    const res = await client.post('/api/coins/venue-checkin', payload);
    return res.data;
  },
};

// === ORDER & PAYMENT API ===
export const orderApi = {
  getPlans: async () => {
    const res = await client.get('/api/orders/plans');
    return res.data;
  },
  createOrder: async (plan = 'monthly', gaClientId = null) => {
    const res = await client.post('/api/orders', { plan, gaClientId });
    return res.data;
  },
  getMyOrders: async () => {
    const res = await client.get('/api/orders/my');
    return res.data;
  },
  getOrder: async (code) => {
    const res = await client.get(`/api/orders/${encodeURIComponent(code)}`);
    return res.data;
  },
  cancelMyOrder: async (code) => {
    const res = await client.post(`/api/orders/${encodeURIComponent(code)}/cancel`);
    return res.data;
  },
  // Admin
  getAllOrdersAdmin: async (params = {}) => {
    const res = await client.get('/api/orders/admin/all', { params });
    return res.data;
  },
  confirmOrderAdmin: async (code, note = '') => {
    const res = await client.patch(`/api/orders/admin/${encodeURIComponent(code)}/confirm`, { note });
    return res.data;
  },
  cancelOrderAdmin: async (code, note = '') => {
    const res = await client.patch(`/api/orders/admin/${encodeURIComponent(code)}/cancel`, { note });
    return res.data;
  },
  exportOrdersAdmin: async (status = 'paid') => {
    const res = await client.get(`/api/orders/admin/export?status=${encodeURIComponent(status)}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

// === ADMIN API ===
export const adminApi = {
  getStats: async () => {
    const res = await client.get('/api/admin/stats');
    return res.data;
  },
  // Bảng số liệu tổng hợp OC3
  getOc3: async () => {
    const res = await client.get('/api/admin/oc3');
    return res.data;
  },
  exportOc3: async () => {
    const res = await client.get('/api/admin/oc3/export', { responseType: 'blob' });
    return res.data;
  },
  getOc3Settings: async () => {
    const res = await client.get('/api/admin/oc3/settings');
    return res.data;
  },
  saveOc3Settings: async (data) => {
    const res = await client.put('/api/admin/oc3/settings', data);
    return res.data;
  },
};

// === ONBOARDING & MATCHING API ===
export const onboardingApi = {
  savePreferences: async (data) => {
    const res = await client.post('/api/onboarding/preferences', data);
    return res.data;
  },
  getRecommendations: async (limit = 20) => {
    const res = await client.get(`/api/onboarding/recommendations?limit=${limit}`);
    return res.data;
  },
};

export default client;


