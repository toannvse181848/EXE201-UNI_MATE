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

// Các API đăng nhập / mật khẩu tự trả 401 khi gõ sai: không coi là hết phiên
const AUTH_FORM_URLS = ['/api/auth/login', '/api/auth/google', '/api/auth/register', '/api/auth/change-password', '/api/auth/reset-password'];

// Phiên không còn hợp lệ (hết hạn, đổi mật khẩu ở máy khác): xoá phiên và về trang đăng nhập thay vì báo lỗi khó hiểu
const handleExpiredSession = (error) => {
  const url = error.config?.url || '';
  if (error.response?.status !== 401 || AUTH_FORM_URLS.some((u) => url.startsWith(u))) return;
  if (!localStorage.getItem('unimate_token')) return;
  ['unimate_portal_user', 'unimate_token', 'unimate_login_time'].forEach((key) => localStorage.removeItem(key));
  const loginPath = window.location.pathname.startsWith('/admin') ? '/admin/login' : '/login';
  if (window.location.pathname !== loginPath) window.location.assign(`${loginPath}?expired=1`);
};

// Xử lý response
client.interceptors.response.use(
  (res) => res,
  (error) => {
    handleExpiredSession(error);
    const message =
      error.response?.data?.message || error.message || 'Lỗi kết nối máy chủ';
    const wrapped = new Error(message);
    // Không có response = lỗi mạng hoặc timeout (vd: server Render free đang khởi động)
    wrapped.isNetworkError = !error.response;
    // Mã lỗi riêng của backend (VD: 'MEETUP_QUOTA' = hết lượt rủ cafe miễn phí)
    wrapped.code = error.response?.data?.code || null;
    wrapped.status = error.response?.status || null;
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
  // { credential, acquisition } — credential là ID token từ nút Google
  googleLogin: async (data) => {
    const res = await client.post('/api/auth/google', data);
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
  // Đổi mật khẩu làm mọi token cũ hết hiệu lực: lưu token mới để máy này không bị đăng xuất
  changePassword: async (currentPassword, newPassword) => {
    const res = await client.post('/api/auth/change-password', { currentPassword, newPassword });
    if (res.data?.data?.token) localStorage.setItem('unimate_token', res.data.data.token);
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
  // Buổi hẹn đã chốt sắp tới tại quán (không có tên sinh viên)
  getUpcomingMeetups: async () => {
    const res = await client.get('/api/venues/my/upcoming-meetups');
    return res.data;
  },
  getMyVenues: async () => {
    const res = await client.get('/api/venues/my/list');
    return res.data;
  },
  // Hiệu quả UNI-MATE mang lại cho quán trong `days` ngày gần nhất
  getMyInsights: async (days = 30) => {
    const res = await client.get('/api/venues/my/insights', { params: { days } });
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
  // Partner / thu ngân: kiểm tra mã voucher / QR payload trước khi áp dụng (không trừ lượt).
  // payload.venueId = chi nhánh đang quét (chủ quán nhiều chi nhánh); thu ngân không cần gửi
  verifyVoucher: async (payload) => {
    const res = await client.post('/api/vouchers/verify', payload);
    return res.data;
  },
  redeemVoucher: async (payload) => {
    const res = await client.post('/api/vouchers/redeem', payload);
    return res.data;
  },
  // venueId: chỉ lấy lịch sử của một chi nhánh (thu ngân luôn chỉ thấy chi nhánh của mình)
  // range: { from, to } là ngày giờ Việt Nam dạng '2026-11-11'
  getPartnerRedemptions: async (limit = 50, venueId = null, range = {}) => {
    const res = await client.get('/api/vouchers/partner/redemptions', {
      params: { limit, ...(venueId ? { venueId } : {}), ...range },
    });
    return res.data;
  },
  // Chủ quán: Excel đối soát với máy tính tiền
  exportPartnerRedemptions: async (venueId = null, range = {}) => {
    const res = await client.get('/api/vouchers/partner/redemptions/export', {
      params: { ...(venueId ? { venueId } : {}), ...range },
      responseType: 'blob',
    });
    return res.data;
  },
  toggleVoucher: async (id) => {
    const res = await client.patch(`/api/vouchers/${id}/toggle`);
    return res.data;
  },
  updateVoucher: async (id, data) => {
    const res = await client.put(`/api/vouchers/${id}`, data);
    return res.data;
  },
  deleteVoucher: async (id) => {
    const res = await client.delete(`/api/vouchers/${id}`);
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
  // Huỷ kết bạn / chặn
  unmatch: async (matchId) => {
    const res = await client.post(`/api/matches/${matchId}/unmatch`);
    return res.data;
  },
  block: async (targetUserId) => {
    const res = await client.post('/api/matches/block', { targetUserId });
    return res.data;
  },
  getBlocked: async () => {
    const res = await client.get('/api/matches/blocked');
    return res.data;
  },
  unblock: async (userId) => {
    const res = await client.delete(`/api/matches/block/${userId}`);
    return res.data;
  },
};

// === RỦ CAFE (hẹn gặp tại quán đối tác) ===
export const meetupApi = {
  getQuota: async () => {
    const res = await client.get('/api/meetups/quota');
    return res.data;
  },
  getRecentRewards: async (matchId) => {
    const res = await client.get('/api/meetups/recent-rewards', { params: { matchId } });
    return res.data;
  },
  // { matchId, venueId, scheduledAt? }
  create: async (payload) => {
    const res = await client.post('/api/meetups', payload);
    return res.data;
  },
  // Rủ cả nhóm: { groupId, venueId, scheduledAt? }
  createGroup: async (payload) => {
    const res = await client.post('/api/meetups/group', payload);
    return res.data;
  },
  // action: 'accept' | 'decline'
  respond: async (meetupId, action) => {
    const res = await client.post(`/api/meetups/${meetupId}/respond`, { action });
    return res.data;
  },
  join: async (meetupId) => {
    const res = await client.post(`/api/meetups/${meetupId}/join`);
    return res.data;
  },
  leave: async (meetupId) => {
    const res = await client.post(`/api/meetups/${meetupId}/leave`);
    return res.data;
  },
  cancel: async (meetupId) => {
    const res = await client.post(`/api/meetups/${meetupId}/cancel`);
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
  // targetAction: làm luôn hành động với đối tượng bị báo cáo
  // (người dùng → khoá tài khoản, voucher → tạm dừng, quán → ẩn chờ duyệt lại)
  resolveReport: async (id, status, adminNote, targetAction = false) => {
    const res = await client.patch(`/api/reports/${id}`, {
      status,
      adminNote,
      targetAction,
    });
    return res.data;
  },
  // Báo cáo mình đã gửi và kết quả xử lý
  getMyReports: async () => {
    const res = await client.get('/api/reports/my');
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
  // Giao dịch SePay không khớp đơn: status = 'unresolved' | 'all' | ...
  getPaymentsAdmin: async (status = 'unresolved') => {
    const res = await client.get('/api/orders/admin/payments', { params: { status } });
    return res.data;
  },
  // { orderCode?, note? } — có orderCode thì gán vào đơn và kích hoạt gói
  resolvePaymentAdmin: async (id, payload) => {
    const res = await client.patch(`/api/orders/admin/payments/${id}`, payload);
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
  // Số liệu phân tích ở trang Tổng quan (phễu, quay lại, theo tuần)
  getOc3: async () => {
    const res = await client.get('/api/admin/oc3');
    return res.data;
  },
  exportOc3: async () => {
    const res = await client.get('/api/admin/oc3/export', { responseType: 'blob' });
    return res.data;
  },
};

// === TÀI KHOẢN THU NGÂN (chủ quán quản lý) ===
export const cashierApi = {
  list: async () => {
    const res = await client.get('/api/cashiers');
    return res.data;
  },
  // { fullName, username, password, venueId }
  create: async (data) => {
    const res = await client.post('/api/cashiers', data);
    return res.data;
  },
  // { fullName?, venueId?, password?, status?: 'active' | 'suspended' }
  update: async (id, data) => {
    const res = await client.patch(`/api/cashiers/${id}`, data);
    return res.data;
  },
  remove: async (id) => {
    const res = await client.delete(`/api/cashiers/${id}`);
    return res.data;
  },
};

// === ONBOARDING & MATCHING API ===
export const onboardingApi = {
  savePreferences: async (data) => {
    const res = await client.post('/api/onboarding/preferences', data);
    return res.data;
  },
  // coords = { lat, lng } (không bắt buộc): vị trí hiện tại để tính khoảng cách thật
  getRecommendations: async (limit = 20, coords = null) => {
    const res = await client.get('/api/onboarding/recommendations', { params: { limit, ...(coords || {}) } });
    return res.data;
  },
};

// Gọi nhẹ để đánh thức / giữ server Render gói miễn phí không ngủ (ngủ sau 15 phút không có ai gọi)
export const pingServer = () => client.get('/', { timeout: 90000 }).then(() => true).catch(() => false);

export default client;


