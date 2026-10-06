import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import cover from '../assets/cover.png';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Coffee,
  Ticket,
  Users,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  MapPin,
  Wifi,
  Zap,
  Clock,
  Star,
  LogIn,
  UserPlus,
  ExternalLink,
  ChevronRight,
  Award,
  Heart,
  Store,
  Layers,
  Search,
  Lock,
  EyeOff,
  FileText,
  KeyRound,
  X,
} from 'lucide-react';

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('student');
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const getPortalUrl = () => {
    if (!user) return '/user/discover';
    if (user.role === 'admin') return '/admin/dashboard';
    if (user.role === 'partner') return '/partner/dashboard';
    return '/user/discover';
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FAFAFA', color: '#1E293B', fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* 🌟 TOP NAVIGATION BAR */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 100,
          backgroundColor: 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1px solid #E2E8F0',
          boxShadow: '0 4px 20px -2px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '14px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '12px',
                backgroundColor: '#FFF5F0',
                border: '1.5px solid #FFCCBC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 10px rgba(255, 87, 34, 0.15)',
              }}
            >
              <img src={logoIcon} alt="UNI-MATE" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '20px', fontWeight: '900', color: '#1E293B', letterSpacing: '-0.5px' }}>
                  UNI<span style={{ color: '#FF5722' }}>-MATE</span>
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    backgroundColor: '#FF5722',
                    color: '#FFFFFF',
                    padding: '2px 7px',
                    borderRadius: '9999px',
                    letterSpacing: '0.4px',
                  }}
                >
                  SINH VIÊN & CAFE
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#64748B', fontWeight: '500' }}>
                Học hết mình — Chơi hết phố
              </span>
            </div>
          </Link>

          {/* Nav Links (Desktop) */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '28px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#475569',
            }}
            className="home-desktop-nav"
          >
            <a href="#features" style={{ transition: 'color 0.2s', textDecoration: 'none' }} className="nav-item">
              Tính năng
            </a>
            <a href="#study-match" style={{ transition: 'color 0.2s', textDecoration: 'none' }} className="nav-item">
              Ghép bạn học
            </a>
            <a href="#cafes" style={{ transition: 'color 0.2s', textDecoration: 'none' }} className="nav-item">
              Không gian Cafe
            </a>
            <a href="#vouchers" style={{ transition: 'color 0.2s', textDecoration: 'none' }} className="nav-item">
              Voucher & UniCoin
            </a>
            <a href="#partner-section" style={{ transition: 'color 0.2s', textDecoration: 'none' }} className="nav-item">
              Dành cho Quán Cafe
            </a>
          </nav>

          {/* 🎯 GÓC DẪN TỚI ĐĂNG NHẬP / ĐĂNG KÝ (Top Right Corner) */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {user ? (
              // Trạng thái đã đăng nhập
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 14px',
                    backgroundColor: '#FFF5F0',
                    borderRadius: '9999px',
                    border: '1px solid #FFCCBC',
                  }}
                >
                  <img
                    src={user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'}
                    alt={user.name}
                    style={{ width: '28px', height: '28px', borderRadius: '50%', objectFit: 'cover' }}
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                    <span style={{ fontSize: '13px', fontWeight: '800', color: '#1E293B', lineHeight: '1.2' }}>
                      {user.name}
                    </span>
                    <span style={{ fontSize: '10px', color: '#FF5722', fontWeight: '700' }}>
                      {user.role === 'admin' ? 'Quản trị viên' : user.role === 'partner' ? 'Đối tác Cafe' : 'Sinh viên'}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(getPortalUrl())}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    backgroundColor: '#FF5722',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '13px',
                    boxShadow: '0 4px 14px rgba(255, 87, 34, 0.3)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.backgroundColor = '#E64A19';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.backgroundColor = '#FF5722';
                  }}
                >
                  <span>Vào ứng dụng</span>
                  <ArrowRight size={15} />
                </button>

                <button
                  onClick={() => {
                    logout();
                    navigate('/login');
                  }}
                  title="Đăng xuất"
                  style={{
                    fontSize: '12px',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    padding: '8px',
                    fontWeight: '600',
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              // Trạng thái chưa đăng nhập: Nút Đăng nhập & Đăng ký nổi bật
              <>
                <Link
                  to="/login"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#334155',
                    fontSize: '14px',
                    fontWeight: '700',
                    textDecoration: 'none',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#FF5722';
                    e.currentTarget.style.color = '#FF5722';
                    e.currentTarget.style.backgroundColor = '#FFF5F0';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#CBD5E1';
                    e.currentTarget.style.color = '#334155';
                    e.currentTarget.style.backgroundColor = '#FFFFFF';
                  }}
                >
                  <LogIn size={16} />
                  <span>Đăng nhập</span>
                </Link>

                <Link
                  to="/register"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '800',
                    textDecoration: 'none',
                    boxShadow: '0 4px 16px rgba(255, 87, 34, 0.35)',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(255, 87, 34, 0.45)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 16px rgba(255, 87, 34, 0.35)';
                  }}
                >
                  <UserPlus size={16} />
                  <span>Đăng ký ngay</span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* 🚀 HERO SECTION */}
      <section
        style={{
          position: 'relative',
          overflow: 'hidden',
          padding: '80px 24px 100px',
          background: 'linear-gradient(180deg, #FFFFFF 0%, #FFF7ED 50%, #F8FAFC 100%)',
        }}
      >
        {/* Background decorative blurs */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            right: '-100px',
            width: '450px',
            height: '450px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 87, 34, 0.12) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '20px',
            left: '-100px',
            width: '400px',
            height: '400px',
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255, 152, 0, 0.1) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />

        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.1fr 0.9fr',
            gap: '60px',
            alignItems: 'center',
          }}
          className="hero-grid"
        >
          {/* Left Column: Headlines & CTAs */}
          <div>
            {/* Pill Tag */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: '#FFF3E0',
                border: '1px solid #FFE0B2',
                borderRadius: '9999px',
                color: '#E65100',
                fontSize: '13px',
                fontWeight: '800',
                marginBottom: '24px',
              }}
            >
              <Sparkles size={16} color="#FF5722" />
              <span>Nền Tảng Đột Phá Dành Riêng Cho Sinh Viên TP.HCM</span>
            </div>

            {/* Main Title */}
            <h1
              style={{
                fontSize: '52px',
                fontWeight: '900',
                lineHeight: 1.15,
                color: '#0F172A',
                letterSpacing: '-1.5px',
                marginBottom: '20px',
              }}
            >
              Ghép Bạn Học & Săn Ưu Đãi Cafe Cùng{' '}
              <span
                style={{
                  background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                UNI-MATE
              </span>
            </h1>

            {/* Subtitle */}
            <p
              style={{
                fontSize: '18px',
                color: '#475569',
                lineHeight: 1.6,
                marginBottom: '36px',
                maxWidth: '560px',
              }}
            >
              Không còn cày deadline một mình. Kết nối bạn học cùng trường ĐH, chọn quán cafe yên tĩnh có đủ ổ cắm & wifi tốc độ cao, đồng thời săn voucher giảm giá tới 50% mỗi ngày!
            </p>

            {/* Hero CTAs */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '14px', marginBottom: '40px' }}>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 32px',
                  borderRadius: '16px',
                  background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                  color: '#FFFFFF',
                  fontSize: '16px',
                  fontWeight: '800',
                  textDecoration: 'none',
                  boxShadow: '0 10px 25px rgba(255, 87, 34, 0.35)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 14px 30px rgba(255, 87, 34, 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 10px 25px rgba(255, 87, 34, 0.35)';
                }}
              >
                <span>Tạo tài khoản Uni-Card Miễn Phí</span>
                <ArrowRight size={18} />
              </Link>

              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '16px 28px',
                  borderRadius: '16px',
                  backgroundColor: '#FFFFFF',
                  color: '#1E293B',
                  border: '1.5px solid #E2E8F0',
                  fontSize: '16px',
                  fontWeight: '700',
                  textDecoration: 'none',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#FF5722';
                  e.currentTarget.style.color = '#FF5722';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.color = '#1E293B';
                }}
              >
                <LogIn size={18} />
                <span>Đăng nhập</span>
              </Link>
            </div>

            {/* Social Proof */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingTop: '10px' }}>
              <div style={{ display: 'flex', marginLeft: '8px' }}>
                {[
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=100',
                  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
                  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
                ].map((imgUrl, idx) => (
                  <img
                    key={idx}
                    src={imgUrl}
                    alt="Student"
                    style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '50%',
                      border: '2.5px solid #FFFFFF',
                      marginLeft: idx === 0 ? 0 : '-12px',
                      objectFit: 'cover',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                    }}
                  />
                ))}
              </div>
              <div style={{ fontSize: '13px', color: '#64748B' }}>
                <strong style={{ color: '#0F172A', fontWeight: '800' }}>15,000+ Sinh viên</strong> từ FPTU, Bách Khoa, UEH, UIT đã tham gia
              </div>
            </div>
          </div>

          {/* Right Column: Privacy Policy & Personal Data Protection Banner (No Overlapping Elements) */}
          <div>
            {/* Main Interactive Security Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '28px',
                padding: '30px',
                boxShadow: '0 20px 45px -10px rgba(16, 185, 129, 0.12), 0 8px 20px -4px rgba(0, 0, 0, 0.04)',
                border: '1.5px solid #D1FAE5',
              }}
            >
              {/* Card Header with Shield */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={26} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', letterSpacing: '-0.3px' }}>
                      Bảo Vệ Thông Tin & Dữ Liệu
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                      <span
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor: '#10B981',
                          display: 'inline-block',
                          boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.25)',
                        }}
                      />
                      <span style={{ fontSize: '11px', color: '#059669', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Bảo mật cấp độ cao đang kích hoạt
                      </span>
                    </div>
                  </div>
                </div>

                <span
                  style={{
                    backgroundColor: '#ECFDF5',
                    color: '#065F46',
                    fontSize: '12px',
                    fontWeight: '800',
                    padding: '6px 12px',
                    borderRadius: '20px',
                    border: '1px solid #A7F3D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Lock size={13} />
                  <span>Nghị định 13/CP</span>
                </span>
              </div>

              {/* 2 Highlight Trust Badges (Clean 2-Column Row, Không bị che lấp) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '16px',
                    backgroundColor: '#F0FDF4',
                    border: '1.5px solid #BBF7D0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: '#ECFDF5',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#10B981',
                      flexShrink: 0,
                    }}
                  >
                    <Lock size={18} />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#0F172A', display: 'block' }}>
                      Bảo vệ 100% Danh tính
                    </span>
                    <span style={{ fontSize: '10px', color: '#059669', fontWeight: '700' }}>
                      Mã hóa 2 lớp AES-256
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    padding: '12px 14px',
                    borderRadius: '16px',
                    backgroundColor: '#0F172A',
                    border: '1.5px solid #1E293B',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      width: '34px',
                      height: '34px',
                      borderRadius: '10px',
                      backgroundColor: '#10B981',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <ShieldCheck size={18} color="#FFFFFF" />
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', fontWeight: '800', display: 'block' }}>
                      Nghị Định 13/CP
                    </span>
                    <span style={{ fontSize: '10px', color: '#94A3B8' }}>
                      Chuẩn dữ liệu cá nhân
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Bar: Encryption & Compliance */}
              <div
                style={{
                  backgroundColor: '#F8FAFC',
                  borderRadius: '14px',
                  padding: '10px 14px',
                  border: '1px solid #E2E8F0',
                  marginBottom: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <KeyRound size={15} color="#059669" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#334155' }}>
                    Chuẩn truyền thông bảo mật SSL/TLS 256-bit
                  </span>
                </div>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: '800',
                    backgroundColor: '#10B981',
                    color: '#FFFFFF',
                    padding: '2px 8px',
                    borderRadius: '6px',
                  }}
                >
                  HOẠT ĐỘNG
                </span>
              </div>

              {/* 3 Core Privacy Guarantees */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#EFF6FF',
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <EyeOff size={16} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                      Ẩn danh thông tin nhạy cảm
                    </h5>
                    <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                      Số điện thoại, email và MSSV của bạn được che kín hoàn toàn. Sinh viên khác chỉ thấy Tên và Trường học mà bạn đồng ý hiển thị trên thẻ Uni-Card.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#ECFDF5',
                      color: '#059669',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <ShieldCheck size={16} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                      Xác minh MSSV an toàn — Không lưu ảnh thẻ thô
                    </h5>
                    <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                      Hình ảnh thẻ sinh viên chỉ dùng đối soát một lần để cấp tích xanh chính chủ. Tuyệt đối không lưu trữ hay chia sẻ thông tin này cho bên thứ ba.
                    </p>
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '12px 14px',
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      backgroundColor: '#FFFBEB',
                      color: '#D97706',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: '2px',
                    }}
                  >
                    <Lock size={16} />
                  </div>
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A', marginBottom: '2px' }}>
                      Nói không với bán dữ liệu & Tiếp thị rác
                    </h5>
                    <p style={{ fontSize: '12px', color: '#64748B', lineHeight: 1.5 }}>
                      UNI-MATE cam kết 100% không bán dữ liệu hành vi, số điện thoại hay thông tin sinh viên cho bất kỳ bên quảng cáo nào.
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button: View Full Policy (Hoàn toàn rõ ràng, không bị đè che) */}
              <button
                type="button"
                onClick={() => setPrivacyModalOpen(true)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '14px 20px',
                  borderRadius: '14px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '13px',
                  cursor: 'pointer',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(5, 150, 105, 0.28)',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#047857';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <FileText size={16} />
                <span>Xem chi tiết Chính sách bảo mật & Điều khoản bảo vệ</span>
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 📊 KEY STATS SECTION */}
      <section style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #F1F5F9', borderBottom: '1px solid #F1F5F9', padding: '40px 24px' }}>
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '24px',
            textAlign: 'center',
          }}
          className="stats-grid"
        >
          <div>
            <div style={{ fontSize: '38px', fontWeight: '900', color: '#FF5722', letterSpacing: '-1px' }}>15,000+</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>Sinh viên tham gia</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Từ 20+ trường ĐH tại TP.HCM</div>
          </div>

          <div>
            <div style={{ fontSize: '38px', fontWeight: '900', color: '#0F172A', letterSpacing: '-1px' }}>120+</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>Quán Cafe & Không gian học</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Đầy đủ ổ điện, wifi và yên tĩnh</div>
          </div>

          <div>
            <div style={{ fontSize: '38px', fontWeight: '900', color: '#10B981', letterSpacing: '-1px' }}>35,000+</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>Voucher đã được đổi</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Tiết kiệm hơn 500 triệu đồng</div>
          </div>

          <div>
            <div style={{ fontSize: '38px', fontWeight: '900', color: '#FF9800', letterSpacing: '-1px' }}>98.6%</div>
            <div style={{ fontSize: '14px', fontWeight: '700', color: '#0F172A', marginTop: '4px' }}>Độ tin nhiệm sinh viên</div>
            <div style={{ fontSize: '12px', color: '#64748B' }}>Xác minh MSSV & đánh giá văn minh</div>
          </div>
        </div>
      </section>

      {/* 💡 4 TÍNH NĂNG NỔI BẬT (CORE FEATURES) */}
      <section id="features" style={{ padding: '90px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#FF5722', letterSpacing: '1px' }}>
            HỆ SINH THÁI TOÀN DIỆN
          </span>
          <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#0F172A', marginTop: '8px', letterSpacing: '-0.5px' }}>
            UNI-MATE Mang Lại Gì Cho Bạn?
          </h2>
          <p style={{ fontSize: '16px', color: '#64748B', maxWidth: '640px', margin: '12px auto 0' }}>
            Giải pháp tất cả trong một giúp sinh viên giải quyết mọi khó khăn khi học nhóm, cày deadline và tìm kiếm địa điểm cafe.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '30px',
          }}
          className="features-grid"
        >
          {/* Feature 1 */}
          <div
            id="study-match"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
                boxShadow: '0 8px 20px rgba(255, 87, 34, 0.3)',
              }}
            >
              <Users size={28} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
              1. Ghép Đôi Bạn Học Thông Minh (Study Match)
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
              Thuật toán thông minh tự động tìm kiếm và gợi ý các bạn sinh viên cùng trường (FPT, BK, UEH, UIT...), cùng chuyên ngành, cùng môn học đang chuẩn bị thi hoặc làm đồ án tốt nghiệp.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Lọc theo trường đại học, ngành học và năm học',
                'Tính % độ hợp gu học tập (yên tĩnh, thảo luận, cày đêm)',
                'Gửi lời mời ghép đôi học cafe an toàn và văn minh',
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#FF5722" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Feature 2 */}
          <div
            id="cafes"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#FFF3E0',
                color: '#E65100',
                border: '1px solid #FFE0B2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Coffee size={28} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
              2. Không Gian Cafe Học Bài Đạt Chuẩn Sinh Viên
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
              Không còn nỗi lo vào quán cafe hết ổ cắm hay wifi chập chờn. Danh sách quán cafe đối tác trên UNI-MATE đều được kiểm định thực tế các tiện ích học tập quan trọng.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Kiểm định ổ cắm điện từng bàn và wifi tốc độ cao (>100Mbps)',
                'Phân loại khu vực yên tĩnh cày bài vs khu họp nhóm thảo luận',
                'Hiển thị khoảng cách chính xác từ cổng trường ĐH đến quán',
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#E65100" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Feature 3 */}
          <div
            id="vouchers"
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#ECFDF5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <Ticket size={28} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
              3. Săn Voucher & Tích Lũy UniCoin
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
              Tiết kiệm chi phí uống nước học bài mỗi ngày. Tích điểm UniCoin qua mỗi lần check-in học bài và đổi lấy mã giảm giá đồ uống từ các đối tác lớn như The Coffee House, Phúc Long, v.v.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Voucher giảm 20% - 50% dành riêng cho thẻ sinh viên',
                'Quét mã QR tại quầy thanh toán cực nhanh trong 3 giây',
                'Nhận thưởng UniCoin khi hoàn thành các thử thách học nhóm',
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#059669" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Feature 4 */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              border: '1px solid #E2E8F0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.04)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#EEF2FF',
                color: '#4F46E5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px',
              }}
            >
              <ShieldCheck size={28} />
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
              4. Thẻ Uni-Card & Điểm Tin Nhiệm Sinh Viên
            </h3>
            <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
              An toàn là ưu tiên số một. Hồ sơ sinh viên Uni-Card được xác minh qua mã số sinh viên (MSSV) và hệ thống điểm tin nhiệm cộng đồng nhằm loại bỏ tài khoản ảo, xây dựng không gian học tập văn minh.
            </p>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {[
                'Xác thực sinh viên chính chủ qua MSSV và email trường',
                'Hệ thống chấm điểm tin nhiệm sau mỗi lần gặp gỡ',
                'Cơ chế báo cáo vi phạm và đội ngũ Admin trực duyệt 24/7',
              ].map((text, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: '#334155' }}>
                  <CheckCircle2 size={16} color="#4F46E5" />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* 🚀 QUY TRÌNH 3 BƯỚC (HOW IT WORKS) */}
      <section style={{ backgroundColor: '#F8FAFC', padding: '90px 24px', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#FF5722', letterSpacing: '1px' }}>
              DỄ DÀNG SỬ DỤNG
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#0F172A', marginTop: '8px' }}>
              Bắt Đầu Cùng UNI-MATE Trong 3 Bước
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '30px',
            }}
            className="steps-grid"
          >
            {[
              {
                step: '01',
                title: 'Đăng Ký & Kích Hoạt Uni-Card',
                desc: 'Đăng ký tài khoản nhanh chóng bằng email trường hoặc cá nhân, chọn trường ĐH và ngành học của bạn để nhận ngay 100 UniCoin chào mừng.',
                linkText: 'Đăng ký ngay →',
                linkUrl: '/register',
              },
              {
                step: '02',
                title: 'Ghép Bạn Học & Chọn Quán Cafe',
                desc: 'Khám phá danh sách bạn học đang tìm người học chung hoặc chọn quán cafe gần trường có không gian và ưu đãi phù hợp.',
                linkText: 'Xem giao diện ghép đôi →',
                linkUrl: '/login',
              },
              {
                step: '03',
                title: 'Cày Deadline & Quét Mã Nhận Ưu Đãi',
                desc: 'Đến quán gặp gỡ, học tập hiệu quả cùng nhau và đưa mã QR voucher cho nhân viên quét để nhận giảm giá đồ uống tức thì.',
                linkText: 'Khám phá Voucher →',
                linkUrl: '/login',
              },
            ].map((item, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '36px',
                  border: '1px solid #E2E8F0',
                  position: 'relative',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <span
                    style={{
                      fontSize: '36px',
                      fontWeight: '900',
                      color: '#FFCCBC',
                      display: 'block',
                      marginBottom: '16px',
                    }}
                  >
                    {item.step}
                  </span>
                  <h4 style={{ fontSize: '20px', fontWeight: '800', color: '#0F172A', marginBottom: '12px' }}>
                    {item.title}
                  </h4>
                  <p style={{ fontSize: '15px', color: '#64748B', lineHeight: 1.6, marginBottom: '24px' }}>
                    {item.desc}
                  </p>
                </div>
                <Link
                  to={item.linkUrl}
                  style={{
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#FF5722',
                    textDecoration: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{item.linkText}</span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ☕ DÀNH CHO ĐỐI TÁC QUÁN CAFE (PARTNER SECTION) */}
      <section id="partner-section" style={{ padding: '90px 24px', maxWidth: '1280px', margin: '0 auto' }}>
        <div
          style={{
            background: 'linear-gradient(135deg, #1A0E00 0%, #2E1500 100%)',
            borderRadius: '32px',
            padding: '60px',
            color: '#FFFFFF',
            display: 'grid',
            gridTemplateColumns: '1.2fr 0.8fr',
            gap: '50px',
            alignItems: 'center',
            boxShadow: '0 25px 50px -12px rgba(255, 87, 34, 0.25)',
          }}
          className="partner-grid"
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: 'rgba(255, 87, 34, 0.2)',
                border: '1px solid rgba(255, 87, 34, 0.4)',
                borderRadius: '9999px',
                color: '#FFA726',
                fontSize: '12px',
                fontWeight: '800',
                marginBottom: '20px',
              }}
            >
              <Store size={15} />
              <span>DÀNH CHO CHỦ QUÁN CAFE & CO-WORKING</span>
            </div>

            <h2 style={{ fontSize: '36px', fontWeight: '900', lineHeight: 1.2, marginBottom: '18px' }}>
              Tăng Trưởng Khách Hàng Sinh Viên Cùng UNI-MATE
            </h2>

            <p style={{ fontSize: '16px', color: '#D1D5DB', lineHeight: 1.6, marginBottom: '30px' }}>
              Bạn đang có những khung giờ vắng khách vào ban ngày? Trở thành đối tác của UNI-MATE để tiếp cận ngay hàng chục ngàn sinh viên năng động, phát hành voucher linh hoạt và quản lý lượt quét mã tiện lợi.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '36px' }}>
              {[
                'Lấp đầy chỗ ngồi vào các khung giờ thấp điểm',
                'Quét mã QR voucher tại quầy chỉ mất 3 giây',
                'Quản lý thực đơn và thông số chi nhánh tiện lợi',
                'Theo dõi báo cáo doanh thu & lượt khách chi tiết',
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#E5E7EB' }}>
                  <CheckCircle2 size={16} color="#FF5722" />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
              <Link
                to="/register"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 26px',
                  borderRadius: '14px',
                  backgroundColor: '#FF5722',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '15px',
                  textDecoration: 'none',
                  boxShadow: '0 8px 20px rgba(255, 87, 34, 0.4)',
                }}
              >
                <span>Đăng ký đối tác Quán Cafe</span>
                <ArrowRight size={16} />
              </Link>

              <Link
                to="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '14px 22px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#FFFFFF',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: '700',
                  fontSize: '15px',
                  textDecoration: 'none',
                }}
              >
                <LogIn size={16} />
                <span>Đăng nhập Cổng Đối tác</span>
              </Link>
            </div>
          </div>

          {/* Partner Preview Mockup */}
          <div
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '24px',
              padding: '28px',
              backdropFilter: 'blur(10px)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <img
                src="https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100"
                alt="Cafe"
                style={{ width: '56px', height: '56px', borderRadius: '14px', objectFit: 'cover' }}
              />
              <div>
                <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#FFFFFF' }}>The Coffee House</h4>
                <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>● Chi nhánh đang hoạt động</span>
              </div>
            </div>

            <div style={{ backgroundColor: 'rgba(0, 0, 0, 0.3)', borderRadius: '16px', padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '700' }}>
                Hôm nay đã tiếp đón
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#FFA726', marginTop: '4px' }}>
                48 lượt sinh viên
              </div>
              <div style={{ fontSize: '12px', color: '#D1D5DB' }}>Đã quét 32 voucher UniMate</div>
            </div>

            <div style={{ fontSize: '12px', color: '#9CA3AF', textAlign: 'center' }}>
              Được bảo chứng bởi hệ sinh thái khởi nghiệp sinh viên UNI-MATE
            </div>
          </div>
        </div>
      </section>

      {/* 💬 ĐÁNH GIÁ TỪ SINH VIÊN (TESTIMONIALS) */}
      <section style={{ backgroundColor: '#F8FAFC', padding: '90px 24px', borderTop: '1px solid #E2E8F0' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', textTransform: 'uppercase', color: '#FF5722', letterSpacing: '1px' }}>
              CẢM NHẬN THỰC TẾ
            </span>
            <h2 style={{ fontSize: '36px', fontWeight: '900', color: '#0F172A', marginTop: '8px' }}>
              Cộng Đồng Sinh Viên Nói Gì?
            </h2>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '26px',
            }}
            className="testimonials-grid"
          >
            {[
              {
                name: 'Trần Minh Thư',
                school: 'ĐH Kinh Tế TP.HCM (UEH)',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100',
                review: 'Nhờ UNI-MATE mà mình đã tìm được bạn học nhóm môn Kinh tế vi mô. Ứng dụng lọc quán cafe có ổ cắm điện rất chuẩn xác, không còn sợ laptop hết pin giữa chừng!',
              },
              {
                name: 'Lê Hoàng Nam',
                school: 'ĐH Bách Khoa TP.HCM (HCMUT)',
                avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100',
                review: 'Tính năng ghép đôi theo chuyên ngành rất xịn. Mình tìm được bạn cùng cày đồ án môn Mạng máy tính ở quán cafe đối diện trường, vừa có bạn học cùng vừa được giảm 30% trà đào.',
              },
              {
                name: 'Nguyễn Thảo My',
                school: 'ĐH FPT TP.HCM',
                avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100',
                review: 'Uni-Card giúp mình hoàn toàn yên tâm vì ai tham gia cũng được xác minh MSSV chính chủ. Đổi voucher bằng UniCoin siêu tiện, quét mã cái là xong ngay tại quầy!',
              },
            ].map((t, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '30px',
                  border: '1px solid #E2E8F0',
                  boxShadow: '0 4px 16px rgba(0, 0, 0, 0.03)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', gap: '3px', marginBottom: '14px' }}>
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={16} fill="#F59E0B" color="#F59E0B" />
                  ))}
                </div>
                <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.6, marginBottom: '20px', fontStyle: 'italic' }}>
                  "{t.review}"
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <img src={t.avatar} alt={t.name} style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover' }} />
                  <div>
                    <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#0F172A' }}>{t.name}</h5>
                    <span style={{ fontSize: '12px', color: '#64748B' }}>{t.school}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 📣 BIG CALL TO ACTION BANNER */}
      <section style={{ padding: '80px 24px', backgroundColor: '#FFFFFF' }}>
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
            borderRadius: '32px',
            padding: '60px 40px',
            textAlign: 'center',
            color: '#FFFFFF',
            boxShadow: '0 20px 40px rgba(255, 87, 34, 0.35)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <h2 style={{ fontSize: '40px', fontWeight: '900', letterSpacing: '-1px', marginBottom: '16px' }}>
            Sẵn Sàng Nâng Cấp Trải Nghiệm Học Tập Cùng UNI-MATE?
          </h2>
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.92)', maxWidth: '680px', margin: '0 auto 36px', lineHeight: 1.6 }}>
            Tham gia cộng đồng hàng chục ngàn sinh viên TP.HCM ngay hôm nay. Tạo tài khoản Uni-Card miễn phí và nhận ngay ưu đãi đồ uống đầu tiên!
          </p>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <Link
              to="/register"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 36px',
                borderRadius: '16px',
                backgroundColor: '#FFFFFF',
                color: '#FF5722',
                fontWeight: '900',
                fontSize: '16px',
                textDecoration: 'none',
                boxShadow: '0 8px 25px rgba(0, 0, 0, 0.15)',
              }}
            >
              <span>Đăng Ký Tài Khoản Mới</span>
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/login"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '16px 32px',
                borderRadius: '16px',
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
                color: '#FFFFFF',
                border: '1.5px solid rgba(255, 255, 255, 0.4)',
                fontWeight: '800',
                fontSize: '16px',
                textDecoration: 'none',
              }}
            >
              <LogIn size={18} />
              <span>Đăng Nhập Ngay</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ⚓ FOOTER */}
      <footer style={{ backgroundColor: '#0F172A', color: '#94A3B8', padding: '70px 24px 30px' }}>
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1.4fr 1fr 1fr 1fr',
            gap: '50px',
            marginBottom: '50px',
          }}
          className="footer-grid"
        >
          {/* Brand Col */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <img src={logoIcon} alt="UNI-MATE" style={{ width: '70%', height: '70%', objectFit: 'contain' }} />
              </div>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '-0.5px' }}>
                UNI<span style={{ color: '#FF5722' }}>-MATE</span>
              </span>
            </div>
            <p style={{ fontSize: '14px', lineHeight: 1.6, color: '#94A3B8', marginBottom: '20px' }}>
              Mạng xã hội kết nối sinh viên & chuỗi quán cafe học tập hàng đầu. Đồ án khởi nghiệp công nghệ sinh viên EXE201.
            </p>
            <div style={{ fontSize: '13px', color: '#64748B' }}>
              Khu Công Nghệ Cao, TP. Thủ Đức, TP. Hồ Chí Minh
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
              Khám Phá
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li><a href="#features" style={{ color: '#94A3B8', textDecoration: 'none' }}>Tính năng nền tảng</a></li>
              <li><a href="#study-match" style={{ color: '#94A3B8', textDecoration: 'none' }}>Ghép đôi bạn học</a></li>
              <li><a href="#cafes" style={{ color: '#94A3B8', textDecoration: 'none' }}>Bản đồ quán cafe</a></li>
              <li><a href="#vouchers" style={{ color: '#94A3B8', textDecoration: 'none' }}>Ví Voucher sinh viên</a></li>
            </ul>
          </div>

          {/* Access Portals */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
              Cổng Truy Cập
            </h5>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '14px' }}>
              <li>
                <Link to="/login" style={{ color: '#FF5722', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <LogIn size={14} />
                  <span>Đăng nhập hệ thống</span>
                </Link>
              </li>
              <li>
                <Link to="/register" style={{ color: '#FFA726', fontWeight: '700', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <UserPlus size={14} />
                  <span>Đăng ký sinh viên</span>
                </Link>
              </li>
              <li>
                <Link to="/register" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                  Đăng ký Quán Cafe đối tác
                </Link>
              </li>
              <li>
                <Link to="/login" style={{ color: '#94A3B8', textDecoration: 'none' }}>
                  Cổng Quản trị viên (Admin)
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div>
            <h5 style={{ fontSize: '14px', fontWeight: '800', color: '#FFFFFF', textTransform: 'uppercase', marginBottom: '16px', letterSpacing: '0.5px' }}>
              Hỗ Trợ & Liên Hệ
            </h5>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6, marginBottom: '10px' }}>
              Email: <strong style={{ color: '#FFFFFF' }}>support@unimate.vn</strong>
            </p>
            <p style={{ fontSize: '14px', color: '#94A3B8', lineHeight: 1.6 }}>
              Hotline: <strong style={{ color: '#FFFFFF' }}>1900 8888 (8:00 - 22:00)</strong>
            </p>
          </div>
        </div>

        {/* Copyright */}
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            borderTop: '1px solid #1E293B',
            paddingTop: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748B',
          }}
        >
          <div>© {new Date().getFullYear()} UNI-MATE. All rights reserved. EXE201 Startup Project.</div>
          <div style={{ display: 'flex', gap: '20px' }}>
            <span>Điều khoản sử dụng</span>
            <span>Chính sách bảo mật</span>
            <span>Quy chuẩn cộng đồng</span>
          </div>
        </div>
      </footer>

      {/* Embedded CSS for responsive styles */}
      <style>{`
        .nav-item:hover {
          color: #FF5722 !important;
        }
        @media (max-width: 992px) {
          .home-desktop-nav {
            display: none !important;
          }
          .hero-grid {
            grid-templateColumns: 1fr !important;
            gap: 40px !important;
          }
          .stats-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 20px !important;
          }
          .features-grid {
            grid-template-columns: 1fr !important;
          }
          .steps-grid {
            grid-template-columns: 1fr !important;
          }
          .partner-grid {
            grid-template-columns: 1fr !important;
          }
          .testimonials-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
        @media (max-width: 600px) {
          .stats-grid {
            grid-template-columns: 1fr !important;
          }
          .footer-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
      {/* 🛡️ PRIVACY & DATA PROTECTION DETAIL MODAL */}
      {privacyModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 999,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
          onClick={() => setPrivacyModalOpen(false)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              border: '1px solid #E2E8F0',
              padding: '36px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', borderBottom: '1px solid #F1F5F9', paddingBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '12px',
                    backgroundColor: '#ECFDF5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A' }}>
                    Chính Sách Bảo Mật & Bảo Vệ Dữ Liệu
                  </h3>
                  <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>
                    Tuân thủ Nghị định 13/2023/NĐ-CP của Chính Phủ
                  </span>
                </div>
              </div>

              <button
                onClick={() => setPrivacyModalOpen(false)}
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#64748B',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', fontSize: '14px', color: '#475569', lineHeight: 1.6 }}>
              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  1. Mục đích thu thập & Phạm vi sử dụng
                </h4>
                <p>
                  UNI-MATE chỉ thu thập các thông tin tối thiểu cần thiết để vận hành tính năng ghép đôi bạn học và kích hoạt ví voucher ưu đãi cafe: Họ tên, trường Đại học, chuyên ngành và mã số sinh viên (MSSV) để xác thực người dùng thật.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  2. Tiêu chuẩn bảo mật & Mã hóa dữ liệu
                </h4>
                <p>
                  Mọi dữ liệu trao đổi giữa ứng dụng và máy chủ đều được mã hóa bằng giao thức SSL/TLS và chuẩn mã hóa cấp cao AES-256. Hình ảnh thẻ sinh viên chỉ được quét tự động bởi hệ thống để xác minh 1 lần, tuyệt đối không lưu trữ ảnh thô trên cơ sở dữ liệu công khai.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  3. Cam kết KHÔNG bán dữ liệu cho bên thứ ba
                </h4>
                <p>
                  Chúng tôi cam kết 100% không mua bán, trao đổi hoặc chia sẻ dữ liệu hành vi, số điện thoại hay thông tin cá nhân của bạn cho bất kỳ đơn vị quảng cáo hay đối tác tiếp thị bên ngoài nào.
                </p>
              </div>

              <div>
                <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#0F172A', marginBottom: '6px' }}>
                  4. Quyền tự chủ dữ liệu của sinh viên
                </h4>
                <p>
                  Bạn có toàn quyền lựa chọn thông tin hiển thị trên Uni-Card, chuyển sang chế độ ẩn danh (Ghost Mode) bất cứ lúc nào hoặc yêu cầu xóa vĩnh viễn toàn bộ tài khoản và dữ liệu liên quan khỏi hệ thống bằng cách gửi email về bộ phận bảo vệ dữ liệu.
                </p>
              </div>

              <div style={{ backgroundColor: '#F8FAFC', padding: '16px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#0F172A', display: 'block', marginBottom: '4px' }}>
                  Bộ phận Phụ trách Bảo vệ Dữ liệu Cá nhân (DPO - UNI-MATE):
                </span>
                <div style={{ fontSize: '13px', color: '#64748B' }}>
                  Email tiếp nhận: <strong style={{ color: '#0F172A' }}>privacy@unimate.vn</strong> | Hotline: <strong style={{ color: '#0F172A' }}>1900 8888</strong>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setPrivacyModalOpen(false)}
                style={{
                  padding: '10px 24px',
                  borderRadius: '12px',
                  backgroundColor: '#059669',
                  color: '#FFFFFF',
                  fontWeight: '800',
                  fontSize: '14px',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Tôi đã hiểu & Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
