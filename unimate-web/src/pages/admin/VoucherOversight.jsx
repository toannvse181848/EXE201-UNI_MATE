import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  CheckCircle,
  AlertTriangle,
  PauseCircle,
  PlayCircle,
  ShieldCheck,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { voucherApi } from '../../services/api';

export default function VoucherOversight() {
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await voucherApi.getAllVouchersAdmin();
      const raw = res?.data || [];
      const mapped = raw.map((v) => ({
        id: v._id || v.id,
        venue: v.venueId?.name || 'Đối tác UNI-MATE',
        name: v.title,
        code: v.code,
        discount: v.discountPercent ? `${v.discountPercent}%` : (v.discountAmount ? `${v.discountAmount.toLocaleString()}đ` : v.title),
        issued: v.claimedCount || 0,
        used: v.usedCount || 0,
        risk: v.usedCount > (v.quantity || 500) ? 'Cảnh báo lạm dụng' : 'An toàn',
        status: v.isActive ? 'active' : 'paused',
      }));
      setVouchers(mapped);
    } catch (err) {
      console.log('Backend vouchers oversight note:', err.message);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
  }, []);

  const togglePause = async (id) => {
    try {
      await voucherApi.toggleVoucher(id);
      setVouchers((prev) =>
        prev.map((v) =>
          v.id === id ? { ...v, status: v.status === 'active' ? 'paused' : 'active' } : v
        )
      );
    } catch (err) {
      alert('Không thể cập nhật trạng thái voucher: ' + err.message);
    }
  };

  const filtered = vouchers.filter(
    (v) =>
      v.venue.toLowerCase().includes(search.toLowerCase()) ||
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase())
  );

  const totalIssued = vouchers.reduce((acc, v) => acc + (v.issued || 0), 0);
  const totalUsed = vouchers.reduce((acc, v) => acc + (v.used || 0), 0);
  const conversionRate = totalIssued > 0 ? ((totalUsed / totalIssued) * 100).toFixed(1) + '%' : '0%';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Giám sát Voucher Toàn Sàn ({vouchers.length} chương trình)
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Kiểm soát lưu lượng phát hành, tỷ lệ đổi quà và phát hiện hành vi gian lận mã ưu đãi.
        </p>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TỔNG CHƯƠNG TRÌNH</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '4px' }}>{vouchers.length}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Đang được quản lý trên hệ thống</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>VOUCHER ĐÃ PHÁT</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#8B5CF6', marginTop: '4px' }}>{totalIssued.toLocaleString()}</h2>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>Tổng lượt lưu vào ví</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>VOUCHER ĐÃ SỬ DỤNG</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#10B981', marginTop: '4px' }}>{totalUsed.toLocaleString()}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Check-in thành công tại quầy</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TỶ LỆ CHUYỂN ĐỔI (CR)</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--primary)', marginTop: '4px' }}>{conversionRate}</h2>
          <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>Hiệu quả kích cầu đối soát</span>
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
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>Đang tải danh sách voucher toàn sàn...</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Ticket size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>Không tìm thấy voucher nào</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>Chưa có voucher nào trong hệ thống hoặc không khớp từ khóa tìm kiếm</p>
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
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
              )))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
