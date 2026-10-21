import React from 'react';

// Trạng thái do backend tính (unimate-backend/src/utils/voucherStatus.js) — trang quán và trang admin dùng chung
const STYLES = {
  active: { label: 'Đang chạy', color: '#047857', bg: '#D1FAE5' },
  paused: { label: 'Tạm dừng', color: '#B91C1C', bg: '#FEE2E2' },
  expired: { label: 'Hết hạn', color: '#64748B', bg: '#E2E8F0' },
  sold_out: { label: 'Hết lượt', color: '#64748B', bg: '#E2E8F0' },
  venue_pending: { label: 'Chờ duyệt quán', color: '#B45309', bg: '#FEF3C7' },
  venue_rejected: { label: 'Quán bị từ chối', color: '#B91C1C', bg: '#FEE2E2' },
  partner_suspended: { label: 'Quán bị khoá', color: '#B91C1C', bg: '#FEE2E2' },
};

const HINTS = {
  active: 'Sinh viên đang thấy và lưu được voucher này',
  paused: 'Quán / admin đã tạm dừng, sinh viên không thấy',
  expired: 'Đã qua hạn sử dụng, sinh viên không thấy',
  sold_out: 'Đã dùng hết số lượng / hết mã, sinh viên không thấy',
  venue_pending: 'Quán chưa được admin duyệt, sinh viên chưa thấy',
  venue_rejected: 'Quán bị admin từ chối, sinh viên không thấy',
  partner_suspended: 'Tài khoản quán bị khoá, sinh viên không thấy',
};

export default function VoucherStatusBadge({ status, label }) {
  const s = STYLES[status] || STYLES.paused;
  return (
    <span
      title={HINTS[status]}
      style={{ display: 'inline-block', padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: '800', color: s.color, backgroundColor: s.bg, whiteSpace: 'nowrap' }}
    >
      {(label || s.label).toUpperCase()}
    </span>
  );
}
