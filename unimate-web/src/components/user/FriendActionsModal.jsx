import React, { useState } from 'react';
import { Ban, Loader2, UserMinus, X } from 'lucide-react';
import { matchApi } from '../../services/api';

/**
 * Huỷ kết bạn hoặc chặn người đang chat.
 * - Huỷ kết bạn: mất hội thoại, không được gợi ý lại cho nhau.
 * - Chặn: như trên và người kia không tìm thấy / nhắn tin / rủ cafe mình được nữa.
 */
export default function FriendActionsModal({ open, onClose, matchId, targetId, targetName, onDone }) {
  const [confirm, setConfirm] = useState(null); // 'unmatch' | 'block'
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const close = () => {
    setConfirm(null);
    setError('');
    onClose();
  };

  const handleConfirm = async () => {
    if (sending) return;
    setSending(true);
    setError('');
    try {
      if (confirm === 'block') await matchApi.block(targetId);
      else await matchApi.unmatch(matchId);
      const action = confirm;
      close();
      onDone?.(action);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const optionStyle = {
    width: '100%', display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 14px', borderRadius: '12px',
    border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', cursor: 'pointer', textAlign: 'left', marginBottom: '10px',
  };

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px 22px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)' }}>{targetName || 'Người dùng'}</h3>
          <button type="button" onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {!confirm ? (
          <>
            <button type="button" style={optionStyle} onClick={() => setConfirm('unmatch')}>
              <UserMinus size={20} color="#64748B" />
              <span>
                <strong style={{ display: 'block', fontSize: '14px', color: 'var(--text-primary)' }}>Huỷ kết bạn</strong>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Hội thoại sẽ biến mất, lời rủ cafe đang mở bị huỷ.</span>
              </span>
            </button>
            <button type="button" style={{ ...optionStyle, borderColor: '#FECACA' }} onClick={() => setConfirm('block')}>
              <Ban size={20} color="#DC2626" />
              <span>
                <strong style={{ display: 'block', fontSize: '14px', color: '#DC2626' }}>Chặn</strong>
                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Hai bạn không thấy nhau ở Khám phá, không nhắn tin hay rủ cafe được nữa. Bỏ chặn trong trang Hồ sơ.</span>
              </span>
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
              {confirm === 'block'
                ? `Chặn ${targetName || 'người này'}? Họ sẽ không được báo là bị chặn.`
                : `Huỷ kết bạn với ${targetName || 'người này'}?`}
            </p>
            {error && <p style={{ fontSize: '13px', color: '#DC2626', marginBottom: '10px' }}>{error}</p>}
            <div style={{ display: 'flex', gap: '10px' }}>
              <button type="button" className="btn" onClick={() => setConfirm(null)} style={{ flex: 1 }} disabled={sending}>Quay lại</button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={sending}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', fontWeight: '800', cursor: 'pointer' }}
              >
                {sending && <Loader2 size={16} className="spinner" />}
                {confirm === 'block' ? 'Chặn' : 'Huỷ kết bạn'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
