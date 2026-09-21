import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Compass,
  Coffee,
  Ticket,
  MessageCircle,
  User,
  LogOut,
  Coins,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export default function UserLayout() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/user/discover', label: 'Khám phá Bạn học & Cafe', icon: Compass },
    { to: '/user/venues', label: 'Quán Cafe & Không gian học', icon: Coffee },
    { to: '/user/vouchers', label: 'Ví Voucher của tôi', icon: Ticket, badge: '4' },
    { to: '/user/messages', label: 'Tin nhắn & Kết nối', icon: MessageCircle, badge: '2', alert: true },
    { to: '/user/profile', label: 'Hồ sơ Sinh viên (Uni-Card)', icon: User },
  ];

  return (
    <div className="portal-layout" style={{ minHeight: '100vh', display: 'flex', backgroundColor: '#F8FAFC' }}>
      {/* Sidebar */}
      <aside
        style={{
          width: '270px',
          backgroundColor: '#1A0E00', // Deep orange-black matching mobile dark bg
          color: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          borderRight: '1px solid #3D1A00',
        }}
      >
        {/* Brand Header */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #115E59' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '12px',
                backgroundColor: '#FF5722',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontWeight: '900',
                fontSize: '20px',
                boxShadow: '0 4px 12px rgba(255, 87, 34, 0.45)',
              }}
            >
              U
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#FFFFFF', letterSpacing: '0.5px' }}>
                  UNI-MATE
                </span>
                <span
                  style={{
                    fontSize: '9px',
                    fontWeight: '800',
                    backgroundColor: '#14B8A6',
                    color: '#042F2E',
                    padding: '2px 6px',
                    borderRadius: '4px',
                  }}
                >
                  STUDENT
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#99F6E4', fontWeight: '600' }}>
                Mạng xã hội Sinh viên & Cafe
              </span>
            </div>
          </div>
        </div>

        {/* Student Mini ID Card */}
        <div style={{ padding: '16px 14px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(20, 184, 166, 0.12)',
              borderRadius: '12px',
              border: '1px solid rgba(45, 212, 191, 0.25)',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div style={{ position: 'relative' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt="Avatar"
                style={{ width: '42px', height: '42px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF8A50' }}
              />
              <span
                title="Đã xác thực thẻ SV"
                style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  backgroundColor: '#10B981',
                  color: '#fff',
                  borderRadius: '50%',
                  padding: '2px',
                  display: 'flex',
                }}
              >
                <CheckCircle2 size={12} />
              </span>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#FFFFFF', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.name || 'Nguyễn Văn Toàn'}
              </div>
              <div style={{ fontSize: '11px', color: '#FFB74D', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>{user?.studentId || 'SE181848'}</span>
                <span>•</span>
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.university?.split(' ')[0] || 'FPTU'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ padding: '4px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ padding: '6px 12px', fontSize: '11px', fontWeight: '700', color: '#FF8A50', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Menu Sinh viên
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.to);
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '11px 14px',
                  borderRadius: '10px',
                  fontSize: '13.5px',
                  fontWeight: '600',
                  color: isActive ? '#FFFFFF' : '#FFD0A8',
                  backgroundColor: isActive ? '#FF5722' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} color={isActive ? '#FFFFFF' : '#FF8A50'} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 7px',
                      borderRadius: '10px',
                      backgroundColor: isActive ? '#BF360C' : (item.alert ? '#EF4444' : '#3D1A00'),
                      color: '#FFFFFF',
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Role Switcher in Sidebar */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #3D1A00', backgroundColor: 'rgba(0,0,0,0.15)' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#FF8A50', marginBottom: '8px', textTransform: 'uppercase' }}>
            Chuyển nhanh Cổng (Role)
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <button
              onClick={() => {
                switchRole('partner');
                navigate('/partner/dashboard');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 87, 34, 0.15)',
                color: '#FF8A65',
                border: '1px solid rgba(255, 87, 34, 0.3)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Coffee size={14} />
                <span>Cổng Quán Cafe (Partner)</span>
              </div>
              <ExternalLink size={12} />
            </button>

            <button
              onClick={() => {
                switchRole('admin');
                navigate('/admin/dashboard');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(79, 70, 229, 0.15)',
                color: '#A5B4FC',
                border: '1px solid rgba(79, 70, 229, 0.3)',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ShieldCheck size={14} />
                <span>Cổng Quản trị (Admin)</span>
              </div>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        {/* User Footer / Logout */}
        <div style={{ padding: '14px 16px', borderTop: '1px solid #3D1A00', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10B981' }} />
            <span style={{ fontSize: '12px', color: '#FFB74D', fontWeight: '600' }}>Trực tuyến</span>
          </div>
          <button
            onClick={handleLogout}
            title="Đăng xuất"
            style={{
              color: '#FFB74D',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '12px',
              fontWeight: '600',
              padding: '6px 10px',
              borderRadius: '6px',
              backgroundColor: '#3D1A00',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>Thoát</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Topbar */}
        <header
          style={{
            height: '68px',
            backgroundColor: '#FFFFFF',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}
        >
          {/* Left: University selector & verification */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 14px',
                backgroundColor: '#F0FDFA',
                borderRadius: '20px',
                border: '1px solid #99F6E4',
                color: '#0F766E',
                fontSize: '13px',
                fontWeight: '700',
              }}
            >
              <Sparkles size={14} color="#FF5722" />
              <span>{user?.university || 'Đại học FPT TP.HCM'}</span>
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '600',
                color: '#E64A19',
                backgroundColor: '#ECFDF5',
                padding: '5px 12px',
                borderRadius: '16px',
              }}
            >
              <CheckCircle2 size={13} color="#FF5722" />
              <span>Sinh viên đã xác minh</span>
            </div>
          </div>

          {/* Right: UniCoin, Role Switch Dropdown, Avatar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* UniCoin Wallet Badge */}
            <div
              onClick={() => navigate('/user/vouchers')}
              title="Nhấn để đổi quà với UniCoin"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 14px',
                borderRadius: '20px',
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FDE68A',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Coins size={16} color="#D97706" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#B45309' }}>
                {user?.uniCoin || 450} UniCoin
              </span>
            </div>

            {/* Quick Role Switcher Pill */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setRoleMenuOpen(!roleMenuOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '7px 12px',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '10px',
                  border: '1px solid var(--border-color)',
                  fontSize: '12px',
                  fontWeight: '700',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ color: '#FF5722' }}>Vai trò:</span>
                <span>🎓 Sinh viên</span>
                <ChevronDown size={14} />
              </button>

              {roleMenuOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: '6px',
                    width: '210px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    border: '1px solid var(--border-color)',
                    padding: '6px',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '6px 10px', fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    CHUYỂN GIAO DIỆN
                  </div>
                  <button
                    onClick={() => {
                      switchRole('partner');
                      setRoleMenuOpen(false);
                      navigate('/partner/dashboard');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <Coffee size={16} color="var(--primary)" />
                    <span>Cổng Quán Cafe</span>
                  </button>

                  <button
                    onClick={() => {
                      switchRole('admin');
                      setRoleMenuOpen(false);
                      navigate('/admin/dashboard');
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: 'var(--text-primary)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <ShieldCheck size={16} color="var(--indigo)" />
                    <span>Cổng Quản trị viên</span>
                  </button>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <NavLink to="/user/profile" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt="Avatar"
                style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #FF5722' }}
              />
            </NavLink>
          </div>
        </header>

        {/* Page Content Outlet */}
        <main style={{ flex: 1, padding: '28px', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
