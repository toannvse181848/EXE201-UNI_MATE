import React, { useEffect, useState } from 'react';
import { Flag } from 'lucide-react';
import { reportApi } from '../../services/api';

const STATUS_COLOR = {
  pending: '#B45309',
  reviewed: '#1D4ED8',
  resolved: '#047857',
  dismissed: '#64748B',
};

/** Báo cáo vi phạm mình đã gửi và kết quả ban quản trị xử lý (trang Hồ sơ). Ẩn khi chưa gửi báo cáo nào. */
export default function MyReportsCard() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    reportApi
      .getMyReports()
      .then((res) => setItems(res.data || []))
      .catch(() => setItems([]));
  }, []);

  if (items.length === 0) return null;

  return (
    <div style={{ marginTop: '24px', backgroundColor: '#FFFFFF', borderRadius: '20px', border: '1px solid var(--border-color)', boxShadow: '0 4px 12px rgba(0,0,0,0.03)', padding: '20px 28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <Flag size={20} color="#DC2626" />
        <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>Báo cáo đã gửi</div>
      </div>
      {items.map((r) => (
        <div key={r._id} style={{ padding: '10px 0', borderTop: '1px solid #F1F5F9', fontSize: '13px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{r.targetName}</strong>
            <span style={{ color: STATUS_COLOR[r.status] || '#64748B', fontWeight: '700', whiteSpace: 'nowrap' }}>{r.statusLabel}</span>
          </div>
          <div style={{ color: 'var(--text-secondary)' }}>
            {r.reasonLabel} · gửi {new Date(r.createdAt).toLocaleDateString('vi-VN')}
          </div>
          {r.result && <div style={{ color: '#047857', marginTop: '2px' }}>{r.result}</div>}
          {r.adminNote && <div style={{ color: 'var(--text-secondary)', marginTop: '2px' }}>Ban quản trị: {r.adminNote}</div>}
        </div>
      ))}
    </div>
  );
}
