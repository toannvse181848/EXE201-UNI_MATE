const { getPlan, resolvePlanId } = require('../config/plans');

const DAY_MS = 24 * 60 * 60 * 1000;

// premiumPlan trong User model chỉ nhận 'monthly' | 'yearly' | 'lifetime'
const STUDENT_PLAN_FIELD = {
  premium_monthly: 'monthly',
  premium_yearly: 'yearly',
};

/** Còn hạn thì cộng nối tiếp vào hạn cũ, hết hạn thì tính từ bây giờ */
const extendFrom = (currentExpiry, durationDays) => {
  const now = Date.now();
  const base = currentExpiry && new Date(currentExpiry).getTime() > now
    ? new Date(currentExpiry).getTime()
    : now;
  return new Date(base + durationDays * DAY_MS);
};

/**
 * Kích hoạt gói cho user (chưa save — người gọi tự save).
 * Dùng chung cho: xác nhận đơn hàng, đổi bằng UniCoin, admin cấp tay.
 */
const activatePlan = (user, plan, durationDays) => {
  const planId = resolvePlanId(plan);
  const planInfo = getPlan(planId);
  if (!planInfo) throw new Error(`Gói không tồn tại: ${plan}`);
  const days = durationDays || planInfo.durationDays;

  if (planInfo.role === 'partner') {
    if (!user.partnerProfile) user.partnerProfile = {};
    user.partnerProfile.plan = planId;
    user.partnerProfile.planExpiresAt = extendFrom(user.partnerProfile.planExpiresAt, days);
    user.markModified('partnerProfile');
    return user.partnerProfile.planExpiresAt;
  }

  if (!user.studentProfile) user.studentProfile = {};
  // Tích xanh được suy ra từ isPremium trong toPublicJSON nên hết hạn Premium là mất tích xanh
  user.studentProfile.isPremium = true;
  user.studentProfile.premiumPlan = STUDENT_PLAN_FIELD[planId] || 'monthly';
  user.studentProfile.premiumExpiresAt = extendFrom(user.studentProfile.premiumExpiresAt, days);
  user.markModified('studentProfile');
  return user.studentProfile.premiumExpiresAt;
};

/** Kiểm tra role của user có được mua gói này không */
const canBuyPlan = (user, plan) => {
  const planInfo = getPlan(plan);
  if (!planInfo) return false;
  const isStudent = user.role === 'student' || user.role === 'user';
  return planInfo.role === 'partner' ? user.role === 'partner' : isStudent;
};

module.exports = { activatePlan, canBuyPlan };
