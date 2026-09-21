import client from './client';

export const voucherApi = {
  /** Danh sách voucher công khai */
  getVouchers: (params = {}) => client.get('/api/vouchers', { params }),

  /** Lưu voucher vào ví */
  claimVoucher: (voucherId) => client.post(`/api/vouchers/claim/${voucherId}`),

  /** Xem ví voucher */
  getMyWallet: () => client.get('/api/vouchers/my-wallet'),

  /** Đối soát voucher (Partner) */
  redeemVoucher: (payload) => client.post('/api/vouchers/redeem', payload),
};
