/**
 * Luật giữ voucher trong ví.
 * Voucher miễn phí sinh viên tự lưu chỉ được giữ WALLET_HOLD_DAYS ngày (không quá hạn của voucher),
 * quá hạn chưa dùng thì tự trả lượt cho quán: sinh viên lưu cho có không làm hết lượt của quán.
 * Đặt WALLET_HOLD_DAYS=0 để tắt.
 */
const parsed = Number.parseInt(process.env.WALLET_HOLD_DAYS ?? '7', 10);
const WALLET_HOLD_DAYS = Number.isFinite(parsed) && parsed >= 0 ? parsed : 7;

/** Hạn giữ cho voucher vừa lưu, null nếu không giới hạn */
const holdUntilFor = (voucher, now = new Date()) => {
  if (!WALLET_HOLD_DAYS || voucher.meetupReward || (voucher.coinCost || 0) > 0) return null;
  const hold = new Date(now.getTime() + WALLET_HOLD_DAYS * 24 * 60 * 60 * 1000);
  return voucher.validUntil && new Date(voucher.validUntil) < hold ? new Date(voucher.validUntil) : hold;
};

module.exports = { WALLET_HOLD_DAYS, holdUntilFor };
