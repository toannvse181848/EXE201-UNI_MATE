import client from './client';

export const voucherApi = {
  /** Danh sách voucher công khai */
  getVouchers: (params = {}) => client.get('/api/vouchers', { params }),

  /** Lưu voucher vào ví */
  claimVoucher: (voucherId) => client.post(`/api/vouchers/claim/${voucherId}`),

  /** Xem ví voucher */
  getMyWallet: () => client.get('/api/vouchers/my-wallet'),

  /** Danh sách voucher của đối tác */
  getMyPartnerVouchers: () => client.get('/api/vouchers/partner/my-vouchers'),

  /** Lịch sử đối soát / check-in của đối tác */
  getPartnerRedemptions: (limit = 30) => client.get(`/api/vouchers/partner/redemptions?limit=${limit}`),

  /** Kiểm tra tính hợp lệ của mã voucher / QR trước khi áp dụng */
  verifyVoucher: (payload) => client.post('/api/vouchers/verify', payload),

  /** Đối soát & trừ lượt sử dụng voucher (Partner) */
  redeemVoucher: (payload) => client.post('/api/vouchers/redeem', payload),

  /** Tạo voucher mới (Partner) */
  createVoucher: (data) => client.post('/api/vouchers', data),

  /** Bật/tắt trạng thái voucher */
  toggleVoucherStatus: (id) => client.patch(`/api/vouchers/${id}/toggle`),
};
