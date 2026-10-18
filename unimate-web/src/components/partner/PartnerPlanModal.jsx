import React, { useEffect, useState } from 'react';
import { X, Crown, Sparkles, TrendingUp, CalendarCheck, Copy, CheckCircle, Loader2 } from 'lucide-react';
import { orderApi } from '../../services/api';
import { formatVnd } from '../../hooks/usePremiumPlans';
import { trackEvent, getAnalyticsClientId } from '../../utils/analytics';
import PaymentSuccess from '../PaymentSuccess';

const PARTNER_PLAN_ID = 'partner_monthly';
// Giá mặc định khớp unimate-backend/src/config/plans.js, ghi đè bằng giá thật từ API
const DEFAULT_PARTNER_PLAN = { name: 'Gói Đối tác 1 tháng', amount: 99000, durationDays: 30 };
const POLL_INTERVAL_MS = 4000;

const BENEFITS = [
  { icon: TrendingUp, text: 'Quán được xếp lên đầu danh sách quán sinh viên xem trên UNI-MATE' },
  { icon: Sparkles, text: 'Huy hiệu "Đối tác nổi bật" trên ảnh quán' },
  { icon: CalendarCheck, text: 'Gia hạn cộng dồn: mua thêm khi còn hạn không bị mất ngày' },
];

/** Mua Gói Đối tác: tạo đơn → chuyển khoản VietQR → admin xác nhận → gói được kích hoạt */
export default function PartnerPlanModal({ isOpen, onClose, onPaid, planExpiresAt }) {
  const [plan, setPlan] = useState(DEFAULT_PARTNER_PLAN);
  const [checkout, setCheckout] = useState(null); // { order, payment }
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'success' | 'error', text }
  const [copiedField, setCopiedField] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    orderApi
      .getPlans()
      .then((res) => {
        const found = res?.data?.find((p) => p.id === PARTNER_PLAN_ID);
        if (found) setPlan(found);
      })
      .catch(() => {});
  }, [isOpen]);

  // Mở lại modal (vd: sau khi tắt tab) thì hiện tiếp đơn Gói Đối tác đang chờ, không bắt tạo lại
  useEffect(() => {
    if (!isOpen || checkout) return undefined;
    let active = true;
    orderApi
      .getMyOrders()
      .then(async (res) => {
        const pending = res?.data?.find((o) => o.status === 'pending' && o.plan === PARTNER_PLAN_ID);
        if (!pending || !active) return;
        const detail = await orderApi.getOrder(pending.code);
        if (active && detail?.data?.payment) setCheckout(detail.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [isOpen, checkout]);

  // Tự kiểm tra đơn đến khi được xác nhận đã nhận tiền
  useEffect(() => {
    if (!isOpen || checkout?.order?.status !== 'pending') return undefined;
    const timer = setInterval(async () => {
      try {
        const res = await orderApi.getOrder(checkout.order.code);
        const status = res?.data?.order?.status;
        if (status === 'paid') {
          setCheckout((prev) => ({ ...prev, order: res.data.order }));
          setNotice(null);
          onPaid?.();
        } else if (status === 'cancelled') {
          setCheckout(null);
          setNotice({ type: 'error', text: 'Đơn hàng đã bị huỷ.' });
        }
      } catch {
        // Lỗi mạng tạm thời: lần kiểm tra sau sẽ thử lại
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isOpen, checkout?.order?.status, checkout?.order?.code, onPaid]);

  if (!isOpen) return null;

  // Đóng sau khi đã thanh toán thì lần mở sau bắt đầu lại từ màn hình chọn gói
  const handleClose = () => {
    if (checkout?.order?.status === 'paid') setCheckout(null);
    setNotice(null);
    onClose();
  };

  const handleCreateOrder = async () => {
    setCreating(true);
    setNotice(null);
    try {
      const gaClientId = await getAnalyticsClientId();
      const res = await orderApi.createOrder(PARTNER_PLAN_ID, gaClientId);
      const order = res.data?.order;
      if (order) {
        trackEvent('begin_checkout', {
          currency: 'VND',
          value: order.amount,
          items: [{ item_id: order.plan, item_name: order.planName, price: order.amount, quantity: 1 }],
        });
      }
      setCheckout(res.data);
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Không thể tạo đơn hàng' });
    } finally {
      setCreating(false);
    }
  };

  const handleCancelOrder = async () => {
    try {
      await orderApi.cancelMyOrder(checkout.order.code);
      setCheckout(null);
      setNotice({ type: 'success', text: 'Đã huỷ đơn hàng.' });
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Không thể huỷ đơn hàng' });
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1500);
  };

  const payment = checkout?.payment;
  const order = checkout?.order;
  const isPaid = order?.status === 'paid';

  const row = (label, value, field) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
      <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <strong style={{ color: 'var(--text-primary)' }}>{value}</strong>
        {field && (
          <button
            type="button"
            onClick={() => copyToClipboard(value, field)}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--indigo)', display: 'flex' }}
            title="Sao chép"
          >
            {copiedField === field ? <CheckCircle size={14} color="#10B981" /> : <Copy size={14} />}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div
        className="portal-card"
        style={{ width: '100%', maxWidth: '440px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Crown size={20} color="var(--indigo)" />
            <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', margin: 0 }}>
              {plan.name}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            title="Đóng"
          >
            <X size={20} />
          </button>
        </div>

        {notice && (
          <div
            style={{
              padding: '10px 12px',
              borderRadius: '10px',
              marginBottom: '14px',
              fontSize: '13px',
              fontWeight: '600',
              backgroundColor: notice.type === 'success' ? '#ECFDF5' : '#FEF2F2',
              color: notice.type === 'success' ? '#047857' : '#B91C1C',
            }}
          >
            {notice.text}
          </div>
        )}

        {!checkout && (
          <>
            <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--indigo-dark)', marginBottom: '4px' }}>
              {formatVnd(plan.amount)}
              <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>
                {' '}/ {plan.durationDays} ngày
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', margin: '16px 0 20px' }}>
              {BENEFITS.map(({ icon: Icon, text }) => (
                <div key={text} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', fontSize: '13px' }}>
                  <Icon size={16} color="var(--indigo)" style={{ flexShrink: 0, marginTop: '1px' }} />
                  <span style={{ color: 'var(--text-primary)' }}>{text}</span>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="btn btn-indigo"
              disabled={creating}
              onClick={handleCreateOrder}
              style={{ width: '100%', padding: '12px', fontSize: '14px' }}
            >
              {creating ? 'Đang tạo đơn...' : 'Thanh toán qua VietQR'}
            </button>
          </>
        )}

        {checkout && !isPaid && (
          <>
            {payment?.configured === false ? (
              <p style={{ fontSize: '13px', color: '#B91C1C' }}>
                Hệ thống chưa cấu hình tài khoản nhận tiền. Vui lòng liên hệ UNI-MATE để thanh toán đơn{' '}
                <strong>{order.code}</strong>.
              </p>
            ) : (
              <>
                <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                  <img
                    src={payment.qrImageUrl}
                    alt="Mã VietQR"
                    style={{ width: '200px', height: '200px', objectFit: 'contain', margin: '0 auto', display: 'block' }}
                  />
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                    Mở ứng dụng ngân hàng để quét mã
                  </p>
                </div>
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    fontSize: '13px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    marginBottom: '14px',
                  }}
                >
                  {row('Số tiền:', formatVnd(order.amount))}
                  {row('Ngân hàng:', payment.bankId)}
                  {row('Số tài khoản:', payment.accountNo, 'accountNo')}
                  {payment.accountName && row('Chủ tài khoản:', payment.accountName)}
                  {row('Nội dung CK (bắt buộc):', payment.transferContent, 'content')}
                </div>
              </>
            )}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#0284C7',
                backgroundColor: '#F0F9FF',
                padding: '8px 12px',
                borderRadius: '10px',
                marginBottom: '14px',
              }}
            >
              <Loader2 size={14} />
              <span>Đang chờ chuyển khoản... Gói tự kích hoạt khi UNI-MATE nhận được tiền</span>
            </div>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleCancelOrder}
              style={{ width: '100%', padding: '10px', fontSize: '13px' }}
            >
              Huỷ đơn
            </button>
          </>
        )}

        {isPaid && (
          <PaymentSuccess order={order} expiresAt={planExpiresAt} onDone={handleClose} accentColor="var(--indigo)" />
        )}
      </div>
    </div>
  );
}
