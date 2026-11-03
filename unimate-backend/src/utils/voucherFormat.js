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

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const DAY_LABELS = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };

/** Ngày và giờ áp dụng, VD: 'T2–T6, 14:00–17:00'. Không giới hạn thì trả về chuỗi rỗng. */
const describeSchedule = (voucher) => {
  const days = DAY_ORDER.filter((d) => (voucher?.applyDays || []).includes(d));
  // Gom các ngày liền nhau: T2, T3, T4 → T2–T4
  const groups = [];
  days.forEach((day) => {
    const last = groups[groups.length - 1];
    if (last && DAY_ORDER.indexOf(last[last.length - 1]) === DAY_ORDER.indexOf(day) - 1) last.push(day);
    else groups.push([day]);
  });
  const dayText = groups
    .map((g) => (g.length > 2 ? `${DAY_LABELS[g[0]]}–${DAY_LABELS[g[g.length - 1]]}` : g.map((d) => DAY_LABELS[d]).join(', ')))
    .join(', ');
  const timeText = voucher?.applyFrom && voucher?.applyTo ? `${voucher.applyFrom}–${voucher.applyTo}` : '';
  return [dayText, timeText].filter(Boolean).join(', ');
};

/** Thời điểm now (giờ Việt Nam) có nằm trong ngày và giờ áp dụng của voucher không */
const isWithinSchedule = (voucher, now = Date.now()) => {
  const vn = new Date(now + 7 * 60 * 60 * 1000);
  const days = voucher?.applyDays || [];
  if (days.length > 0 && !days.includes(vn.getUTCDay())) return false;
  if (!voucher?.applyFrom || !voucher?.applyTo) return true;
  const time = `${String(vn.getUTCHours()).padStart(2, '0')}:${String(vn.getUTCMinutes()).padStart(2, '0')}`;
  return time >= voucher.applyFrom && time < voucher.applyTo;
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
  const billLabel = minBill > 0 ? `Hoá đơn từ ${formatVnd(minBill)}` : 'Không yêu cầu hoá đơn tối thiểu';
  const scheduleLabel = describeSchedule(voucher);
  const conditionLabel = scheduleLabel ? `${billLabel} · Chỉ dùng ${scheduleLabel}` : billLabel;
  return { discountType, discountLabel, discountShort, conditionLabel, scheduleLabel };
};

/** Gắn nhãn hiển thị vào bản ghi voucher (document hoặc object thường) */
const withVoucherLabels = (voucher) => {
  if (!voucher) return voucher;
  const plain = typeof voucher.toObject === 'function' ? voucher.toObject() : { ...voucher };
  return { ...plain, ...describeVoucherValue(plain) };
};

module.exports = { DISCOUNT_TYPES, formatVnd, getDiscountType, describeSchedule, isWithinSchedule, describeVoucherValue, withVoucherLabels };
