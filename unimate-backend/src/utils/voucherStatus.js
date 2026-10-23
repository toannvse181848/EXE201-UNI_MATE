const User = require('../models/User');
const UserVoucher = require('../models/UserVoucher');
const VoucherCode = require('../models/VoucherCode');
const Redemption = require('../models/Redemption');
const { withVoucherLabels } = require('./voucherFormat');
const { hasSharedStock, issuedOf } = require('./voucherStock');

/**
 * Trạng thái voucher — MỘT cách tính duy nhất cho trang sinh viên, trang quán và trang admin.
 * Thứ tự ưu tiên: vấn đề của quán trước, rồi tới bản thân voucher.
 * Chỉ voucher 'active' mới hiện cho sinh viên và lưu / nhận được.
 */
const VOUCHER_STATUS_LABEL = {
  active: 'Đang chạy',
  paused: 'Tạm dừng',
  expired: 'Hết hạn',
  sold_out: 'Hết lượt',
  venue_pending: 'Chờ duyệt quán',
  venue_rejected: 'Quán bị từ chối',
  partner_suspended: 'Quán bị khoá',
};

/**
 * @param voucher        voucher (venueId đã populate 'status' nếu có)
 * @param partnerStatus  trạng thái tài khoản quán ('active' | 'pending' | 'suspended')
 * @param freeCodes      số mã riêng còn trống (chỉ với voucher mã riêng)
 */
const getVoucherStatus = (voucher, { partnerStatus, freeCodes, now = Date.now() } = {}) => {
  const venueStatus = voucher.venueId?.status;
  if (partnerStatus === 'suspended') return 'partner_suspended';
  if (venueStatus === 'rejected') return 'venue_rejected';
  if (venueStatus && venueStatus !== 'approved') return 'venue_pending';
  if (!voucher.isActive) return 'paused';
  if (voucher.validUntil && new Date(voucher.validUntil).getTime() < now) return 'expired';
  if (voucher.codeType === 'unique') {
    if (freeCodes !== undefined && freeCodes <= 0) return 'sold_out';
  } else if (!hasSharedStock(voucher)) {
    return 'sold_out';
  }
  return 'active';
};

const countBy = async (Model, match, groupExtra = {}) =>
  Model.aggregate([{ $match: match }, { $group: { _id: '$voucherId', count: { $sum: 1 }, ...groupExtra } }]);

/**
 * Gắn nhãn giá trị + trạng thái + số liệu (đã lưu, đã dùng qua ví / nhập mã, mã còn trống)
 * cho danh sách voucher. venueId nên populate kèm 'status'.
 */
const annotateVouchers = async (vouchers) => {
  if (!vouchers.length) return [];
  const ids = vouchers.map((v) => v._id);
  const partnerIds = [...new Set(vouchers.map((v) => String(v.partnerId?._id || v.partnerId)))];

  const [partners, claims, walletUsed, freeCodes, redemptions] = await Promise.all([
    User.find({ _id: { $in: partnerIds } }).select('status'),
    countBy(UserVoucher, { voucherId: { $in: ids } }),
    countBy(UserVoucher, { voucherId: { $in: ids }, status: 'used' }),
    countBy(VoucherCode, { voucherId: { $in: ids }, userId: null }),
    Redemption.aggregate([
      { $match: { voucherId: { $in: ids } } },
      { $group: { _id: { voucherId: '$voucherId', method: '$method' }, count: { $sum: 1 } } },
    ]),
  ]);

  const toMap = (rows) => new Map(rows.map((r) => [String(r._id), r.count]));
  const partnerStatus = new Map(partners.map((p) => [String(p._id), p.status]));
  const claimMap = toMap(claims);
  const walletUsedMap = toMap(walletUsed);
  const freeMap = toMap(freeCodes);
  const redeemMap = new Map();
  for (const r of redemptions) {
    const key = String(r._id.voucherId);
    redeemMap.set(key, { ...(redeemMap.get(key) || { qr: 0, code: 0 }), [r._id.method]: r.count });
  }

  const now = Date.now();
  return vouchers.map((v) => {
    const key = String(v._id);
    const labeled = withVoucherLabels(v);
    const status = getVoucherStatus(labeled, {
      partnerStatus: partnerStatus.get(String(v.partnerId?._id || v.partnerId)),
      freeCodes: v.codeType === 'unique' ? freeMap.get(key) || 0 : undefined,
      now,
    });
    const used = redeemMap.get(key) || { qr: 0, code: 0 };
    return {
      ...labeled,
      status,
      statusLabel: VOUCHER_STATUS_LABEL[status],
      // Số lượt sinh viên đã lưu vào ví
      claimedCount: claimMap.get(key) || 0,
      // Số voucher trong ví đã được quán quét (luôn ≤ claimedCount)
      walletUsedCount: walletUsedMap.get(key) || 0,
      // Lượt dùng tại quầy theo cách áp: quét ví (có tên sinh viên) / nhập mã chung (không biết ai)
      redeemedByQr: used.qr || 0,
      redeemedByCode: used.code || 0,
      freeCodes: v.codeType === 'unique' ? freeMap.get(key) || 0 : null,
      // Mã chung: số lượt còn phát được (null = không giới hạn / mã riêng)
      remainingCount: v.codeType === 'unique' || v.isUnlimited ? null : Math.max(0, v.quantity - issuedOf(v)),
    };
  });
};

module.exports = { VOUCHER_STATUS_LABEL, getVoucherStatus, annotateVouchers };
