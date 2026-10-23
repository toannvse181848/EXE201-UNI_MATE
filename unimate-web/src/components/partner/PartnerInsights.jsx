import React, { useEffect, useState } from 'react';
import { venueApi } from '../../services/api';

const RANGES = [7, 30, 90];

/**
 * Hiệu quả UNI-MATE mang lại cho quán: sinh viên tới quán, phễu "Rủ cafe", lượt xem trang quán.
 * Số liệu thật từ backend (GET /api/venues/my/insights).
 */
export default function PartnerInsights() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    venueApi
      .getMyInsights(days)
      .then((res) => alive && (setData(res.data), setError('')))
      .catch((err) => alive && setError(err.message));
    return () => {
      alive = false;
    };
  }, [days]);

  const t = data?.totals;
  const funnel = t
    ? [
        { label: 'Lời rủ cafe tới quán', value: t.meetupsInvited },
        { label: 'Đã chốt hẹn', value: t.meetupsAgreed },
        { label: 'Đã gặp tại quán', value: t.meetupsCompleted },
      ]
    : [];
  const funnelMax = Math.max(1, ...funnel.map((f) => f.value));

  const tile = (label, value, note) => (
    <div style={{ padding: '14px 16px', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
      <div style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)', margin: '4px 0' }}>{value}</div>
      <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{note}</div>
    </div>
  );

  return (
    <div className="portal-card" style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>UNI-MATE mang lại gì cho quán</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Sinh viên thật đã tới quán qua voucher, check-in và các buổi hẹn cafe.</p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDays(d)}
              style={{ padding: '6px 12px', borderRadius: '999px', border: '1px solid #E2E8F0', fontSize: '12px', fontWeight: '700', cursor: 'pointer', backgroundColor: days === d ? 'var(--primary)' : '#FFFFFF', color: days === d ? '#FFFFFF' : '#475569' }}
            >
              {d} ngày
            </button>
          ))}
        </div>
      </div>

      {error && <p style={{ fontSize: '13px', color: '#DC2626' }}>{error}</p>}
      {t && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            {tile('SINH VIÊN TỚI QUÁN', t.uniqueStudents, 'Khác nhau, qua quét ví hoặc check-in')}
            {tile('LƯỢT CHECK-IN', t.checkins, 'Sinh viên quét QR dán tại quán')}
            {tile('LƯỢT DÙNG VOUCHER', t.redemptions, `${t.walletRedemptions} lượt quét từ ví UNI-MATE`)}
            {tile('LƯỢT XEM TRANG QUÁN', t.views, 'Tính từ khi có tính năng đếm')}
          </div>

          <div style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>Phễu "Rủ cafe" tại quán</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '20px' }}>
            {funnel.map((f) => (
              <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '12.5px' }}>
                <span style={{ width: '150px', color: 'var(--text-secondary)' }}>{f.label}</span>
                <div style={{ flex: 1, height: '14px', backgroundColor: '#F1F5F9', borderRadius: '7px', overflow: 'hidden' }}>
                  <div style={{ width: `${(f.value / funnelMax) * 100}%`, height: '100%', backgroundColor: 'var(--primary)', borderRadius: '7px' }} />
                </div>
                <strong style={{ width: '36px', textAlign: 'right', color: 'var(--text-primary)' }}>{f.value}</strong>
              </div>
            ))}
          </div>

          {data.perVenue.length > 1 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ textAlign: 'left', color: 'var(--text-muted)' }}>
                    <th style={{ padding: '6px' }}>Chi nhánh</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Check-in</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Dùng voucher</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Hẹn đã gặp</th>
                    <th style={{ padding: '6px', textAlign: 'right' }}>Lượt xem</th>
                  </tr>
                </thead>
                <tbody>
                  {data.perVenue.map((v) => (
                    <tr key={v.venueId} style={{ borderTop: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '6px', fontWeight: '700' }}>{v.name}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{v.checkins}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{v.redemptions}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{v.meetupsCompleted}</td>
                      <td style={{ padding: '6px', textAlign: 'right' }}>{v.views}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
