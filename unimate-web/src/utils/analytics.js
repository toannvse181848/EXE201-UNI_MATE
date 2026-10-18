// Google Analytics 4 — đo hành vi người dùng cho báo cáo OC3
// (phễu chuyển đổi, tỷ lệ quay lại, màn hình bị rời bỏ, nguồn truy cập theo UTM).
// Measurement ID là thông tin công khai nên để mặc định cho bản build production;
// chạy `npm run dev` ở local thì không gửi số liệu để không lẫn vào dữ liệu người dùng thật.
const MEASUREMENT_ID =
  import.meta.env.VITE_GA_MEASUREMENT_ID || (import.meta.env.PROD ? 'G-E201VWBYGY' : null);

// Tài khoản admin là nội bộ, không tính vào số liệu người dùng
let isInternalUser = false;

const isEnabled = () => Boolean(MEASUREMENT_ID && window.gtag) && !isInternalUser;

export const initAnalytics = () => {
  if (!MEASUREMENT_ID || window.gtag) return;
  window.dataLayer = window.dataLayer || [];
  // gtag bắt buộc đẩy nguyên đối tượng arguments vào dataLayer
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  // page_view do AnalyticsTracker tự gửi theo từng route để có tên màn hình rõ ràng
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false });

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);
};

// Gắn id người dùng (ObjectId, không phải thông tin cá nhân) để GA4 nối các phiên của cùng một người
export const setAnalyticsUser = (user) => {
  isInternalUser = user?.role === 'admin';
  if (!MEASUREMENT_ID || !window.gtag) return;
  window.gtag('config', MEASUREMENT_ID, {
    send_page_view: false,
    user_id: user?.id ? String(user.id) : null,
  });
  window.gtag('set', 'user_properties', { account_role: user?.role || 'guest' });
};

export const trackPageView = (title) => {
  if (!isEnabled()) return;
  // page_location giữ nguyên query để GA4 đọc được mã UTM của lượt truy cập đầu tiên
  window.gtag('event', 'page_view', {
    page_title: title,
    page_location: window.location.href,
  });
};

export const trackEvent = (name, params = {}) => {
  if (!isEnabled()) return;
  window.gtag('event', name, params);
};

// client_id của trình duyệt, gửi kèm đơn hàng để backend báo sự kiện purchase về đúng người mua
export const getAnalyticsClientId = () =>
  new Promise((resolve) => {
    if (!MEASUREMENT_ID || !window.gtag) {
      resolve(null);
      return;
    }
    // Trình chặn quảng cáo có thể chặn gtag.js → không chờ mãi
    const timer = setTimeout(() => resolve(null), 1000);
    window.gtag('get', MEASUREMENT_ID, 'client_id', (clientId) => {
      clearTimeout(timer);
      resolve(clientId || null);
    });
  });
