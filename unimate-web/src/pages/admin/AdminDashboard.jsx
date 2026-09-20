import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  Users,
  HeartHandshake,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();

  const stats = [
    { label: 'TỔNG ĐỐI TÁC QUÁN', val: '187', change: '+12 quán mới tháng này', icon: Store, color: '#3B82F6' },
    { label: 'SINH VIÊN HOẠT ĐỘNG', val: '4,520', change: '+24% tăng trưởng user', icon: Users, color: '#10B981' },
    { label: 'LƯỢT MATCH & HẸN GẶP', val: '1,280', change: '+18% buổi hẹn cafe', icon: HeartHandshake, color: '#EC4899' },
    { label: 'GIAO DỊCH VOUCHER', val: '142.5M VNĐ', change: '+32% doanh số kích cầu', icon: DollarSign, color: '#FF5722' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '26px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Tổng quan Sàn UNI-MATE
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Hệ thống giám sát chỉ số toàn sàn, phân bổ đối tác và xử lý hồ sơ cần phê duyệt.
        </p>
      </div>

      {/* 4 Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '18px' }}>
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div key={idx} className="portal-card" style={{ padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                  {s.label}
                </span>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '8px',
                    backgroundColor: s.color + '15',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Icon size={18} color={s.color} />
                </div>
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {s.val}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#10B981', fontWeight: '700' }}>
                <TrendingUp size={13} />
                <span>{s.change}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Urgent Operational Alerts */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Pending Venues Card */}
        <div
          className="portal-card"
          style={{
            borderLeft: '4px solid #F59E0B',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} color="#D97706" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                12 Quán đối tác đang chờ duyệt
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Các quán mới đăng ký cần xác thực giấy phép và menu
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/venues')}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            <span>Duyệt hồ sơ</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Urgent Reports Card */}
        <div
          className="portal-card"
          style={{
            borderLeft: '4px solid #EF4444',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldAlert size={22} color="#DC2626" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                3 Báo cáo khiếu nại mức cao (High)
              </h3>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Sinh viên phản ánh quán từ chối voucher hoặc tính sai tiền
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/admin/reports')}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '13px', color: '#DC2626' }}
          >
            <span>Xử lý ngay</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>

      {/* Partner Breakdown Section */}
      <div className="portal-card">
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
          Phân bổ trạng thái 187 cơ sở đối tác
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '14px' }}>
          <div style={{ padding: '16px', backgroundColor: '#ECFDF5', borderRadius: '14px', border: '1px solid #A7F3D0' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#065F46' }}>ĐANG HOẠT ĐỘNG</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#065F46', marginTop: '4px' }}>152</h2>
            <span style={{ fontSize: '11px', color: '#059669' }}>81.2% trên toàn sàn</span>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#FFFBEB', borderRadius: '14px', border: '1px solid #FDE68A' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#92400E' }}>ĐANG CHỜ DUYỆT</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#92400E', marginTop: '4px' }}>12</h2>
            <span style={{ fontSize: '11px', color: '#D97706' }}>Cần xử lý trong 24h</span>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#FEF2F2', borderRadius: '14px', border: '1px solid #FECACA' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#991B1B' }}>BỊ TẠM KHOÁ</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#991B1B', marginTop: '4px' }}>6</h2>
            <span style={{ fontSize: '11px', color: '#DC2626' }}>Vi phạm chính sách sàn</span>
          </div>

          <div style={{ padding: '16px', backgroundColor: '#EFF6FF', borderRadius: '14px', border: '1px solid #BFDBFE' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#1E40AF' }}>ĐANG CHẠY BOOST</span>
            <h2 style={{ fontSize: '26px', fontWeight: '900', color: '#1E40AF', marginTop: '4px' }}>17</h2>
            <span style={{ fontSize: '11px', color: '#2563EB' }}>Gói quảng cáo trả phí</span>
          </div>
        </div>
      </div>
    </div>
  );
}
