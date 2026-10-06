import React from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowRight, LogOut } from 'lucide-react';

export default function RoleRoute({ allowedRole, children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If role matches, allow rendering
  if (user.role === allowedRole) {
    return children;
  }

  // Role mismatch — show access denied UI
  const roleNames = {
    user: 'Sinh viên / Người dùng',
    partner: 'Đối tác Quán Cafe',
    admin: 'Quản trị viên (Admin)',
  };

  const portalHome = {
    user: '/user/discover',
    partner: '/partner/dashboard',
    admin: '/admin/dashboard',
  };

  const handleLogoutAndLogin = () => {
    logout();
    navigate('/login');
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: '24px',
      }}
    >
      <div
        style={{
          maxWidth: '480px',
          width: '100%',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08)',
          border: '1px solid var(--border-color)',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
          }}
        >
          <ShieldAlert size={32} />
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '8px' }}>
          Không có quyền truy cập
        </h2>

        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '24px' }}>
          Bạn đang đăng nhập với vai trò{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{roleNames[user.role] || user.role}</strong>.
          Trang này yêu cầu quyền{' '}
          <strong style={{ color: '#DC2626' }}>{roleNames[allowedRole]}</strong>.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => navigate(portalHome[user.role] || '/login')}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#FF5722',
              color: '#FFFFFF',
              fontWeight: '700',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <span>Quay về trang của tôi</span>
            <ArrowRight size={16} />
          </button>

          <button
            onClick={handleLogoutAndLogin}
            style={{
              padding: '12px 16px',
              borderRadius: '12px',
              backgroundColor: '#F1F5F9',
              color: '#DC2626',
              fontWeight: '700',
              fontSize: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            <LogOut size={16} />
            <span>Đăng xuất & Đăng nhập lại</span>
          </button>
        </div>
      </div>
    </div>
  );
}
