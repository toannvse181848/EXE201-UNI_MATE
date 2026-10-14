const crypto = require('crypto');

/**
 * Mã QR check-in cố định dán tại quán.
 * Nội dung QR: UNIMATE-CHECKIN:<venueId>:<secret>
 * Lộ ảnh QR thì admin/partner tạo secret mới và in lại QR.
 */

const QR_PREFIX = 'UNIMATE-CHECKIN';

// Toạ độ mặc định của Venue model (trung tâm TP.HCM) = quán chưa nhập toạ độ thật
const PLACEHOLDER_COORDS = [106.6667, 10.7769];

// Bán kính cho phép check-in, tính cả sai số GPS trong nhà
const CHECKIN_RADIUS_METERS = 300;

const generateSecret = () => crypto.randomBytes(12).toString('hex').toUpperCase();

const buildQrContent = (venueId, secret) => `${QR_PREFIX}:${venueId}:${secret}`;

/** Tách nội dung QR → { venueId, secret } hoặc null nếu sai định dạng */
const parseQrContent = (content) => {
  if (typeof content !== 'string') return null;
  const parts = content.trim().split(':');
  if (parts.length !== 3 || parts[0].toUpperCase() !== QR_PREFIX) return null;
  const [, venueId, secret] = parts;
  if (!/^[a-f0-9]{24}$/i.test(venueId) || !secret) return null;
  return { venueId, secret: secret.toUpperCase() };
};

/** So sánh secret an toàn trước tấn công đo thời gian */
const secretMatches = (expected, provided) => {
  if (!expected || !provided) return false;
  const a = Buffer.from(String(expected));
  const b = Buffer.from(String(provided).toUpperCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

const hasRealCoordinates = (venue) => {
  const coords = venue.location?.coordinates;
  if (!Array.isArray(coords) || coords.length !== 2) return false;
  return !(coords[0] === PLACEHOLDER_COORDS[0] && coords[1] === PLACEHOLDER_COORDS[1]);
};

/** Khoảng cách (mét) giữa 2 điểm theo công thức haversine */
const distanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

module.exports = {
  CHECKIN_RADIUS_METERS,
  generateSecret,
  buildQrContent,
  parseQrContent,
  secretMatches,
  hasRealCoordinates,
  distanceMeters,
};
