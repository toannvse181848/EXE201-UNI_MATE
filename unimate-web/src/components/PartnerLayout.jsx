import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  Ticket,
  QrCode,
  FileCheck,
  Headphones,
  LogOut,
  Plus,
  ShieldCheck,
} from 'lucide-react';

export default function PartnerLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/partner/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/partner/venues', label: 'Quản lý Địa điểm', icon: Store },
    { to: '/partner/vouchers', label: 'Quản lý Voucher', icon: Ticket },
    { to: '/partner/qr-scanner', label: 'Quét QR Scanner', icon: QrCode },
    { to: '/partner/pending-review', label: 'Hồ sơ chờ duyệt', icon: FileCheck },
  ];

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="portal-sidebar">
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #1E293B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '900',
                fontSize: '18px',
              }}
            >
              U
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>
                  UNI-MATE
                </span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: '600', textTransform: 'uppercase' }}>
                Partner Portal
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ padding: '16px 12px', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isActive ? '#fff' : '#94A3B8',
                  backgroundColor: isActive ? 'var(--primary)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} color={isActive ? '#fff' : '#94A3B8'} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Switch Portal button */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #1E293B' }}>
          <button
            onClick={() => navigate('/admin/dashboard')}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '8px 12px',
              borderRadius: '8px',
              backgroundColor: '#1E293B',
              color: '#38BDF8',
              fontSize: '12px',
              fontWeight: '700',
            }}
          >
            <ShieldCheck size={15} />
            <span>Mở Admin Portal</span>
          </button>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px', borderTop: '1px solid #1E293B', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <a
            href="#support"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              color: '#94A3B8',
              fontSize: '13px',
              fontWeight: '500',
            }}
          >
            <Headphones size={16} />
            <span>Support Center</span>
          </a>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              color: '#EF4444',
              fontSize: '13px',
              fontWeight: '600',
              textAlign: 'left',
            }}
          >
            <LogOut size={16} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="portal-main">
        {/* Header */}
        <header className="portal-header">
          {/* Breadcrumb */}
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            <span style={{ color: 'var(--text-muted)' }}>Home</span> &gt;{' '}
            <span style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
              {location.pathname.split('/')[2]?.replace('-', ' ').toUpperCase() || 'DASHBOARD'}
            </span>
          </div>

          {/* Quick Header CTAs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <button
              onClick={() => navigate('/partner/qr-scanner')}
              className="btn btn-secondary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <QrCode size={16} color="var(--primary)" />
              <span>Quét QR voucher</span>
            </button>
            <button
              onClick={() => navigate('/partner/vouchers')}
              className="btn btn-primary"
              style={{ padding: '8px 16px', fontSize: '13px' }}
            >
              <Plus size={16} />
              <span>Tạo voucher mới</span>
            </button>

            {/* Profile Avatar */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: '10px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=100'}
                alt={user?.name}
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {user?.name || 'The Coffee House'}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Đối tác chính thức
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
