import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { closeDialog, dismissToast, subscribeNotifications } from '../utils/notify';

const TOAST_STYLES = {
  success: { icon: CheckCircle2, color: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  error: { icon: AlertCircle, color: '#B91C1C', bg: '#FEF2F2', border: '#FCA5A5' },
  info: { icon: Info, color: '#1D4ED8', bg: '#EFF6FF', border: '#93C5FD' },
};

/** Thông báo nổi và hộp xác nhận của app (đặt 1 lần ở gốc ứng dụng, xem utils/notify.js) */
export default function AppNotifications() {
  const [{ toasts, dialog }, setState] = useState({ toasts: [], dialog: null });

  useEffect(() => subscribeNotifications(setState), []);

  // Esc = không đồng ý
  useEffect(() => {
    if (!dialog) return undefined;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') closeDialog(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog]);

  return (
    <>
      {toasts.length > 0 && (
        <div
          style={{
            position: 'fixed',
            top: '16px',
            right: '16px',
            zIndex: 100000,
            width: 'min(380px, calc(100vw - 32px))',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {toasts.map((toast) => {
            const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
            const Icon = style.icon;
            return (
              <div
                key={toast.id}
                role={toast.type === 'error' ? 'alert' : 'status'}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: style.bg,
                  border: `1.5px solid ${style.border}`,
                  color: style.color,
                  fontSize: '13.5px',
                  fontWeight: '600',
                  lineHeight: '1.45',
                  boxShadow: '0 10px 25px rgba(15, 23, 42, 0.15)',
                  animation: 'fadeIn 0.15s ease-out',
                }}
              >
                <Icon size={18} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span style={{ flex: 1, minWidth: 0, overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>{toast.text}</span>
                <button
                  type="button"
                  aria-label="Đóng thông báo"
                  onClick={() => dismissToast(toast.id)}
                  style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: style.color, display: 'flex', flexShrink: 0 }}
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {dialog && (
        <div
          onClick={() => closeDialog(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 100001, backgroundColor: 'rgba(15, 23, 42, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', animation: 'fadeIn 0.15s ease-out' }}
        >
          <div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', backgroundColor: '#FFFFFF', borderRadius: '20px', padding: '22px', boxShadow: '0 25px 50px rgba(0, 0, 0, 0.25)' }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
              {dialog.title || 'Xác nhận'}
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.5', overflowWrap: 'anywhere' }}>{dialog.message}</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => closeDialog(false)}
                style={{ padding: '10px 16px', borderRadius: '10px', border: '1px solid var(--border-color)', backgroundColor: '#FFFFFF', color: 'var(--text-secondary)', fontSize: '13.5px', fontWeight: '700', cursor: 'pointer' }}
              >
                {dialog.cancelText || 'Để sau'}
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => closeDialog(true)}
                style={{ padding: '10px 16px', borderRadius: '10px', border: 'none', backgroundColor: dialog.danger ? '#DC2626' : '#FF5722', color: '#FFFFFF', fontSize: '13.5px', fontWeight: '800', cursor: 'pointer' }}
              >
                {dialog.confirmText || 'Đồng ý'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
