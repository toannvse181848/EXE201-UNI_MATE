// Ghi nhớ nguồn truy cập (mã UTM trên link, trang giới thiệu) để gửi kèm khi đăng ký,
// nhờ đó backend biết người dùng đến từ kênh nào (Facebook, TikTok, CLB...) cho báo cáo OC2/OC3.
const STORAGE_KEY = 'unimate_attribution';
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const read = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (saved && Date.now() - saved.savedAt < MAX_AGE_MS) return saved;
  } catch {
    // localStorage bị chặn hoặc dữ liệu hỏng
  }
  return null;
};

/** Gọi một lần khi mở web: link có UTM mới thì ghi đè, không có UTM thì giữ nguồn đã lưu */
export const captureAttribution = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const utm = {
      utmSource: params.get('utm_source'),
      utmMedium: params.get('utm_medium'),
      utmCampaign: params.get('utm_campaign'),
      utmContent: params.get('utm_content'),
    };
    const hasUtm = Object.values(utm).some(Boolean);
    const referrer =
      document.referrer && !document.referrer.startsWith(window.location.origin) ? document.referrer : '';
    // Vào thẳng (gõ địa chỉ, F5) thì không đè nguồn đã lưu trước đó
    if (!hasUtm && (!referrer || read())) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...utm, referrer: referrer.slice(0, 120), landingPath: window.location.pathname, savedAt: Date.now() })
    );
  } catch {
    // localStorage bị chặn: bỏ qua, đăng ký vẫn chạy bình thường
  }
};

/** Nguồn truy cập đã lưu (nếu còn hạn 30 ngày) để gửi kèm request đăng ký */
export const getAttribution = () => {
  const attribution = { ...read() };
  delete attribution.savedAt;
  return attribution;
};
