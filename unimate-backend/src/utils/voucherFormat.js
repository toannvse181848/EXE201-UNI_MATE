/**
 * Cách hiển thị giá trị voucher — dùng chung cho mọi màn hình (web, app, trang quán)
 * để sinh viên và quán luôn thấy cùng một nội dung.
 */
const DISCOUNT_TYPES = ['percent', 'amount', 'gift'];

const formatVnd = (n) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
const formatShortVnd = (n) => (n >= 1000 && n % 1000 === 0 ? `${(n / 1000).toLocaleString('vi-VN')}K` : formatVnd(n));

/** Voucher cũ chưa có discountType thì suy ra từ số liệu đang lưu */
const getDiscountType = (voucher) => {
  if (DISCOUNT_TYPES.includes(voucher?.discountType)) return voucher.discountType;
  if (Number(voucher?.discountAmount) > 0) return 'amount';
  if (Number(voucher?.discountPercent) > 0) return 'percent';
  return 'gift';
};

/**
 * @returns { discountType, discountLabel: 'Giảm 20% (tối đa 30.000đ)', discountShort: '-20%', conditionLabel }
 */
const describeVoucherValue = (voucher) => {
  const discountType = getDiscountType(voucher);
  let discountLabel;
  let discountShort;
  if (discountType === 'percent') {
    const max = Number(voucher.maxDiscount) || 0;
    discountLabel = `Giảm ${voucher.discountPercent}%${max > 0 ? ` (tối đa ${formatVnd(max)})` : ''}`;
    discountShort = `-${voucher.discountPercent}%`;
  } else if (discountType === 'amount') {
    discountLabel = `Giảm ${formatVnd(voucher.discountAmount)}`;
    discountShort = `-${formatShortVnd(Number(voucher.discountAmount))}`;
  } else {
    discountLabel = voucher.giftItem ? `Tặng ${voucher.giftItem}` : 'Quà tặng';
    discountShort = 'Quà tặng';
  }
  const minBill = Number(voucher.minBill) || 0;
  const conditionLabel = minBill > 0 ? `Hoá đơn từ ${formatVnd(minBill)}` : 'Không yêu cầu hoá đơn tối thiểu';
  return { discountType, discountLabel, discountShort, conditionLabel };
};

/** Gắn nhãn hiển thị vào bản ghi voucher (document hoặc object thường) */
const withVoucherLabels = (voucher) => {
  if (!voucher) return voucher;
  const plain = typeof voucher.toObject === 'function' ? voucher.toObject() : { ...voucher };
  return { ...plain, ...describeVoucherValue(plain) };
};

module.exports = { DISCOUNT_TYPES, formatVnd, getDiscountType, describeVoucherValue, withVoucherLabels };
