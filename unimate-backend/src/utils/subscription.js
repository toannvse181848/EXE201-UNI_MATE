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

/**
 * Kích hoạt gói và ghi thẳng vào database, chỉ $set các trường của gói.
 * Không lưu đè cả studentProfile như user.save(): coin vừa được cộng / trừ ở request khác không bị mất.
 * @returns { user, expiresAt } (user đã có gói mới), hoặc null nếu không tìm thấy user
 */
const activatePlanForUser = async (userId, plan, durationDays) => {
  const User = require('../models/User');
  const user = await User.findById(userId);
  if (!user) return null;
  const expiresAt = activatePlan(user, plan, durationDays);
  const $set =
    getPlan(plan)?.role === 'partner'
      ? { 'partnerProfile.plan': user.partnerProfile.plan, 'partnerProfile.planExpiresAt': user.partnerProfile.planExpiresAt }
      : {
          'studentProfile.isPremium': true,
          'studentProfile.premiumPlan': user.studentProfile.premiumPlan,
          'studentProfile.premiumExpiresAt': user.studentProfile.premiumExpiresAt,
        };
  await User.updateOne({ _id: userId }, { $set });
  return { user, expiresAt };
};

/** Kiểm tra role của user có được mua gói này không */
const canBuyPlan = (user, plan) => {
  const planInfo = getPlan(plan);
  if (!planInfo) return false;
  const isStudent = user.role === 'student' || user.role === 'user';
  return planInfo.role === 'partner' ? user.role === 'partner' : isStudent;
};

/** Premium sinh viên còn hạn (giống cách User.toPublicJSON tính) */
const isPremiumActive = (studentProfile) =>
  Boolean(
    studentProfile?.isPremium &&
      (!studentProfile.premiumExpiresAt || new Date(studentProfile.premiumExpiresAt).getTime() > Date.now())
  );

/** Đối tác còn hạn Gói Đối tác → quán được hiển thị nổi bật cho sinh viên */
const isPartnerPlanActive = (partnerProfile) =>
  Boolean(partnerProfile?.planExpiresAt && new Date(partnerProfile.planExpiresAt).getTime() > Date.now());

module.exports = { activatePlan, activatePlanForUser, canBuyPlan, isPremiumActive, isPartnerPlanActive };
