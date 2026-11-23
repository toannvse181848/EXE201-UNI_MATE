import React, { useState } from 'react';
import { Star, X, Loader2 } from 'lucide-react';
import { orderApi } from '../services/api';
import { trackEvent } from '../utils/analytics';
import { notify } from '../utils/notify';

const MIN_LENGTH = 5;
const MAX_LENGTH = 1000;
const RATING_HINT = ['', 'Rất không hài lòng', 'Chưa hài lòng', 'Bình thường', 'Hài lòng', 'Rất hài lòng'];

/**
 * Khung đánh giá một đơn đã thanh toán: chọn 1–5 sao + nhận xét.
 * order: { code, planName, review? } — có review thì mở ở chế độ sửa.
 * onSaved(review) được gọi sau khi lưu thành công.
 */
export default function ReviewOrderModal({ order, onClose, onSaved }) {
  const [rating, setRating] = useState(order.review?.rating || 0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState(order.review?.comment || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const editing = Boolean(order.review);
  const shown = hover || rating;

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return setError('Chọn số sao trước nhé');
    if (comment.trim().length < MIN_LENGTH) return setError(`Viết vài lời nhận xét (ít nhất ${MIN_LENGTH} ký tự)`);
    setSaving(true);
    setError('');
    try {
      const res = await orderApi.reviewOrder(order.code, { rating, comment: comment.trim() });
      if (!editing) trackEvent('review_submit', { rating, order_code: order.code });
      notify.success(res.message || 'Đã lưu đánh giá');
      onSaved?.(res.data);
      onClose();
    } catch (err) {
      setError(err.message || 'Không lưu được đánh giá');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        style={{ width: '100%', maxWidth: '440px', backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '22px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0F172A' }}>
              {editing ? 'Sửa đánh giá' : 'Đánh giá UNI-MATE'}
            </h3>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748B' }}>
              {order.planName} · đơn {order.code}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Đóng" style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: 4 }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', margin: '18px 0 4px' }} onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`${n} sao`}
              aria-pressed={rating === n}
              onClick={() => { setRating(n); setError(''); }}
              onMouseEnter={() => setHover(n)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 2, lineHeight: 0 }}
            >
              <Star size={32} color={n <= shown ? '#F59E0B' : '#CBD5E1'} fill={n <= shown ? '#F59E0B' : 'none'} />
            </button>
          ))}
        </div>
        <div style={{ minHeight: '18px', fontSize: '13px', fontWeight: 700, color: '#B45309' }}>{RATING_HINT[shown]}</div>

        <label style={{ display: 'block', marginTop: '12px', fontSize: '13px', fontWeight: 700, color: '#334155' }}>
          Bạn thấy UNI-MATE thế nào? Điều gì nên cải thiện?
          <textarea
            value={comment}
            onChange={(e) => { setComment(e.target.value.slice(0, MAX_LENGTH)); setError(''); }}
            rows={4}
            placeholder="VD: Kết bạn học nhóm nhanh, mong có thêm quán gần trường..."
            style={{ display: 'block', width: '100%', marginTop: '6px', padding: '10px 12px', borderRadius: '12px', border: '1.5px solid #E2E8F0', fontSize: '14px', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }}
          />
        </label>
        <div style={{ textAlign: 'right', fontSize: '11.5px', color: '#94A3B8', marginTop: '4px' }}>{comment.length}/{MAX_LENGTH}</div>

        {error && <div style={{ marginTop: '6px', fontSize: '13px', color: '#B91C1C' }}>{error}</div>}

        <button
          type="submit"
          disabled={saving}
          style={{ marginTop: '14px', width: '100%', padding: '12px', borderRadius: '12px', border: 'none', backgroundColor: '#E64A19', color: '#FFFFFF', fontSize: '15px', fontWeight: 800, cursor: saving ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          {saving ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Đang gửi...</> : editing ? 'Lưu thay đổi' : 'Gửi đánh giá'}
        </button>
        <p style={{ margin: '10px 0 0', fontSize: '11.5px', color: '#94A3B8', textAlign: 'center' }}>
          Đánh giá gắn với đơn hàng của bạn, nhóm UNI-MATE dùng để cải thiện sản phẩm.
        </p>
      </form>
    </div>
  );
}
