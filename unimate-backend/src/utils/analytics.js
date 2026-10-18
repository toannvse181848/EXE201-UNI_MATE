/**
 * Gửi sự kiện từ server lên Google Analytics 4 qua Measurement Protocol.
 * Dùng cho sự kiện xảy ra khi người dùng không còn mở trang, VD: admin xác nhận
 * đơn chuyển khoản sau vài giờ → purchase vẫn được tính cho đúng người mua.
 *
 * Cần GA4_MEASUREMENT_ID và GA4_API_SECRET (GA4 → Quản trị → Luồng dữ liệu →
 * Bí mật API Measurement Protocol). Thiếu biến môi trường thì bỏ qua.
 */

const GA_ENDPOINT = 'https://www.google-analytics.com/mp/collect';

// Định dạng client_id của gtag.js trên trình duyệt, VD: 1234567890.1712345678
const GA_CLIENT_ID_PATTERN = /^\d{1,20}\.\d{1,20}$/;

const isValidGaClientId = (value) => typeof value === 'string' && GA_CLIENT_ID_PATTERN.test(value);

const sendGaEvent = async ({ clientId, userId, name, params = {} }) => {
  const measurementId = process.env.GA4_MEASUREMENT_ID;
  const apiSecret = process.env.GA4_API_SECRET;
  if (!measurementId || !apiSecret) return;

  const url = `${GA_ENDPOINT}?${new URLSearchParams({ measurement_id: measurementId, api_secret: apiSecret })}`;
  try {
    await fetch(url, {
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        ...(userId ? { user_id: userId } : {}),
        // engagement_time_msec > 0 để GA4 tính đây là người dùng hoạt động
        events: [{ name, params: { engagement_time_msec: 1, ...params } }],
      }),
    });
  } catch (err) {
    // Lỗi gửi số liệu không được làm hỏng nghiệp vụ chính
    console.error('GA4 Measurement Protocol error:', err.message);
  }
};

/** Báo purchase khi đơn đã được admin xác nhận nhận tiền */
const trackPurchase = (order) => {
  const userId = order.userId.toString();
  return sendGaEvent({
    // Đơn tạo từ mobile hoặc bị chặn gtag thì không có client_id → dùng user id thay thế
    clientId: order.gaClientId || userId,
    userId,
    name: 'purchase',
    params: {
      transaction_id: order.code,
      currency: 'VND',
      value: order.amount,
      items: [{ item_id: order.plan, item_name: order.planName, price: order.amount, quantity: 1 }],
    },
  });
};

module.exports = { isValidGaClientId, sendGaEvent, trackPurchase };
