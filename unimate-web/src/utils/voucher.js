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

export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const DAY_LABELS = { 0: 'CN', 1: 'T2', 2: 'T3', 3: 'T4', 4: 'T5', 5: 'T6', 6: 'T7' };

// Ngày và giờ áp dụng, VD: 'T2–T6, 14:00–17:00'. Không giới hạn thì trả về chuỗi rỗng.
const describeSchedule = (v) => {
  const days = DAY_ORDER.filter((d) => (v.applyDays || []).includes(d));
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
  const timeText = v.applyFrom && v.applyTo ? `${v.applyFrom}–${v.applyTo}` : '';
  return [dayText, timeText].filter(Boolean).join(', ');
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
  // Cùng luật với backend: hoá đơn tối thiểu tính trên phần của người dùng mã
  const billLabel = minBill > 0 ? `${v.meetupReward ? 'Mỗi bạn gọi từ' : 'Hoá đơn từ'} ${formatVnd(minBill)}` : 'Không yêu cầu hoá đơn tối thiểu';
  const scheduleLabel = describeSchedule(v);
  return {
    discountType: type,
    discountLabel: v.discountLabel || discountLabel,
    discountShort: v.discountShort || discountShort,
    conditionLabel:
      v.conditionLabel ||
      [billLabel, scheduleLabel && `Chỉ dùng ${scheduleLabel}`, Number(v.dailyLimit) > 0 && `Tối đa ${Number(v.dailyLimit)} lượt/ngày`]
        .filter(Boolean)
        .join(' · '),
  };
};

/**
 * Thu ngân nhập gì vào máy tính tiền khi áp dụng `people` mã cùng một voucher. Giống hệt backend
 * (describeCounterDiscount trong voucherFormat.js): mỗi mã giảm trên phần gọi của người có mã.
 */
export const describeCounterDiscount = (v = {}, people = 1) => {
  const n = Math.max(1, Number(people) || 1);
  const type = getDiscountType(v);
  const max = Number(v.maxDiscount) || 0;
  let posLabel;
  if (type === 'percent') {
    const scope = n > 1 ? `trên phần gọi của ${n} bạn có mã` : 'hoá đơn';
    posLabel = `Giảm ${v.discountPercent}% ${scope}${max > 0 ? `, ${n > 1 ? 'mỗi bạn ' : ''}tối đa ${formatVnd(max)}` : ''}`;
  } else if (type === 'amount') {
    const amount = Number(v.discountAmount) || 0;
    posLabel = n > 1 ? `Giảm ${formatVnd(amount * n)} (${n} × ${formatVnd(amount)})` : `Giảm ${formatVnd(amount)}`;
  } else {
    const gift = v.giftItem || 'quà tặng';
    posLabel = n > 1 ? `Tặng ${gift} cho mỗi bạn (${n} bạn)` : `Tặng ${gift}`;
  }
  const minBill = Number(v.minBill) || 0;
  const minBillLabel =
    minBill > 0
      ? n > 1
        ? `Mỗi bạn gọi từ ${formatVnd(minBill)} (${n} bạn chung hoá đơn: từ ${formatVnd(minBill * n)})`
        : `Hoá đơn từ ${formatVnd(minBill)}`
      : null;
  // Giảm % mà chung hoá đơn với bạn không có mã: hệ thống không biết ai gọi món gì, thu ngân chia đều theo đầu người
  const splitHint =
    type === 'percent' && n > 1
      ? `Chung hoá đơn với bạn không có mã: chia đều hoá đơn theo số người, lấy phần của ${n} bạn có mã rồi giảm ${v.discountPercent}%`
      : null;
  return { posLabel, minBillLabel, splitHint };
};

// Ô nhập tiền: chỉ giữ chữ số, hiển thị có dấu chấm ngăn cách ("50000" → "50.000")
export const onlyDigits = (value) => String(value || '').replace(/\D/g, '');
export const groupDigits = (digits) => (digits ? Number(digits).toLocaleString('vi-VN') : '');
