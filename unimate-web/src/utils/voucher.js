// Cách hiển thị giá trị voucher — giống hệt backend (unimate-backend/src/utils/voucherFormat.js).
// API đã trả sẵn discountLabel / discountShort / conditionLabel; hàm này dùng cho phần xem trước
// khi quán đang điền form, và làm dự phòng khi dữ liệu cũ chưa có nhãn.

export const formatVnd = (n) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')}đ`;
const formatShortVnd = (n) => (n >= 1000 && n % 1000 === 0 ? `${(n / 1000).toLocaleString('vi-VN')}K` : formatVnd(n));

export const getDiscountType = (v) => {
  if (['percent', 'amount', 'gift'].includes(v?.discountType)) return v.discountType;
  if (Number(v?.discountAmount) > 0) return 'amount';
  if (Number(v?.discountPercent) > 0) return 'percent';
  return 'gift';
};

export const describeVoucher = (v = {}) => {
  const type = getDiscountType(v);
  let discountLabel;
  let discountShort;
  if (type === 'percent') {
    const max = Number(v.maxDiscount) || 0;
    discountLabel = `Giảm ${v.discountPercent || 0}%${max > 0 ? ` (tối đa ${formatVnd(max)})` : ''}`;
    discountShort = `-${v.discountPercent || 0}%`;
  } else if (type === 'amount') {
    discountLabel = `Giảm ${formatVnd(v.discountAmount)}`;
    discountShort = `-${formatShortVnd(Number(v.discountAmount) || 0)}`;
  } else {
    discountLabel = v.giftItem ? `Tặng ${v.giftItem}` : 'Quà tặng';
    discountShort = 'Quà tặng';
  }
  const minBill = Number(v.minBill) || 0;
  return {
    discountType: type,
    discountLabel: v.discountLabel || discountLabel,
    discountShort: v.discountShort || discountShort,
    conditionLabel: v.conditionLabel || (minBill > 0 ? `Hoá đơn từ ${formatVnd(minBill)}` : 'Không yêu cầu hoá đơn tối thiểu'),
  };
};

// Ô nhập tiền: chỉ giữ chữ số, hiển thị có dấu chấm ngăn cách ("50000" → "50.000")
export const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
export const groupDigits = (digits) => (digits ? Number(digits).toLocaleString('vi-VN') : '');
