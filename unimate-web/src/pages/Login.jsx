import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Coffee, ShieldCheck, ArrowRight, Lock, Mail, Sparkles } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('user'); // 'user' | 'partner' | 'admin'
  const [email, setEmail] = useState('toan.nguyen@fpt.edu.vn');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const roleConfigs = {
    user: {
      title: 'Sinh viên & Người dùng',
      desc: 'Dành cho sinh viên kết nối bạn học, khám phá quán cafe & đổi voucher',
      email: 'toan.nguyen@fpt.edu.vn',
      color: '#FF5722',
      bgLight: '#FBE9E7',
      icon: GraduationCap,
      path: '/user/discover',
      btnClass: 'btn-orange',
      badge: 'Student Portal',
    },
    partner: {
      title: 'Đối tác Quán Cafe',
      desc: 'Dành cho chủ quán quản lý chi nhánh, phát hành voucher & quét mã QR',
      email: 'partner@thecoffeehouse.vn',
      color: '#FF5722',
      bgLight: '#FFECE6',
      icon: Coffee,
      path: '/partner/dashboard',
      btnClass: 'btn-primary',
      badge: 'Partner Portal',
    },
    admin: {
      title: 'Quản trị viên (Admin)',
      desc: 'Dành cho ban quản trị duyệt địa điểm, kiểm duyệt voucher & xử lý báo cáo',
      email: 'admin@unimate.vn',
      color: '#4F46E5',
      bgLight: '#EEF2FF',
      icon: ShieldCheck,
      path: '/admin/dashboard',
      btnClass: 'btn-indigo',
      badge: 'Admin Portal',
    },
  };

  const currentConfig = roleConfigs[role];

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    setEmail(roleConfigs[newRole].email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
      navigate(currentConfig.path);
    } catch (err) {
      alert('Đăng nhập thất bại: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickRole) => {
    setRole(quickRole);
    setLoading(true);
    try {
      await login(roleConfigs[quickRole].email, '123456', quickRole);
      navigate(roleConfigs[quickRole].path);
    } finally {
      setLoading(false);
    }
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
        backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '520px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 30px -10px rgba(0, 0, 0, 0.08), 0 8px 12px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Brand Logo & Role Badge */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '18px',
              backgroundColor: currentConfig.color,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: `0 10px 20px -5px ${currentConfig.color}66`,
              marginBottom: '14px',
              transition: 'all 0.3s ease',
            }}
          >
            {React.createElement(currentConfig.icon, { size: 30 })}
          </div>

          <div style={{ display: 'inline-block', marginBottom: '6px' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.8px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: currentConfig.bgLight,
                color: currentConfig.color,
              }}
            >
              {currentConfig.badge}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            UNI-MATE PLATFORM
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            {currentConfig.desc}
          </p>
        </div>

        {/* 3 Role Selection Tabs */}
        <div style={{ marginBottom: '24px' }}>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: '800', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Chọn vai trò đăng nhập
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              backgroundColor: '#F1F5F9',
              borderRadius: '14px',
              padding: '4px',
              gap: '4px',
              border: '1px solid var(--border-color)',
            }}
          >
            {/* Tab 1: User / Student */}
            <button
              type="button"
              onClick={() => handleRoleChange('user')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 6px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: role === 'user' ? '#FFFFFF' : 'transparent',
                color: role === 'user' ? '#0D9488' : 'var(--text-secondary)',
                boxShadow: role === 'user' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <GraduationCap size={18} />
              <span>Sinh viên</span>
            </button>

            {/* Tab 2: Partner */}
            <button
              type="button"
              onClick={() => handleRoleChange('partner')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 6px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: role === 'partner' ? '#FFFFFF' : 'transparent',
                color: role === 'partner' ? 'var(--primary)' : 'var(--text-secondary)',
                boxShadow: role === 'partner' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <Coffee size={18} />
              <span>Đối tác Quán</span>
            </button>

            {/* Tab 3: Admin */}
            <button
              type="button"
              onClick={() => handleRoleChange('admin')}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px',
                padding: '10px 6px',
                borderRadius: '10px',
                fontSize: '12px',
                fontWeight: '700',
                backgroundColor: role === 'admin' ? '#FFFFFF' : 'transparent',
                color: role === 'admin' ? 'var(--indigo)' : 'var(--text-secondary)',
                boxShadow: role === 'admin' ? '0 2px 6px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.2s ease',
              }}
            >
              <ShieldCheck size={18} />
              <span>Quản trị viên</span>
            </button>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Email tài khoản
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                padding: '11px 14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Mail size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={currentConfig.email}
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                Mật khẩu
              </label>
              <span style={{ fontSize: '12px', color: currentConfig.color, fontWeight: '600', cursor: 'pointer' }}>
                Quên mật khẩu?
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                padding: '11px 14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Lock size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  border: 'none',
                  outline: 'none',
                  width: '100%',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '13px',
              fontSize: '15px',
              fontWeight: '700',
              color: '#FFFFFF',
              backgroundColor: currentConfig.color,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: `0 8px 16px -4px ${currentConfig.color}66`,
              marginTop: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{loading ? 'Đang xác thực...' : `Đăng nhập ${currentConfig.title}`}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* 1-Click Fast Login for Demo */}
        <div style={{ marginTop: '26px', paddingTop: '20px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '12px' }}>
            <Sparkles size={14} color="#F59E0B" />
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '700' }}>
              Đăng nhập nhanh 1-Click theo Role:
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            <button
              type="button"
              onClick={() => handleQuickLogin('user')}
              style={{
                padding: '8px 6px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: '#FBE9E7',
                color: '#E64A19',
                border: '1px solid #FFCCBC',
                transition: 'all 0.2s',
              }}
            >
              🎓 Sinh viên
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('partner')}
              style={{
                padding: '8px 6px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                border: '1px solid #FFCCBC',
                transition: 'all 0.2s',
              }}
            >
              ☕ Đối tác Quán
            </button>

            <button
              type="button"
              onClick={() => handleQuickLogin('admin')}
              style={{
                padding: '8px 6px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: 'var(--indigo-light)',
                color: 'var(--indigo)',
                border: '1px solid #C7D2FE',
                transition: 'all 0.2s',
              }}
            >
              🛡️ Super Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
