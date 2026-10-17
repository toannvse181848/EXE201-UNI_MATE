import React from 'react';
import { Crown, CheckCircle2, Zap, Coffee, Coins } from 'lucide-react';
import usePremiumPlans, { PREMIUM_PLAN_LABEL, formatVnd } from '../../hooks/usePremiumPlans';

const BENEFITS = [
  { icon: CheckCircle2, color: '#0284C7', bg: '#E0F2FE', text: 'Tích xanh xác thực sinh viên' },
  { icon: Zap, color: '#D97706', bg: '#FEF3C7', text: 'Ưu tiên hiện trong gợi ý kết bạn' },
  { icon: Coffee, color: '#15803D', bg: '#DCFCE7', text: 'Voucher cafe đối tác độc quyền' },
];

// Chữ trên nút của từng gói, tuỳ người dùng đang dùng gói nào
const getActionLabel = (planKey, user) => {
  if (!user?.isPremium) return 'Nâng cấp ngay';
  if (user.premiumPlan === planKey) return 'Gia hạn gói này';
  return planKey === 'yearly' ? 'Chuyển sang gói năm' : 'Gia hạn thêm 1 tháng';
};

/**
 * Mục "Ưu đãi & Gói Premium" ở trang UniCoin: xem các gói, gói đang dùng,
 * và nâng cấp / gia hạn / đổi gói kể cả khi đã là Premium.
 * onChoosePlan(planKey) — mở luồng thanh toán (modal Premium ở trang Hồ sơ).
 */
export default function PremiumOffersCard({ user, onChoosePlan }) {
  const plans = usePremiumPlans();
  const expiresText = user?.premiumExpiresAt
    ? new Date(user.premiumExpiresAt).toLocaleDateString('vi-VN')
    : null;
  const yearlySavingPercent = Math.round((1 - plans.yearly.amount / (plans.monthly.amount * 12)) * 100);

  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '24px',
        padding: '28px',
        border: '1px solid #E2E8F0',
        boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        marginBottom: '32px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Crown size={22} color="#F59E0B" />
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1E293B' }}>Ưu đãi & Gói Premium</h2>
        </div>
        <span
          style={{
            fontSize: '12px',
            fontWeight: '700',
            padding: '5px 12px',
            borderRadius: '20px',
            backgroundColor: user?.isPremium ? '#E0F2FE' : '#F1F5F9',
            color: user?.isPremium ? '#0369A1' : '#64748B',
          }}
        >
          {user?.isPremium
            ? `Đang dùng ${PREMIUM_PLAN_LABEL[user.premiumPlan] || 'Premium'}${expiresText ? ` • hết hạn ${expiresText}` : ''}`
            : 'Bạn chưa có Premium'}
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '20px' }}>
        {BENEFITS.map(({ icon: Icon, color, bg, text }) => (
          <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: '12px', backgroundColor: '#F8FAFC', fontSize: '13px', color: '#334155', fontWeight: '600' }}>
            <span style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Icon size={14} color={color} />
            </span>
            {text}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
        {Object.entries(plans).map(([planKey, plan]) => {
          const isCurrent = user?.isPremium && user.premiumPlan === planKey;
          return (
            <div
              key={planKey}
              style={{
                position: 'relative',
                padding: '20px',
                borderRadius: '18px',
                border: `2px solid ${isCurrent ? '#0284C7' : '#E2E8F0'}`,
                backgroundColor: isCurrent ? '#F0F9FF' : '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              {isCurrent && (
                <span style={{ position: 'absolute', top: '-11px', left: '14px', backgroundColor: '#0284C7', color: '#FFFFFF', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '10px' }}>
                  GÓI HIỆN TẠI
                </span>
              )}
              {planKey === 'yearly' && yearlySavingPercent > 0 && (
                <span style={{ position: 'absolute', top: '-11px', right: '14px', backgroundColor: '#10B981', color: '#FFFFFF', fontSize: '10px', fontWeight: '800', padding: '3px 10px', borderRadius: '10px' }}>
                  TIẾT KIỆM {yearlySavingPercent}%
                </span>
              )}
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
                {plan.label} ({plan.durationDays} ngày)
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: '#1E293B' }}>{formatVnd(plan.amount)}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: plan.coinPrice != null ? '#B45309' : '#94A3B8', fontWeight: '600' }}>
                <Coins size={14} />
                {plan.coinPrice != null ? `Hoặc đổi ${plan.coinPrice} UniCoin` : 'Chỉ thanh toán chuyển khoản VietQR'}
              </div>
              <button
                type="button"
                onClick={() => onChoosePlan(planKey)}
                style={{
                  marginTop: '10px',
                  padding: '11px',
                  borderRadius: '12px',
                  border: 'none',
                  backgroundColor: isCurrent ? '#0284C7' : '#FF5722',
                  color: '#FFFFFF',
                  fontSize: '13.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                }}
              >
                {getActionLabel(planKey, user)}
              </button>
            </div>
          );
        })}
      </div>

      {user?.isPremium && (
        <p style={{ margin: '14px 0 0', fontSize: '12px', color: '#64748B' }}>
          Mua thêm gói khi đang Premium thì thời hạn được cộng dồn vào hạn hiện tại, không bị mất ngày còn lại.
        </p>
      )}
    </div>
  );
}
