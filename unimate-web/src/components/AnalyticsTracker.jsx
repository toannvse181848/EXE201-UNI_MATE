import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setAnalyticsUser, trackPageView } from '../utils/analytics';

// Tên màn hình hiển thị trong báo cáo GA4 (Trang và màn hình / Khám phá đường dẫn)
const SCREEN_TITLES = {
  '/': 'Trang chủ',
  '/login': 'Đăng nhập',
  '/register': 'Đăng ký',
  '/onboarding': 'Onboarding',
  '/reset-password': 'Đặt lại mật khẩu',
  '/user/discover': 'SV - Khám phá bạn học',
  '/user/venues': 'SV - Quán cafe',
  '/user/vouchers': 'SV - Ví voucher',
  '/user/unicoin': 'SV - UniCoin',
  '/user/messages': 'SV - Tin nhắn',
  '/user/profile': 'SV - Hồ sơ',
  '/partner/dashboard': 'Quán - Tổng quan',
  '/partner/venues': 'Quán - Quản lý quán',
  '/partner/vouchers': 'Quán - Quản lý voucher',
  '/partner/qr-scanner': 'Quán - Quét QR',
  '/partner/pending-review': 'Quán - Chờ duyệt',
};

// Gửi page_view mỗi lần đổi route và gắn người dùng đang đăng nhập cho GA4
export default function AnalyticsTracker() {
  const location = useLocation();
  const { user } = useAuth();
  const lastPathRef = useRef(null);

  useEffect(() => {
    setAnalyticsUser(user);
  }, [user]);

  useEffect(() => {
    const path = location.pathname;
    // StrictMode chạy effect 2 lần ở môi trường dev → tránh đếm trùng
    if (lastPathRef.current === path) return;
    lastPathRef.current = path;
    // Trang quản trị là nội bộ, không đưa vào số liệu hành vi người dùng
    if (path.startsWith('/admin')) return;
    trackPageView(SCREEN_TITLES[path] || path);
  }, [location.pathname]);

  return null;
}
