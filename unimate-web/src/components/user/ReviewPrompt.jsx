import React, { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import { orderApi } from '../../services/api';
import ReviewOrderModal from '../ReviewOrderModal';

const DISMISS_KEY = 'unimate_review_prompt_dismissed';

const readDismissed = () => {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
};

/**
 * Nhắc khách đã trả phí đánh giá đơn mới nhất chưa đánh giá. Không có đơn cần đánh giá thì không hiện gì.
 * "Để sau" ẩn đến hết phiên đăng nhập trên trình duyệt này.
 */
export default function ReviewPrompt() {
  const [order, setOrder] = useState(null);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    if (dismissed) return undefined;
    let active = true;
    orderApi
      .getMyOrders()
      .then((res) => {
        // review === null: backend mới, đơn chưa đánh giá. Backend cũ không trả trường review → không nhắc.
        const pending = (res?.data || []).find((o) => o.status === 'paid' && o.review === null);
        if (active) setOrder(pending || null);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [dismissed]);

  if (!order || dismissed) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* trình duyệt chặn lưu trữ: chỉ ẩn trong lần mở trang này */
    }
    setDismissed(true);
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        flexWrap: 'wrap',
        padding: '16px 18px',
        marginBottom: '20px',
        borderRadius: '16px',
        backgroundColor: '#FFFBEB',
        border: '1px solid #FDE68A',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Star size={22} color="#F59E0B" fill="#F59E0B" />
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 800, color: '#78350F' }}>Bạn thấy {order.planName} thế nào?</div>
          <div style={{ fontSize: '13px', color: '#92400E' }}>Chấm sao và để lại vài dòng giúp nhóm UNI-MATE làm tốt hơn, mất khoảng 30 giây.</div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          type="button"
          onClick={dismiss}
          style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #FDE68A', backgroundColor: '#FFFFFF', color: '#92400E', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}
        >
          Để sau
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{ padding: '9px 16px', borderRadius: '10px', border: 'none', backgroundColor: '#E64A19', color: '#FFFFFF', fontSize: '13px', fontWeight: 800, cursor: 'pointer' }}
        >
          Đánh giá ngay
        </button>
      </div>

      {open && (
        <ReviewOrderModal
          order={order}
          onClose={() => setOpen(false)}
          onSaved={() => setOrder(null)}
        />
      )}
    </div>
  );
}
