import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import logoIcon from '../assets/logo-icon.png';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  Store,
  Ticket,
  AlertTriangle,
  Search,
  Bell,
  LogOut,
  Menu,
  X,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  const navItems = [
    { to: '/admin/dashboard', label: 'Tổng quan Admin', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Quản trị Người dùng', icon: Users },
    { to: '/admin/venues', label: 'Quản lý Địa điểm', icon: Store },
    { to: '/admin/vouchers', label: 'Quản lý Voucher', icon: Ticket },
    { to: '/admin/reports', label: 'Hàng đợi Report', icon: AlertTriangle },
  ];

  return (
    <div className="portal-layout">
      {/* Mobile Overlay */}
      <div
        className={`sidebar-overlay${sidebarOpen ? ' open' : ''}`}
        onClick={closeSidebar}
      />

      {/* Sidebar */}
      <aside className={`portal-sidebar${sidebarOpen ? ' open' : ''}`} style={{ backgroundColor: '#1E1B4B' }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #312E81', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontWeight: '900',
                fontSize: '18px',
              }}
            >
              <img src={logoIcon} alt="UNI-MATE" style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontSize: '18px', fontWeight: '900', color: '#fff', letterSpacing: '0.5px' }}>
                  UNI-MATE
                </span>
              </div>
              <span style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: '700', textTransform: 'uppercase' }}>
                Management Portal
              </span>
            </div>
          </div>
          {/* Close button on mobile */}
          <button
            onClick={closeSidebar}
            className="btn-mobile-menu"
            style={{ color: '#A5B4FC' }}
            aria-label="Đóng menu"
          >
            <X size={20} />
          </button>
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
                onClick={closeSidebar}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: isActive ? '#fff' : '#C7D2FE',
                  backgroundColor: isActive ? 'var(--indigo)' : 'transparent',
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Icon size={18} color={isActive ? '#fff' : '#A5B4FC'} />
                  <span>{item.label}</span>
                </div>
                {item.count && (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: '800',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      backgroundColor: item.alert ? '#EF4444' : 'rgba(255,255,255,0.15)',
                      color: '#fff',
                    }}
                  >
                    {item.count}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Logout */}
        <div style={{ padding: '16px', borderTop: '1px solid #312E81' }}>
          <button
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '8px 10px',
              color: '#F87171',
              fontSize: '13px',
              fontWeight: '600',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="portal-main">
        {/* Header */}
        <header className="portal-header">
          {/* Hamburger button for mobile */}
          <button
            className="btn-mobile-menu"
            onClick={() => setSidebarOpen(true)}
            aria-label="Mở menu"
            style={{ marginRight: '8px' }}
          >
            <Menu size={22} />
          </button>

          {/* Global Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, maxWidth: '380px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-page)',
                padding: '8px 14px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                width: '100%',
              }}
            >
              <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Search across portal..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: '13px',
                  width: '100%',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          {/* Right Header Items */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
            <button
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                flexShrink: 0,
              }}
              title="Thông báo hệ thống"
            >
              <Bell size={18} color="var(--text-secondary)" />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '12px', borderLeft: '1px solid var(--border-color)' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                alt="Admin"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }} className="hide-on-mobile">
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Super Admin
                </span>
                <span style={{ fontSize: '11px', color: 'var(--indigo)', fontWeight: '700' }}>
                  Platform Operator
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
