import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { formatVnd } from '../hooks/usePremiumPlans';

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '—');

/** Màn hình xác nhận sau khi đơn chuyển sang "đã thanh toán" (dùng cho Premium sinh viên và Gói Đối tác) */
export default function PaymentSuccess({ order, expiresAt, onDone, accentColor = '#FF5722' }) {
  const rows = [
    ['Mã đơn hàng', order.code],
    ['Gói', order.planName],
    ['Số tiền', formatVnd(order.amount)],
    ['Thanh toán lúc', formatDateTime(order.paidAt)],
    ...(expiresAt ? [['Hiệu lực đến', new Date(expiresAt).toLocaleDateString('vi-VN')]] : []),
  ];

  return (
    <div style={{ textAlign: 'center' }}>
      <CheckCircle2 size={64} color="#22C55E" style={{ margin: '4px auto 10px', display: 'block' }} />
      <h3 style={{ fontSize: '20px', fontWeight: '900', color: 'var(--text-primary)', margin: '0 0 4px' }}>
        Thanh toán thành công!
      </h3>
      <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: '0 0 18px' }}>
        Gói của bạn đã được kích hoạt. Cảm ơn bạn đã ủng hộ UNI-MATE 🎉
      </p>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          padding: '14px 16px',
          borderRadius: '14px',
          backgroundColor: '#F8FAFC',
          border: '1px solid #E2E8F0',
          fontSize: '13px',
          marginBottom: '18px',
          textAlign: 'left',
        }}
      >
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <span style={{ color: '#64748B' }}>{label}</span>
            <strong style={{ color: '#1E293B' }}>{value}</strong>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: '12px',
          border: 'none',
          backgroundColor: accentColor,
          color: '#FFFFFF',
          fontWeight: '800',
          fontSize: '14px',
          cursor: 'pointer',
        }}
      >
        Hoàn tất
      </button>
    </div>
  );
}
