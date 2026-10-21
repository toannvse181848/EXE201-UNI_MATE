import React, { useState } from 'react';
import { Flag, Loader2, X } from 'lucide-react';
import { reportApi } from '../../services/api';

// Mã lý do khớp với backend (reportController.REPORT_REASONS)
const REASONS = [
  { id: 'harassment', label: 'Quấy rối, xúc phạm' },
  { id: 'fake_profile', label: 'Hồ sơ giả, mạo danh' },
  { id: 'spam', label: 'Spam, lừa đảo' },
  { id: 'inappropriate', label: 'Nội dung không phù hợp' },
  { id: 'other', label: 'Khác' },
];

/** Báo cáo một người dùng với ban quản trị (gửi vào trang Báo cáo vi phạm của admin) */
export default function ReportUserModal({ open, onClose, targetId, targetName }) {
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  const close = () => {
    setReason('');
    setDescription('');
    setResult(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!reason || sending) return;
    setSending(true);
    try {
      const res = await reportApi.createReport({ targetType: 'user', targetId, reason, description: description.trim() });
      setResult({ ok: true, text: res.message || 'Đã gửi báo cáo' });
    } catch (err) {
      setResult({ ok: false, text: err.message });
    } finally {
      setSending(false);
    }
  };

  return (
    <div onClick={close} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15,23,42,0.6)', zIndex: 99998, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '420px', backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px 22px', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Flag size={18} color="#DC2626" /> Báo cáo {targetName || 'người dùng'}
          </h3>
          <button type="button" onClick={close} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}><X size={20} /></button>
        </div>

        {result?.ok ? (
          <div>
            <p style={{ fontSize: '14px', color: '#065F46', backgroundColor: '#ECFDF5', padding: '12px', borderRadius: '10px' }}>{result.text}</p>
            <button type="button" onClick={close} className="btn btn-primary" style={{ width: '100%', marginTop: '12px' }}>Đóng</button>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
              Ban quản trị sẽ xem xét và xử lý. Người bị báo cáo không biết ai đã báo cáo.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '10px' }}>
              {REASONS.map((r) => (
                <label key={r.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '10px', border: `1.5px solid ${reason === r.id ? '#DC2626' : 'var(--border-color)'}`, cursor: 'pointer', fontSize: '13.5px' }}>
                  <input type="radio" name="report-reason" checked={reason === r.id} onChange={() => setReason(r.id)} /> {r.label}
                </label>
              ))}
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
              placeholder="Mô tả thêm (không bắt buộc)"
              style={{ width: '100%', minHeight: '70px', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid var(--border-color)', fontSize: '13px', fontFamily: 'inherit', boxSizing: 'border-box', resize: 'vertical' }}
            />
            {result && !result.ok && <p style={{ fontSize: '12.5px', color: '#B91C1C', marginTop: '6px' }}>{result.text}</p>}
            <button
              type="button"
              disabled={!reason || sending}
              onClick={handleSubmit}
              style={{ width: '100%', marginTop: '12px', padding: '11px', borderRadius: '12px', border: 'none', backgroundColor: reason ? '#DC2626' : '#E2E8F0', color: reason ? '#FFFFFF' : '#94A3B8', fontWeight: '800', fontSize: '14px', cursor: reason ? 'pointer' : 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
            >
              {sending && <Loader2 size={15} className="spinner" />} Gửi báo cáo
            </button>
          </>
        )}
      </div>
    </div>
  );
}
