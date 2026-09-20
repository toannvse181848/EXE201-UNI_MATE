import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Heart,
  Ticket,
  CheckCircle,
  Percent,
  DollarSign,
  TrendingUp,
  Zap,
  Send,
  Crown,
  QrCode,
  Plus,
  ArrowUpRight,
  Clock,
  Star,
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [boostActive, setBoostActive] = useState(false);

  const kpis = [
    { label: 'LƯỢT HIỂN THỊ', val: '12,450', change: '+14% vs tháng trước', icon: Eye, color: '#3B82F6' },
    { label: 'LƯỢT ĐƯỢC CHỌN', val: '3,210', change: '+8% vs tháng trước', icon: Heart, color: '#EC4899' },
    { label: 'VOUCHER ĐÃ PHÁT', val: '1,850', change: '+12% vs tháng trước', icon: Ticket, color: '#8B5CF6' },
    { label: 'VOUCHER ĐÃ DÙNG', val: '945', change: '+22% vs tháng trước', icon: CheckCircle, color: '#10B981' },
    { label: 'TỶ LỆ SỬ DỤNG', val: '51.1%', change: '+3.2% vs tháng trước', icon: Percent, color: '#F59E0B' },
    { label: 'DOANH THU ƯỚC TÍNH', val: '28.5M VNĐ', change: '+21% vs tháng trước', icon: DollarSign, color: '#FF5722' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
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
          <button onClick={() => navigate('/partner/vouchers')} className="btn btn-primary">
            <Plus size={16} />
            <span>Tạo voucher mới</span>
          </button>
        </div>
      </div>

      {/* 6 Metric KPI Cards */}
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#10B981', fontWeight: '700' }}>
                <TrendingUp size={12} />
                <span>{kpi.change}</span>
              </div>
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
            Tăng trưởng khách hàng (Monetization Tools)
          </h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Địa điểm của bạn có thể được ưu tiên hiển thị với nhóm user phù hợp như học bài, đi cafe, chơi boardgame hoặc workshop.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
          {/* Card 1: Boost */}
          <div
            style={{
              padding: '18px',
              borderRadius: '16px',
              border: boostActive ? '2px solid var(--primary)' : '1px solid var(--border-color)',
              backgroundColor: boostActive ? 'var(--primary-light)' : '#FAFAFA',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Zap size={18} color="var(--primary)" />
                <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Boost địa điểm
                </span>
                {boostActive && <span className="badge badge-orange">ĐANG CHẠY</span>}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', marginBottom: '16px' }}>
                Ưu tiên địa điểm trong phần gợi ý sau match của sinh viên trong bán kính 3km.
              </p>
            </div>
            <button
              onClick={() => setBoostActive(!boostActive)}
              className={`btn ${boostActive ? 'btn-secondary' : 'btn-primary'}`}
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
            >
              {boostActive ? 'Tắt Boost' : 'Boost ngay (299k/tuần)'}
            </button>
          </div>

          {/* Card 2: Đẩy voucher */}
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
                  Đẩy voucher mục tiêu
                </span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '18px', marginBottom: '16px' }}>
                Đưa voucher của bạn đến đúng nhóm sinh viên các trường ĐH lân cận đang tìm quán học bài.
              </p>
            </div>
            <button
              onClick={() => navigate('/partner/vouchers')}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
            >
              Tạo chiến dịch đẩy
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
                  Partner Pro
                </span>
                <span className="badge badge-info">PREMIUM</span>
              </div>
              <p style={{ fontSize: '12px', color: '#4338CA', lineHeight: '18px', marginBottom: '16px' }}>
                Mở khóa analytics chuyên sâu theo giờ, độ tuổi sinh viên và huy hiệu Verified Partner.
              </p>
            </div>
            <button
              className="btn btn-indigo"
              style={{ width: '100%', padding: '8px', fontSize: '13px' }}
            >
              Nâng cấp Pro
            </button>
          </div>
        </div>
      </div>

      {/* Two Column: Foot-Traffic Chart + Recent Activities */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Left Chart */}
        <div className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Voucher được sử dụng trong 30 ngày
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Số lượng sinh viên check-in và đổi ưu đãi tại quầy thu ngân
              </p>
            </div>
            <span className="badge badge-orange">+22% Tháng này</span>
          </div>

          {/* SVG Smooth Curve Chart */}
          <div style={{ width: '100%', height: '220px', position: 'relative', marginTop: '10px' }}>
            <svg viewBox="0 0 600 200" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
              <defs>
                <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FF5722" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#FF5722" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Grid Lines */}
              <line x1="0" y1="40" x2="600" y2="40" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="90" x2="600" y2="90" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4" />
              <line x1="0" y1="140" x2="600" y2="140" stroke="#F1F5F9" strokeWidth="1" strokeDasharray="4" />

              {/* Fill Area */}
              <path
                d="M 0,160 Q 75,150 150,110 T 300,70 T 450,120 T 600,30 L 600,180 L 0,180 Z"
                fill="url(#chartGradient)"
              />

              {/* Stroke Line */}
              <path
                d="M 0,160 Q 75,150 150,110 T 300,70 T 450,120 T 600,30"
                fill="none"
                stroke="#FF5722"
                strokeWidth="3.5"
                strokeLinecap="round"
              />

              {/* Data Points */}
              <circle cx="150" cy="110" r="5" fill="#FF5722" stroke="#fff" strokeWidth="2.5" />
              <circle cx="300" cy="70" r="5" fill="#FF5722" stroke="#fff" strokeWidth="2.5" />
              <circle cx="450" cy="120" r="5" fill="#FF5722" stroke="#fff" strokeWidth="2.5" />
              <circle cx="600" cy="30" r="6" fill="#FF5722" stroke="#fff" strokeWidth="3" />
            </svg>

            {/* X-Axis labels */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600' }}>
              <span>01/10</span>
              <span>08/10</span>
              <span>16/10</span>
              <span>23/10</span>
              <span>30/10</span>
            </div>
          </div>
        </div>

        {/* Right Activities List */}
        <div className="portal-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Hoạt động gần đây
            </h3>
            <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '700', cursor: 'pointer' }}>
              Xem tất cả
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#EF4444', marginTop: '6px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  2 cặp sinh viên vừa chọn quán
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Sau khi match trên app UNI-MATE • Vài phút trước
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#8B5CF6', marginTop: '6px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  5 voucher đã dùng thành công
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Chiến dịch: "Hẹn hò cuối tuần giảm 20%" • 2 giờ trước
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#F59E0B', marginTop: '6px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Đánh giá mới 5 sao ⭐
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  "Không gian yên tĩnh, đồ uống ngon và wifi rất mạnh!" • Hôm qua, 18:30
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '4px', backgroundColor: '#3B82F6', marginTop: '6px' }} />
              <div>
                <p style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Chiến dịch mới được duyệt
                </p>
                <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  Chiến dịch "Sinh viên tháng 10" đã bắt đầu chạy • 2 ngày trước
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
