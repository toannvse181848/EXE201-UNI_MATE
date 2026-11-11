import React, { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { LogOut, Store } from 'lucide-react';
import logoIcon from '../assets/logo-icon.png';
import { useAuth } from '../context/AuthContext';

// Thu ngân chỉ có một màn: quét voucher tại chi nhánh được chủ quán gắn
export default function CashierLayout() {
  const { user, logout, reloadUser } = useAuth();
  const navigate = useNavigate();

  // Chủ quán có thể đã chuyển thu ngân sang chi nhánh khác: lấy lại tên chi nhánh mới nhất
  useEffect(() => {
    reloadUser();
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="portal-layout">
      <div className="portal-main">
        <header className="portal-header" style={{ gap: '12px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '10px', backgroundColor: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <img src={logoIcon} alt="UNI-MATE" style={{ width: '72%', height: '72%', objectFit: 'contain' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              <Store size={15} color="var(--primary)" style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user?.cashierVenue?.name || user?.businessName || 'Chi nhánh của quán'}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Thu ngân: {user?.name}
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="btn btn-ghost"
            style={{ padding: '8px 12px', fontSize: '13px', color: '#EF4444', flexShrink: 0 }}
          >
            <LogOut size={16} />
            <span>Đăng xuất</span>
          </button>
        </header>
        <main className="portal-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
