import client from './client';

export const coinApi = {
  /** Lấy trạng thái điểm danh, streak, số dư UniCoin và lịch sử giao dịch */
  getCoinStatus: () => client.get('/api/coins/status'),

  /** Điểm danh nhận UniCoin hàng ngày */
  dailyCheckin: () => client.post('/api/coins/daily-checkin'),

  /** Quét QR hoặc nhập mã check-in tại quán cafe để nhận UniCoin */
  venueCheckin: (payload) => client.post('/api/coins/venue-checkin', payload),
};
