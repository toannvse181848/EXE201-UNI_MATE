import React, { useEffect, useState } from 'react';
import { Receipt, RefreshCw } from 'lucide-react';
import { orderApi } from '../services/api';
import { formatVnd } from '../hooks/usePremiumPlans';

const STATUS_STYLE = {
  pending: { label: 'Chờ thanh toán', color: '#B45309', background: '#FEF3C7' },
  paid: { label: 'Đã thanh toán', color: '#15803D', background: '#DCFCE7' },
  cancelled: { label: 'Đã huỷ', color: '#64748B', background: '#F1F5F9' },
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

/**
 * Lịch sử giao dịch của người dùng đang đăng nhập.
 * Ẩn khi chưa có đơn nào; đơn đang chờ có nút tiếp tục thanh toán (onResume mở lại khung VietQR).
 * refreshKey đổi thì tải lại (vd: khi đóng / mở khung thanh toán).
 */
export default function OrderHistory({ onResume, refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    orderApi
      .getMyOrders()
      .then((res) => {
        if (active) setOrders(res?.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refreshKey, reloadCount]);

  if (orders.length === 0) return null;

  return (
    <div className="portal-card" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Receipt size={18} color="var(--text-primary)" />
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
            Lịch sử giao dịch
          </h3>
        </div>
        <button
          type="button"
          onClick={() => setReloadCount((n) => n + 1)}
          disabled={loading}
          title="Tải lại"
          style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex' }}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {orders.map((order) => {
          const status = STATUS_STYLE[order.status] || STATUS_STYLE.cancelled;
          return (
            <div
              key={order.code}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: '12px',
                border: '1px solid var(--border-color)',
                flexWrap: 'wrap',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>{order.planName}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {order.code} · {formatDateTime(order.paidAt || order.createdAt)}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <strong style={{ fontSize: '14px', color: 'var(--text-primary)' }}>{formatVnd(order.amount)}</strong>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: '800',
                    padding: '3px 10px',
                    borderRadius: '999px',
                    color: status.color,
                    backgroundColor: status.background,
                  }}
                >
                  {status.label}
                </span>
                {order.status === 'pending' && onResume && (
                  <button
                    type="button"
                    onClick={onResume}
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      border: '1px solid #FB923C',
                      backgroundColor: '#FFF7ED',
                      color: '#C2410C',
                      cursor: 'pointer',
                    }}
                  >
                    Tiếp tục thanh toán
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
