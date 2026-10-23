import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Loader2, ShieldOff, Store, Ticket, User, XCircle } from 'lucide-react';
import { reportApi } from '../../services/api';

const TABS = [
  { id: 'pending', label: 'Chờ xử lý' },
  { id: 'resolved', label: 'Đã xử lý' },
  { id: 'dismissed', label: 'Đã bỏ qua' },
  { id: 'all', label: 'Tất cả' },
];

const TARGET_LABEL = {
  user: { label: 'Người dùng', icon: User },
  venue: { label: 'Quán', icon: Store },
  voucher: { label: 'Voucher', icon: Ticket },
};

const STATUS_BADGE = {
  pending: { label: 'Chờ xử lý', color: '#B45309', bg: '#FEF3C7' },
  reviewed: { label: 'Đang xem', color: '#1D4ED8', bg: '#DBEAFE' },
  resolved: { label: 'Đã xử lý', color: '#047857', bg: '#D1FAE5' },
  dismissed: { label: 'Đã bỏ qua', color: '#64748B', bg: '#E2E8F0' },
};

// Hành động kèm khi xử lý, theo loại đối tượng bị báo cáo. done(target) = đối tượng đã ở trạng thái đó rồi
const TARGET_ACTION = {
  user: {
    label: 'Khoá tài khoản bị báo cáo',
    confirm: (name) => `Khoá tài khoản "${name}"? Người này sẽ không đăng nhập được nữa.`,
    done: (target) => target?.status === 'suspended' || target?.role === 'admin',
  },
  voucher: {
    label: 'Tạm dừng voucher',
    confirm: (name) => `Tạm dừng voucher "${name}"? Sinh viên sẽ không lưu / dùng được nữa.`,
    done: (target) => target?.status === 'paused',
  },
  venue: {
    label: 'Ẩn quán, chờ duyệt lại',
    confirm: (name) => `Ẩn quán "${name}"? Quán và voucher của quán sẽ biến mất với sinh viên cho tới khi duyệt lại.`,
    done: (target) => target?.status === 'pending' || target?.status === 'rejected',
  },
};

const btn = (bg, color, border = 'transparent') => ({
  display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '8px 12px', borderRadius: '10px',
  border: `1px solid ${border}`, backgroundColor: bg, color, fontSize: '12.5px', fontWeight: '700', cursor: 'pointer',
});

/** Hàng đợi báo cáo vi phạm do người dùng gửi (nút "Báo cáo" trong khung chat) */
export default function ReportQueue() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pending');
  const [notes, setNotes] = useState({});
  const [busyId, setBusyId] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await reportApi.getAllReportsAdmin();
      setReports(res?.data || []);
    } catch (err) {
      setToast({ type: 'error', text: `Không tải được báo cáo: ${err.message}` });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Gọi API rồi mới cập nhật danh sách (không giả vờ thành công khi lỗi)
  const handleAction = async (report, status, { targetAction = false } = {}) => {
    if (targetAction && !window.confirm(TARGET_ACTION[report.targetType]?.confirm(report.target?.name))) return;
    setBusyId(report._id);
    try {
      const res = await reportApi.resolveReport(report._id, status, notes[report._id] || '', targetAction);
      setToast({ type: 'success', text: res.message || 'Đã cập nhật báo cáo' });
      await fetchReports();
    } catch (err) {
      setToast({ type: 'error', text: err.message });
    } finally {
      setBusyId(null);
      setTimeout(() => setToast(null), 3500);
    }
  };

  const filtered = reports.filter((r) => tab === 'all' || r.status === tab);
  const count = (id) => (id === 'all' ? reports.length : reports.filter((r) => r.status === id).length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Báo cáo vi phạm ({count('pending')} chờ xử lý)
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Người dùng gửi báo cáo từ khung chat. Xem nội dung, rồi bỏ qua, đánh dấu đã xử lý hoặc khoá tài khoản vi phạm.
        </p>
      </div>

      {toast && (
        <div style={{ padding: '12px 16px', borderRadius: '12px', fontSize: '13px', fontWeight: '600', backgroundColor: toast.type === 'success' ? '#ECFDF5' : '#FEF2F2', color: toast.type === 'success' ? '#065F46' : '#B91C1C' }}>
          {toast.text}
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{ padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', border: `1px solid ${tab === t.id ? 'var(--indigo)' : 'var(--border-color)'}`, backgroundColor: tab === t.id ? 'var(--indigo)' : '#FFFFFF', color: tab === t.id ? '#FFFFFF' : 'var(--text-secondary)' }}
          >
            {t.label} ({count(t.id)})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <Loader2 size={28} className="animate-spin" style={{ margin: '0 auto' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="portal-card" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
          <CheckCircle size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
          <p style={{ fontWeight: '700', color: 'var(--text-secondary)' }}>Không có báo cáo nào ở mục này</p>
        </div>
      ) : (
        filtered.map((r) => {
          const target = TARGET_LABEL[r.targetType] || TARGET_LABEL.user;
          const TargetIcon = target.icon;
          const badge = STATUS_BADGE[r.status] || STATUS_BADGE.pending;
          const targetSuspended = r.target?.status === 'suspended';
          const isBusy = busyId === r._id;
          return (
            <div key={r._id} className="portal-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderLeft: `4px solid ${r.status === 'pending' ? '#F59E0B' : '#CBD5E1'}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={18} color="#F59E0B" />
                  <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>{r.reasonLabel || r.reason}</span>
                  <span style={{ fontSize: '11px', fontWeight: '800', padding: '3px 9px', borderRadius: '999px', color: badge.color, backgroundColor: badge.bg }}>{badge.label}</span>
                </div>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                  <Clock size={13} /> {new Date(r.createdAt).toLocaleString('vi-VN')}
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>BỊ BÁO CÁO · {target.label.toUpperCase()}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', color: 'var(--text-primary)' }}>
                    <TargetIcon size={15} /> {r.target?.name}
                    {targetSuspended && <span style={{ fontSize: '11px', color: '#B91C1C', fontWeight: '800' }}>· đã bị khoá</span>}
                  </div>
                  {r.target?.email && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.target.email}</div>}
                  {r.target?.address && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.target.address}</div>}
                </div>
                <div style={{ padding: '12px', borderRadius: '12px', backgroundColor: '#F8FAFC' }}>
                  <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '4px' }}>NGƯỜI BÁO CÁO</div>
                  <div style={{ fontWeight: '800', color: 'var(--text-primary)' }}>{r.reporter?.fullName || 'Tài khoản đã xoá'}</div>
                  {r.reporter?.email && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{r.reporter.email}</div>}
                </div>
              </div>

              {r.description && (
                <div style={{ fontSize: '13.5px', color: 'var(--text-primary)', padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                  “{r.description}”
                </div>
              )}
              {r.adminNote && <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>Ghi chú xử lý: {r.adminNote}</div>}

              {r.status === 'pending' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    value={notes[r._id] || ''}
                    onChange={(e) => setNotes((prev) => ({ ...prev, [r._id]: e.target.value }))}
                    placeholder="Ghi chú xử lý (không bắt buộc), VD: đã nhắc nhở qua email"
                    maxLength={500}
                    style={{ padding: '9px 12px', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '13px', outline: 'none' }}
                  />
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button type="button" disabled={isBusy} onClick={() => handleAction(r, 'dismissed')} style={btn('#FFFFFF', '#475569', 'var(--border-color)')}>
                      <XCircle size={14} /> Bỏ qua (không vi phạm)
                    </button>
                    <button type="button" disabled={isBusy} onClick={() => handleAction(r, 'resolved')} style={btn('#ECFDF5', '#047857')}>
                      <CheckCircle size={14} /> Đã xử lý
                    </button>
                    {TARGET_ACTION[r.targetType] && r.target?.name !== 'Đã bị xoá' && !TARGET_ACTION[r.targetType].done(r.target) && (
                      <button type="button" disabled={isBusy} onClick={() => handleAction(r, 'resolved', { targetAction: true })} style={btn('#FEF2F2', '#B91C1C')}>
                        <ShieldOff size={14} /> {TARGET_ACTION[r.targetType].label}
                      </button>
                    )}
                    {isBusy && <Loader2 size={16} className="animate-spin" />}
                  </div>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
