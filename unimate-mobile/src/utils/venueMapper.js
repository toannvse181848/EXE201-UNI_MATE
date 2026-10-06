// Chuyển dữ liệu quán / voucher từ backend sang dạng các màn hình mobile đang dùng

const DEFAULT_VENUE_IMAGE = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800';

/** Gom voucher công khai theo venueId (mỗi quán lấy voucher mới nhất) */
export const groupVouchersByVenue = (vouchers = []) =>
  vouchers.reduce((acc, voucher) => {
    const venueId = voucher.venueId?._id || voucher.venueId;
    if (venueId && !acc[venueId]) acc[venueId] = voucher;
    return acc;
  }, {});

/** Venue backend → card hiển thị trên mobile */
export const toVenueCard = (venue, voucher = null) => {
  const images = venue.images?.length ? venue.images : [venue.image || DEFAULT_VENUE_IMAGE];
  return {
    id: venue._id,
    name: venue.name,
    rating: venue.rating ?? 4.8,
    reviewsCount: venue.reviewsCount ?? 0,
    distance: venue.district || 'Gần bạn',
    address: venue.address,
    openHours: venue.openHours || '07:00 - 22:30',
    priceRange: venue.priceRange || '',
    image: images[0],
    images,
    voucherBadge: voucher?.title || 'Đối tác UNI-MATE',
    voucherId: voucher?._id || null,
    voucherCode: voucher?.code || null,
    voucherValidUntil: voucher?.validUntil || null,
    tags: venue.tags || [],
    category: venue.category || 'other',
    description: venue.description || '',
    amenities: venue.amenities || {},
  };
};

/** Số ngày còn lại tới hạn sử dụng, dạng "Còn 5 ngày" / "Hết hạn hôm nay" */
export const formatDaysLeft = (validUntil) => {
  if (!validUntil) return 'Không giới hạn';
  const msLeft = new Date(validUntil).getTime() - Date.now();
  if (msLeft <= 0) return 'Đã hết hạn';
  const days = Math.floor(msLeft / (24 * 60 * 60 * 1000));
  return days === 0 ? 'Hết hạn hôm nay' : `Còn ${days} ngày`;
};

/** Item trong ví (UserVoucher populate voucherId.venueId) → dạng hiển thị */
export const toWalletVoucher = (item) => {
  const voucher = item.voucherId || {};
  const venue = voucher.venueId || {};
  return {
    id: item._id,
    qrPayload: item.qrPayload,
    status: item.status, // saved | used | expired
    used: item.status !== 'saved',
    title: voucher.title || 'Voucher',
    code: voucher.code || '',
    validUntil: voucher.validUntil || null,
    venueName: venue.name || 'Quán đối tác UNI-MATE',
    image: venue.image || DEFAULT_VENUE_IMAGE,
  };
};

/** Link ảnh QR từ nội dung cần mã hoá */
export const qrImageUrl = (data, size = 220) =>
  `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(data)}`;
