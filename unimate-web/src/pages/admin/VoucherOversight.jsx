import React, { useState } from 'react';
import {
  Ticket,
  Search,
  CheckCircle,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
} from 'lucide-react';

const SYSTEM_VOUCHERS = [
  { id: 'sv_1', venue: 'The Coffee House - Sư Vạn Hạnh', name: 'Giảm 20% Hóa Đơn Trưa', code: 'LUNCH20', discount: '20% (Tối đa 50k)', issued: 450, used: 320, risk: 'An toàn', status: 'active' },
  { id: 'sv_2', venue: 'Highlands Coffee - Vạn Hạnh Mall', name: 'Giảm 15k ly Size L', code: 'HL-SIZEL', discount: '15,000đ', issued: 1200, used: 850, risk: 'An toàn', status: 'active' },
  { id: 'sv_3', venue: 'The Workshop Boardgame Cafe', name: 'Tặng 2 giờ máy chơi game', code: 'WS-BG2H', discount: '2 giờ máy', issued: 300, used: 280, risk: 'Cảnh báo lạm dụng', status: 'flagged' },
  { id: 'sv_4', venue: 'Cộng Cà Phê - Tô Hiến Thành', name: 'Mua 1 tặng 1 đồ uống', code: 'CONG-B1G1', discount: 'Mua 1 Tặng 1', issued: 800, used: 410, risk: 'An toàn', status: 'active' },
  { id: 'sv_5', venue: 'Trà Sữa KOI Thé', name: 'Giảm 50% cho sinh viên', code: 'KOI50', discount: '50%', issued: 1500, used: 1450, risk: 'Đã tạm dừng do gian lận', status: 'paused' },
];

export default function VoucherOversight() {
  const [vouchers, setVouchers] = useState(SYSTEM_VOUCHERS);
  const [search, setSearch] = useState('');

  const togglePause = (id) => {
    setVouchers(
      vouchers.map((v) =>
        v.id === id ? { ...v, status: v.status === 'active' ? 'paused' : 'active' } : v
      )
    );
  };

  const filtered = vouchers.filter(
    (v) =>
      v.venue.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Giám sát Voucher Toàn Sàn
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Kiểm soát lưu lượng phát hành, tỷ lệ đổi quà và phát hiện hành vi gian lận mã ưu đãi.
        </p>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TỔNG CHƯƠNG TRÌNH</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '4px' }}>45</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Từ 152 quán đang hoạt động</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>VOUCHER ĐÃ PHÁT</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#8B5CF6', marginTop: '4px' }}>12,400</h2>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>+18% so với tháng trước</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>VOUCHER ĐÃ SỬ DỤNG</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#10B981', marginTop: '4px' }}>6,850</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Check-in thành công tại quầy</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TỶ LỆ CHUYỂN ĐỔI (CR)</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--primary)', marginTop: '4px' }}>55.2%</h2>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>Hiệu quả kích cầu cao</span>
        </div>
      </div>

      {/* Table */}
      <div className="portal-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '15px', fontWeight: '800' }}>Danh sách voucher sàn</h3>
          <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--bg-page)', padding: '6px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', width: '260px' }}>
            <Search size={15} color="var(--text-muted)" style={{ marginRight: '6px' }} />
            <input
              type="text"
              placeholder="Lọc quán, tên voucher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', width: '100%' }}
            />
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px' }}>
                <th style={{ padding: '12px 18px' }}>QUÁN ĐỐI TÁC</th>
                <th style={{ padding: '12px 14px' }}>TÊN VOUCHER & MÃ</th>
                <th style={{ padding: '12px 14px' }}>MỨC GIẢM</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ĐÃ PHÁT</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ĐÃ DÙNG</th>
                <th style={{ padding: '12px 14px' }}>ĐỘ RỦI RO</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '12px 18px', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 18px', fontWeight: '800', color: 'var(--text-primary)' }}>{v.venue}</td>
                  <td style={{ padding: '14px 14px' }}>
                    <div>{v.name}</div>
                    <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>{v.code}</span>
                  </td>
                  <td style={{ padding: '14px 14px', fontWeight: '700' }}>{v.discount}</td>
                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>{v.issued}</td>
                  <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: '700', color: '#10B981' }}>{v.used}</td>
                  <td style={{ padding: '14px 14px' }}>
                    {v.risk === 'An toàn' ? (
                      <span style={{ color: '#059669', fontSize: '12px', fontWeight: '600' }}>✓ An toàn</span>
                    ) : (
                      <span style={{ color: '#DC2626', fontSize: '12px', fontWeight: '700' }}>⚠ {v.risk}</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                    {v.status === 'active' && <span className="badge badge-success">ACTIVE</span>}
                    {v.status === 'flagged' && <span className="badge badge-warning">CẢNH BÁO</span>}
                    {v.status === 'paused' && <span className="badge badge-danger">TẠM DỪNG</span>}
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      onClick={() => togglePause(v.id)}
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      {v.status === 'active' ? 'Tạm dừng' : 'Kích hoạt'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
