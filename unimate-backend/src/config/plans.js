/**
 * Danh mục gói trả phí của UNI-MATE — sửa giá / thời hạn tại đây là đủ.
 *
 * - amount: giá bán bằng tiền (VNĐ), thanh toán qua chuyển khoản VietQR (xem orderController)
 * - coinPrice: giá đổi bằng UniCoin; null = không cho đổi bằng coin
 * - role: loại tài khoản được mua gói ('student' gồm cả role 'user')
 */
const PLANS = {
  premium_monthly: {
    name: 'UniMate Premium 1 tháng',
    role: 'student',
    amount: 49000,
    // ~2-3 tuần điểm danh + check-in đều đặn (tối đa 60 coin/ngày), đủ giữ chân mà không làm mất người trả tiền
    coinPrice: 800,
    durationDays: 30,
  },
  premium_yearly: {
    name: 'UniMate Premium 1 năm',
    role: 'student',
    amount: 399000,
    // Gói năm chỉ bán bằng tiền
    coinPrice: null,
    durationDays: 365,
  },
  partner_monthly: {
    name: 'Gói Đối tác 1 tháng',
    role: 'partner',
    amount: 99000,
    coinPrice: null,
    durationDays: 30,
  },
};

// Tên gói cũ mà frontend đang gửi lên ('monthly' | 'yearly') → mã gói mới
const LEGACY_PLAN_ALIASES = {
  monthly: 'premium_monthly',
  yearly: 'premium_yearly',
};

const resolvePlanId = (plan) => LEGACY_PLAN_ALIASES[plan] || plan;

const getPlan = (plan) => PLANS[resolvePlanId(plan)] || null;

module.exports = { PLANS, getPlan, resolvePlanId };
