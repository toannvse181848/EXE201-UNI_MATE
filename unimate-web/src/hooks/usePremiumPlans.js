import { useEffect, useState } from 'react';
import { orderApi } from '../services/api';

// Giá mặc định các gói Premium sinh viên — khớp unimate-backend/src/config/plans.js.
// Hook bên dưới tải giá thật từ GET /api/orders/plans rồi ghi đè lên.
// key (monthly | yearly) là tên gói mà API đổi UniCoin / tạo đơn đang nhận.
export const DEFAULT_PREMIUM_PLANS = {
  monthly: { id: 'premium_monthly', label: 'Gói tháng', durationDays: 30, amount: 49000, coinPrice: 800 },
  yearly: { id: 'premium_yearly', label: 'Gói năm', durationDays: 365, amount: 399000, coinPrice: null },
};

export const PREMIUM_PLAN_LABEL = { monthly: 'Gói tháng', yearly: 'Gói năm', lifetime: 'Gói trọn đời' };

export const formatVnd = (amount) => `${Number(amount || 0).toLocaleString('vi-VN')}đ`;

const mergePremiumPlans = (apiPlans) => {
  const merged = { ...DEFAULT_PREMIUM_PLANS };
  Object.entries(DEFAULT_PREMIUM_PLANS).forEach(([key, plan]) => {
    const fromApi = apiPlans.find((p) => p.id === plan.id);
    if (fromApi) {
      merged[key] = {
        ...plan,
        amount: fromApi.amount,
        coinPrice: fromApi.coinPrice ?? null,
        durationDays: fromApi.durationDays,
      };
    }
  });
  return merged;
};

/** Bảng giá gói Premium sinh viên: { monthly: {...}, yearly: {...} } */
export default function usePremiumPlans(enabled = true) {
  const [plans, setPlans] = useState(DEFAULT_PREMIUM_PLANS);

  useEffect(() => {
    if (!enabled) return undefined;
    let isActive = true;
    orderApi
      .getPlans()
      .then((res) => {
        if (isActive && Array.isArray(res?.data)) setPlans(mergePremiumPlans(res.data));
      })
      .catch(() => {});
    return () => {
      isActive = false;
    };
  }, [enabled]);

  return plans;
}
