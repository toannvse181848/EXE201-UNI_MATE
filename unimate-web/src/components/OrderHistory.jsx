import React, { useEffect, useState } from 'react';
import { Receipt, RefreshCw, Star } from 'lucide-react';
import { orderApi } from '../services/api';
import { formatVnd } from '../hooks/usePremiumPlans';
import ReviewOrderModal from './ReviewOrderModal';

const STATUS_STYLE = {
  pending: { label: 'Chờ thanh toán', color: '#B45309', background: '#FEF3C7' },
  paid: { label: 'Đã thanh toán', color: '#15803D', background: '#DCFCE7' },
  cancelled: { label: 'Đã huỷ', color: '#64748B', background: '#F1F5F9' },
};

const formatDateTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : '');

/**
 * Lịch sử giao dịch của người dùng đang đăng nhập.
 * Ẩn khi chưa có đơn nào; đơn đang chờ có nút tiếp tục thanh toán (onResume mở lại khung VietQR),
 * đơn đã thanh toán có nút đánh giá (1–5 sao + nhận xét) hoặc hiện số sao đã đánh giá.
 * refreshKey đổi thì tải lại (vd: khi đóng / mở khung thanh toán).
 */
export default function OrderHistory({ onResume, refreshKey }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [reviewing, setReviewing] = useState(null);

  const saveReview = (code, review) =>
    setOrders((list) => list.map((o) => (o.code === code ? { ...o, review } : o)));

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
                {/* Chỉ hiện khi backend đã hỗ trợ đánh giá (có trường review, kể cả null) */}
                {order.status === 'paid' && 'review' in order && (
                  <button
                    type="button"
                    onClick={() => setReviewing(order)}
                    title={order.review ? 'Sửa đánh giá' : 'Đánh giá đơn này'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '12px',
                      fontWeight: '700',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      border: order.review ? '1px solid #FDE68A' : '1px solid #FB923C',
                      backgroundColor: order.review ? '#FFFBEB' : '#E64A19',
                      color: order.review ? '#92400E' : '#FFFFFF',
                    }}
                  >
                    <Star size={13} fill={order.review ? '#F59E0B' : 'none'} color={order.review ? '#F59E0B' : '#FFFFFF'} />
                    {order.review ? `${order.review.rating}/5 · Sửa` : 'Đánh giá'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {reviewing && (
        <ReviewOrderModal
          order={reviewing}
          onClose={() => setReviewing(null)}
          onSaved={(review) => saveReview(reviewing.code, review)}
        />
      )}
    </div>
  );
}
