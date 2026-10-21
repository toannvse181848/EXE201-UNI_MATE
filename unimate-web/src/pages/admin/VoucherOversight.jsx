import React, { useState, useEffect } from 'react';
import {
  Ticket,
  Search,
  Loader2,
} from 'lucide-react';
import { voucherApi } from '../../services/api';
import VoucherStatusBadge from '../../components/VoucherStatusBadge';
import { describeVoucher } from '../../utils/voucher';

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
        // Nhãn giá trị + trạng thái do backend tính, giống hệt trang quán
        discount: describeVoucher(v).discountLabel,
        condition: describeVoucher(v).conditionLabel,
        kind: v.meetupReward ? 'Hẹn cafe' : v.premiumOnly ? 'Chỉ Premium' : 'Thường',
        claimed: v.claimedCount || 0,
        walletUsed: v.walletUsedCount || 0,
        // Lượt dùng thật tại quầy (theo bản ghi quét): quét ví + nhập mã chung
        usedQr: v.redeemedByQr || 0,
        usedCode: v.redeemedByCode || 0,
        isActive: Boolean(v.isActive),
        status: v.status || (v.isActive ? 'active' : 'paused'),
        statusLabel: v.statusLabel,
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
      // Trạng thái (chờ duyệt quán, hết hạn...) do backend tính → tải lại cho đúng
      await fetchVouchers();
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

  const sum = (key) => vouchers.reduce((acc, v) => acc + (v[key] || 0), 0);
  const totalClaimed = sum('claimed');
  const totalWalletUsed = sum('walletUsed');
  const totalQr = sum('usedQr');
  const totalCode = sum('usedCode');
  const activeCount = vouchers.filter((v) => v.status === 'active').length;
  // Trong số voucher sinh viên đã lưu vào ví, bao nhiêu % đã được dùng tại quán (không thể vượt 100%)
  const walletUseRate = totalClaimed > 0 ? `${((totalWalletUsed / totalClaimed) * 100).toFixed(1)}%` : '—';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Giám sát Voucher Toàn Sàn ({vouchers.length} chương trình)
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Trạng thái và số liệu giống hệt trang của quán. Tạm dừng voucher vi phạm hoặc bật lại.
        </p>
      </div>

      {/* KPI Stats — số liệu thật từ ví sinh viên và bản ghi quét tại quầy */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TỔNG CHƯƠNG TRÌNH</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', marginTop: '4px' }}>{vouchers.length}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{activeCount} đang chạy (sinh viên thấy được)</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>LƯỢT LƯU VÀO VÍ</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#8B5CF6', marginTop: '4px' }}>{totalClaimed.toLocaleString('vi-VN')}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Gồm cả ưu đãi hẹn cafe tự nhận</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>LƯỢT DÙNG TẠI QUẦY</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#10B981', marginTop: '4px' }}>{(totalQr + totalCode).toLocaleString('vi-VN')}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{totalQr} quét ví · {totalCode} nhập mã chung</span>
        </div>
        <div className="portal-card" style={{ padding: '18px' }}>
          <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)' }}>TỶ LỆ DÙNG VOUCHER ĐÃ LƯU</span>
          <h2 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--primary)', marginTop: '4px' }}>{walletUseRate}</h2>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{totalWalletUsed}/{totalClaimed} voucher trong ví đã được quán quét</span>
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
                <th style={{ padding: '12px 14px' }}>LOẠI</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ĐÃ LƯU</th>
                <th style={{ padding: '12px 14px', textAlign: 'center' }}>ĐÃ DÙNG</th>
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
                  <td style={{ padding: '14px 14px', fontWeight: '700' }}>
                    {v.discount}
                    <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)' }}>{v.condition}</div>
                  </td>
                  <td style={{ padding: '14px 14px', fontSize: '12px', fontWeight: '700', color: v.kind === 'Thường' ? 'var(--text-secondary)' : '#C2410C' }}>{v.kind}</td>
                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>{v.claimed}</td>
                  <td style={{ padding: '14px 14px', textAlign: 'center', fontWeight: '700', color: '#10B981' }}>
                    {v.usedQr + v.usedCode}
                    {v.usedCode > 0 && (
                      <div style={{ fontSize: '10.5px', fontWeight: '600', color: 'var(--text-muted)' }}>{v.usedCode} nhập mã</div>
                    )}
                  </td>
                  <td style={{ padding: '14px 14px', textAlign: 'center' }}>
                    <VoucherStatusBadge status={v.status} label={v.statusLabel} />
                  </td>
                  <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                    <button
                      onClick={() => togglePause(v.id)}
                      className="btn btn-secondary"
                      style={{ padding: '5px 10px', fontSize: '12px' }}
                    >
                      {v.isActive ? 'Tạm dừng' : 'Bật lại'}
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
