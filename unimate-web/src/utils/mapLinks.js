// Link Google Maps cho một quán — tìm theo "tên quán, địa chỉ", không cần API key.
// (Toạ độ trong DB đang là giá trị mặc định nên tìm theo địa chỉ chính xác hơn.)
const buildQuery = (venue) => [venue?.name, venue?.address].filter(Boolean).join(', ');

/** Mở Google Maps (web hoặc app trên điện thoại) tại vị trí quán */
export const getGoogleMapsUrl = (venue) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(buildQuery(venue))}`;

/** Bản đồ nhúng (iframe) hiển thị vị trí quán */
export const getGoogleMapsEmbedUrl = (venue) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(buildQuery(venue))}&z=16&output=embed`;
