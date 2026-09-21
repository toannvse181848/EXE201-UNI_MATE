import axios from 'axios';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:3000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 8000,
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
    return Promise.reject(new Error(message));
  }
);

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
  updateVenueStatus: async (id, status, rejectionReason) => {
    const res = await client.patch(`/api/venues/${id}/status`, {
      status,
      rejectionReason,
    });
    return res.data;
  },
};

// === VOUCHER API ===
export const voucherApi = {
  getPublicVouchers: async (params = {}) => {
    const res = await client.get('/api/vouchers', { params });
    return res.data;
  },
  getMyPartnerVouchers: async () => {
    const res = await client.get('/api/vouchers/my/list');
    return res.data;
  },
  createVoucher: async (data) => {
    const res = await client.post('/api/vouchers', data);
    return res.data;
  },
  redeemVoucher: async (code) => {
    const res = await client.post('/api/vouchers/redeem', { code });
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
};

// === REPORT API ===
export const reportApi = {
  createReport: async (data) => {
    const res = await client.post('/api/reports', data);
    return res.data;
  },
  getAllReportsAdmin: async (params = {}) => {
    const res = await client.get('/api/reports/admin/all', { params });
    return res.data;
  },
  resolveReport: async (id, status, adminNote) => {
    const res = await client.patch(`/api/reports/admin/${id}`, {
      status,
      adminNote,
    });
    return res.data;
  },
};

export default client;
