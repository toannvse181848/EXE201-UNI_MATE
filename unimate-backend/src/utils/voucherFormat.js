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
  // Hoá đơn tối thiểu tính trên phần của người dùng mã: ưu đãi hẹn cafe mỗi bạn một mã nên ghi rõ "mỗi bạn"
  const billLabel =
    minBill > 0
      ? `${voucher.meetupReward ? 'Mỗi bạn gọi từ' : 'Hoá đơn từ'} ${formatVnd(minBill)}`
      : 'Không yêu cầu hoá đơn tối thiểu';
  const scheduleLabel = describeSchedule(voucher);
  const dailyLimit = Number(voucher.dailyLimit) || 0;
  const conditionLabel = [billLabel, scheduleLabel && `Chỉ dùng ${scheduleLabel}`, dailyLimit > 0 && `Tối đa ${dailyLimit} lượt/ngày`]
    .filter(Boolean)
    .join(' · ');
  return { discountType, discountLabel, discountShort, conditionLabel, scheduleLabel };
};

/** Gắn nhãn hiển thị vào bản ghi voucher (document hoặc object thường) */
/**
 * Thu ngân cần nhập gì vào máy tính tiền của quán khi áp dụng `people` mã cùng một voucher (UNI-MATE không đụng tới tiền).
 * Mỗi mã giảm trên phần gọi của người có mã: 2 mã "giảm 10.000đ" là giảm 20.000đ, 2 mã "tặng 1 bánh" là mỗi bạn 1 bánh.
 * @returns { posLabel, minBillLabel | null }
 */
const describeCounterDiscount = (voucher, people = 1) => {
  const n = Math.max(1, Number(people) || 1);
  const type = getDiscountType(voucher);
  const max = Number(voucher.maxDiscount) || 0;
  let posLabel;
  if (type === 'percent') {
    const scope = n > 1 ? `trên phần gọi của ${n} bạn có mã` : 'hoá đơn';
    posLabel = `Giảm ${voucher.discountPercent}% ${scope}${max > 0 ? `, ${n > 1 ? 'mỗi bạn ' : ''}tối đa ${formatVnd(max)}` : ''}`;
  } else if (type === 'amount') {
    const amount = Number(voucher.discountAmount) || 0;
    posLabel = n > 1 ? `Giảm ${formatVnd(amount * n)} (${n} × ${formatVnd(amount)})` : `Giảm ${formatVnd(amount)}`;
  } else {
    const gift = voucher.giftItem || 'quà tặng';
    posLabel = n > 1 ? `Tặng ${gift} cho mỗi bạn (${n} bạn)` : `Tặng ${gift}`;
  }
  const minBill = Number(voucher.minBill) || 0;
  const minBillLabel =
    minBill > 0
      ? n > 1
        ? `Mỗi bạn gọi từ ${formatVnd(minBill)} (${n} bạn chung hoá đơn: từ ${formatVnd(minBill * n)})`
        : `Hoá đơn từ ${formatVnd(minBill)}`
      : null;
  // Giảm % mà chung hoá đơn với bạn không có mã: hệ thống không biết ai gọi món gì, thu ngân chia đều theo đầu người
  const splitHint =
    type === 'percent' && n > 1
      ? `Chung hoá đơn với bạn không có mã: chia đều hoá đơn theo số người, lấy phần của ${n} bạn có mã rồi giảm ${voucher.discountPercent}%`
      : null;
  return { posLabel, minBillLabel, splitHint };
};

const withVoucherLabels = (voucher) => {
  if (!voucher) return voucher;
  const plain = typeof voucher.toObject === 'function' ? voucher.toObject() : { ...voucher };
  return { ...plain, ...describeVoucherValue(plain) };
};

module.exports = { DISCOUNT_TYPES, formatVnd, getDiscountType, describeSchedule, isWithinSchedule, describeVoucherValue, describeCounterDiscount, withVoucherLabels };
