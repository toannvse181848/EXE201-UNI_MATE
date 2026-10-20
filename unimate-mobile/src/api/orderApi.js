import client from './client';

// Đơn mua gói trả phí — thanh toán chuyển khoản VietQR, SePay tự xác nhận khi tiền về
export const orderApi = {
  createOrder: (plan) => client.post('/api/orders', { plan }),
  getOrder: (code) => client.get(`/api/orders/${encodeURIComponent(code)}`),
  cancelOrder: (code) => client.post(`/api/orders/${encodeURIComponent(code)}/cancel`),
};
