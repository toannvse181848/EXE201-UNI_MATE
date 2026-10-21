import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Store,
  Ticket,
  CheckCircle,
  Percent,
  Zap,
  Send,
  Crown,
  QrCode,
  Plus,
} from 'lucide-react';
import { venueApi, voucherApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PartnerPlanModal from '../../components/partner/PartnerPlanModal';
import OrderHistory from '../../components/OrderHistory';

export default function Dashboard() {
  const navigate = useNavigate();
  const { user, reloadUser } = useAuth();
  const [partnerVouchers, setPartnerVouchers] = useState([]);
  const [showPlanModal, setShowPlanModal] = useState(false);
  // Lượt quán quét voucher thật (biểu đồ 14 ngày + hoạt động gần đây) và chi nhánh của quán
  const [redemptions, setRedemptions] = useState([]);
  const [venues, setVenues] = useState([]);

  // Lấy hạn Gói Đối tác mới nhất (thông tin lúc đăng nhập không có partnerProfile).
  // Chỉ gọi 1 lần: reloadUser được tạo lại mỗi lần AuthProvider render nên không đưa vào deps
  useEffect(() => {
    reloadUser?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const planExpiresAt = user?.partnerProfile?.planExpiresAt;
  const isPlanActive = Boolean(planExpiresAt && new Date(planExpiresAt) > new Date());

  useEffect(() => {
    voucherApi
      .getMyPartnerVouchers()
      .then((res) => {
        setPartnerVouchers(res?.data || []);
      })
      .catch(() => {});
    voucherApi.getPartnerRedemptions(200).then((res) => setRedemptions(res?.data || [])).catch(() => {});
    venueApi.getMyVenues().then((res) => setVenues(res?.data || [])).catch(() => {});
  }, []);

  // Số liệu thật: lượt lưu vào ví, lượt quét tại quầy (cùng cách tính với trang admin)
  const totalIssued = partnerVouchers.reduce((acc, v) => acc + (v.claimedCount || 0), 0);
  const totalUsed = partnerVouchers.reduce((acc, v) => acc + (v.redeemedByQr || 0) + (v.redeemedByCode || 0), 0);
  const walletUsed = partnerVouchers.reduce((acc, v) => acc + (v.walletUsedCount || 0), 0);
  const usageRate = totalIssued > 0 ? `${((walletUsed / totalIssued) * 100).toFixed(1)}%` : '—';
  const runningVouchers = partnerVouchers.filter((v) => v.status === 'active').length;
  const approvedVenues = venues.filter((v) => v.status === 'approved').length;

  // Lượt quét mỗi ngày trong 14 ngày gần nhất (theo giờ máy)
  const dayKey = (d) => new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return dayKey(d);
  });
  const perDay = days.map((day) => ({ day, count: redemptions.filter((r) => dayKey(r.createdAt) === day).length }));
  const maxPerDay = Math.max(1, ...perDay.map((d) => d.count));
  const usedLast14 = perDay.reduce((acc, d) => acc + d.count, 0);

  const kpis = [
    { label: 'VOUCHER ĐANG CHẠY', val: `${runningVouchers}/${partnerVouchers.length}`, change: 'Sinh viên đang thấy được', icon: Eye, color: '#3B82F6' },
    { label: 'LƯỢT LƯU VÀO VÍ', val: totalIssued.toString(), change: 'Sinh viên đã lưu voucher của quán', icon: Ticket, color: '#8B5CF6' },
    { label: 'LƯỢT DÙNG TẠI QUẦY', val: totalUsed.toString(), change: 'Đã quét / nhập mã thành công', icon: CheckCircle, color: '#10B981' },
    { label: 'TỶ LỆ DÙNG VOUCHER ĐÃ LƯU', val: usageRate, change: `${walletUsed}/${totalIssued} voucher trong ví đã dùng`, icon: Percent, color: '#F59E0B' },
    { label: 'CHI NHÁNH ĐÃ DUYỆT', val: `${approvedVenues}/${venues.length}`, change: 'Chi nhánh chờ duyệt chưa hiện cho sinh viên', icon: Store, color: '#EC4899' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <PartnerPlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onPaid={reloadUser}
        planExpiresAt={planExpiresAt}
      />

      {/* Top Title & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Tổng quan
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Theo dõi hiệu suất và hoạt động kinh doanh của quán tại UNI-MATE.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={() => navigate('/partner/qr-scanner')} className="btn btn-secondary">
            <QrCode size={16} color="var(--primary)" />
            <span>Quét QR voucher</span>
          </button>
          <button onClick={() => navigate('/partner/vouchers?create=1')} className="btn btn-primary">
            <Plus size={16} />
            <span>Tạo voucher mới</span>
          </button>
        </div>
      </div>

      {/* Chỉ số chính (số liệu thật) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '16px',
        }}
      >
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div key={idx} className="portal-card" style={{ padding: '18px 20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  {kpi.label}
                </span>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: kpi.color + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={16} color={kpi.color} />
                </div>
              </div>
              <div style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {kpi.val}
              </div>
              {/* Dòng giải thích cách tính (không phải % tăng trưởng) */}
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>{kpi.change}</div>
            </div>
          );
        })}
      </div>

      {/* Tăng trưởng khách hàng (Growth & Monetization Banner) */}
      <div
        className="portal-card"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid #E2E8F0',
          padding: '24px',
        }}
      >
        <div style={{ marginBottom: '18px' }}>
          <h2 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
            Công cụ thu hút khách sinh viên
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Ưu đãi hẹn cafe và voucher hiện trực tiếp trong app sinh viên; Gói Đối tác đưa quán lên đầu danh sách quán.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Card 1: Ưu đãi hẹn cafe — sinh viên rủ nhau tới quán */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              border: '2px solid #FDBA74',
              backgroundColor: '#FFF7ED',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Zap size={18} color="var(--primary)" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Ưu đãi hẹn cafe
                </span>
                <span className="badge badge-orange">KHUYẾN NGHỊ</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', marginBottom: '16px' }}>
                Khi 2 sinh viên đã kết bạn rủ nhau tới quán bạn và chốt hẹn trên UNI-MATE, mỗi người tự nhận ưu đãi này. Quán có thêm khách đi theo cặp.
              </p>
            </div>
            <button
              onClick={() => navigate('/partner/vouchers?create=meetup')}
              className="btn btn-primary"
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
            >
              Tạo ưu đãi hẹn cafe
            </button>
          </div>

          {/* Card 2: Voucher thường */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#FAFAFA',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Send size={18} color="#8B5CF6" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Voucher cho sinh viên
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', marginBottom: '16px' }}>
                Hiện trong mục Voucher của sinh viên. Sinh viên lưu vào ví, tới quán đưa mã QR để nhân viên quét.
              </p>
            </div>
            <button
              onClick={() => navigate('/partner/vouchers?create=1')}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
            >
              Tạo voucher
            </button>
          </div>

          {/* Card 3: Partner Pro */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              border: '1px solid #C7D2FE',
              backgroundColor: '#EEF2FF',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Crown size={18} color="var(--indigo)" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--indigo-dark)' }}>
                  Gói Đối tác
                </span>
                <span className="badge badge-info">{isPlanActive ? 'ĐANG HOẠT ĐỘNG' : 'PREMIUM'}</span>
              </div>
              <p style={{ fontSize: '12px', color: '#4338CA', lineHeight: '18px', marginBottom: '16px' }}>
                {isPlanActive
                  ? `Quán đang được ưu tiên hiển thị đến ${new Date(planExpiresAt).toLocaleDateString('vi-VN')}.`
                  : 'Đưa quán lên đầu danh sách sinh viên xem và gắn huy hiệu "Đối tác nổi bật".'}
              </p>
            </div>
            <button
              className="btn btn-indigo"
              onClick={() => setShowPlanModal(true)}
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
            >
              {isPlanActive ? 'Gia hạn gói' : 'Nâng cấp ngay'}
            </button>
          </div>
        </div>
      </div>

      {/* Lịch sử mua Gói Đối tác (ẩn khi chưa có đơn) */}
      <OrderHistory onResume={() => setShowPlanModal(true)} refreshKey={showPlanModal} />

      {/* Hai cột: lượt dùng voucher 14 ngày + hoạt động gần đây (dữ liệu thật) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        <div className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', gap: '12px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>Voucher được dùng 14 ngày qua</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Mỗi cột là số lượt quét / nhập mã thành công tại quầy trong ngày</p>
            </div>
            <span className="badge badge-orange">{usedLast14} lượt</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '6px', height: '180px' }}>
            {perDay.map((d) => (
              <div key={d.day} title={`${d.day}: ${d.count} lượt`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: '4px' }}>
                {d.count > 0 && <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-primary)' }}>{d.count}</span>}
                <div style={{ width: '100%', maxWidth: '28px', height: `${Math.max(d.count > 0 ? 8 : 2, (d.count / maxPerDay) * 140)}px`, borderRadius: '6px 6px 2px 2px', backgroundColor: d.count > 0 ? '#FF5722' : '#E2E8F0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
            {perDay.map((d, i) => (
              <span key={d.day} style={{ flex: 1, textAlign: 'center', fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{i % 2 === 0 ? d.day : ''}</span>
            ))}
          </div>
          {usedLast14 === 0 && (
            <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginTop: '10px' }}>
              Chưa có lượt dùng nào. Tạo "Ưu đãi hẹn cafe" để sinh viên rủ nhau tới quán.
            </p>
          )}
        </div>

        <div className="portal-card">
          <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>Lượt dùng gần đây</h3>
          {redemptions.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chưa có sinh viên nào dùng voucher tại quán.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {redemptions.slice(0, 6).map((r) => (
                <div key={r._id} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: r.method === 'qr' ? '#10B981' : '#8B5CF6', marginTop: '6px', flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      {r.userId?.fullName || 'Khách nhập mã chung'} · {r.voucherId?.title || r.voucherId?.code || 'Voucher'}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      {r.method === 'qr' ? 'Quét mã trong ví' : 'Nhập mã'} • {new Date(r.createdAt).toLocaleString('vi-VN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
