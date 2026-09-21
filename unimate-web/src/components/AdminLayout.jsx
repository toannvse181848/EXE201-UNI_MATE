import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Store,
  Ticket,
  AlertTriangle,
  Search,
  Bell,
  LogOut,
  Coffee,
  GraduationCap,
} from 'lucide-react';

export default function AdminLayout() {
  const { user, logout, switchRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Tổng quan Admin', icon: LayoutDashboard },
    { to: '/admin/venues', label: 'Quản lý Địa điểm', icon: Store, count: 187 },
    { to: '/admin/vouchers', label: 'Quản lý Voucher', icon: Ticket, count: 45 },
    { to: '/admin/reports', label: 'Hàng đợi Report', icon: AlertTriangle, count: 3, alert: true },
  ];

  return (
    <div className="portal-layout">
      {/* Sidebar */}
      <aside className="portal-sidebar" style={{ backgroundColor: '#1E1B4B' }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid #312E81' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                backgroundColor: 'var(--indigo)',
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
              <span style={{ fontSize: '11px', color: '#A5B4FC', fontWeight: '700', textTransform: 'uppercase' }}>
                Management Portal
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

        {/* Switch Portal buttons */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #312E81', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#A5B4FC', textTransform: 'uppercase', marginBottom: '2px' }}>
            Chuyển nhanh vai trò
          </div>
          <button
            onClick={() => {
              switchRole('user');
              navigate('/user/discover');
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(13, 148, 136, 0.2)',
              border: '1px solid #14B8A6',
              color: '#2DD4BF',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <GraduationCap size={15} />
            <span>Mở Cổng Sinh viên</span>
          </button>
          <button
            onClick={() => {
              switchRole('partner');
              navigate('/partner/dashboard');
            }}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '7px 12px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 87, 34, 0.15)',
              border: '1px solid var(--primary)',
              color: 'var(--primary)',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            <Coffee size={15} />
            <span>Mở Partner Portal</span>
          </button>
        </div>

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
          {/* Global Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '380px' }}>
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
              <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
              <input
                type="text"
                placeholder="Search across portal (quán, voucher, report)..."
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                border: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <Bell size={18} color="var(--text-secondary)" />
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: '#EF4444',
                }}
              />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingLeft: '16px', borderLeft: '1px solid var(--border-color)' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100'}
                alt="Admin"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
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
