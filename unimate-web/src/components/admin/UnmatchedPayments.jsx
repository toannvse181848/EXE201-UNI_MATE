import React, { useEffect, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { orderApi } from '../../services/api';

const STATUS_LABEL = {
  underpaid: 'Chuyển thiếu',
  unmatched: 'Không khớp mã đơn',
  order_closed: 'Đơn đã đóng',
};

const formatVnd = (n) => `${Number(n || 0).toLocaleString('vi-VN')}đ`;

/**
 * Giao dịch SePay chưa khớp đơn nào (sai nội dung, chuyển thiếu, đơn đã thanh toán / bị huỷ).
 * Admin gán vào đúng đơn để kích hoạt gói, hoặc đánh dấu đã xử lý (VD: đã hoàn tiền).
 */
export default function UnmatchedPayments({ onResolved }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [drafts, setDrafts] = useState({}); // id → { orderCode, note }
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await orderApi.getPaymentsAdmin('unresolved');
      setItems(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const setDraft = (id, key, value) => setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], [key]: value } }));

  const resolve = async (p, assign) => {
    const draft = drafts[p._id] || {};
    if (assign && !draft.orderCode?.trim()) {
      setError('Nhập mã đơn (VD: UM000123) để gán giao dịch');
      return;
    }
    setBusyId(p._id);
    setError('');
    try {
      await orderApi.resolvePaymentAdmin(p._id, {
        orderCode: assign ? draft.orderCode.trim() : undefined,
        note: draft.note || '',
      });
      setItems((prev) => prev.filter((x) => x._id !== p._id));
      onResolved?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  if (!loading && items.length === 0 && !error) return null;

  const input = { padding: '6px 8px', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '12.5px', width: '100%' };

  return (
    <div style={{ marginBottom: '20px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '14px', padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', fontWeight: '800', color: '#92400E' }}>
        <AlertTriangle size={18} /> Giao dịch cần đối soát tay ({items.length})
      </div>
      <p style={{ fontSize: '12.5px', color: '#92400E', marginBottom: '10px' }}>
        Tiền đã về tài khoản nhưng chưa khớp đơn nào. Gán vào đúng đơn để kích hoạt gói, hoặc đánh dấu đã xử lý sau khi hoàn tiền.
      </p>
      {error && <p style={{ fontSize: '12.5px', color: '#DC2626', marginBottom: '8px' }}>{error}</p>}
      {loading ? (
        <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
            <thead>
              <tr style={{ textAlign: 'left', color: '#78350F' }}>
                <th style={{ padding: '6px' }}>Thời gian</th>
                <th style={{ padding: '6px' }}>Số tiền</th>
                <th style={{ padding: '6px' }}>Nội dung CK</th>
                <th style={{ padding: '6px' }}>Tình trạng</th>
                <th style={{ padding: '6px', minWidth: '120px' }}>Mã đơn</th>
                <th style={{ padding: '6px', minWidth: '140px' }}>Ghi chú</th>
                <th style={{ padding: '6px' }} />
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p._id} style={{ borderTop: '1px solid #FDE68A', verticalAlign: 'top' }}>
                  <td style={{ padding: '6px' }}>{new Date(p.createdAt).toLocaleString('vi-VN')}</td>
                  <td style={{ padding: '6px', fontWeight: '700' }}>{formatVnd(p.amount)}</td>
                  <td style={{ padding: '6px', maxWidth: '220px', wordBreak: 'break-word' }}>{p.content || '—'}</td>
                  <td style={{ padding: '6px' }}>
                    {STATUS_LABEL[p.status] || p.status}
                    {p.orderCode ? ` (${p.orderCode})` : ''}
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input style={input} placeholder={p.orderCode || 'UM000123'} value={drafts[p._id]?.orderCode || ''} onChange={(e) => setDraft(p._id, 'orderCode', e.target.value)} />
                  </td>
                  <td style={{ padding: '6px' }}>
                    <input style={input} placeholder="VD: đã hoàn tiền" value={drafts[p._id]?.note || ''} onChange={(e) => setDraft(p._id, 'note', e.target.value)} />
                  </td>
                  <td style={{ padding: '6px', whiteSpace: 'nowrap' }}>
                    <button type="button" disabled={busyId === p._id} onClick={() => resolve(p, true)} style={{ padding: '6px 10px', borderRadius: '8px', border: 'none', backgroundColor: '#10B981', color: '#FFFFFF', fontWeight: '700', cursor: 'pointer', marginRight: '6px' }}>
                      Gán vào đơn
                    </button>
                    <button type="button" disabled={busyId === p._id} onClick={() => resolve(p, false)} style={{ padding: '6px 10px', borderRadius: '8px', border: '1px solid #E2E8F0', backgroundColor: '#FFFFFF', color: '#475569', fontWeight: '700', cursor: 'pointer' }}>
                      Đã xử lý
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
