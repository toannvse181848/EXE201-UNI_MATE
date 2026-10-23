import client from './client';

// Báo cáo vi phạm gửi ban quản trị (trang "Báo cáo vi phạm" của admin)
export const reportApi = {
  // { targetType: 'user' | 'venue' | 'voucher', targetId, reason, description? }
  create: (payload) => client.post('/api/reports', payload),
  // Báo cáo mình đã gửi và kết quả xử lý
  getMy: () => client.get('/api/reports/my'),
};

// Mã lý do khớp với backend (reportController.REPORT_REASONS)
export const USER_REPORT_REASONS = [
  { id: 'harassment', label: 'Quấy rối, xúc phạm' },
  { id: 'fake_profile', label: 'Hồ sơ giả, mạo danh' },
  { id: 'spam', label: 'Spam, lừa đảo' },
  { id: 'inappropriate', label: 'Nội dung không phù hợp' },
  { id: 'other', label: 'Khác' },
];
