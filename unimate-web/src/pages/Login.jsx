import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Coffee, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('partner'); // 'partner' | 'admin'
  const [email, setEmail] = useState('partner@thecoffeehouse.vn');
  const [password, setPassword] = useState('123456');
  const [loading, setLoading] = useState(false);

  const handleRoleChange = (newRole) => {
    setRole(newRole);
    if (newRole === 'partner') {
      setEmail('partner@thecoffeehouse.vn');
    } else {
      setEmail('admin@unimate.vn');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, role);
      if (role === 'partner') {
        navigate('/partner/dashboard');
      } else {
        navigate('/admin/dashboard');
      }
    } catch (err) {
      alert('Đăng nhập thất bại: ' + err.message);
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
        backgroundColor: '#F1F5F9',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          border: '1px solid var(--border-color)',
        }}
      >
        {/* Brand Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '16px',
              backgroundColor: role === 'partner' ? 'var(--primary)' : 'var(--indigo)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              boxShadow: role === 'partner' ? '0 10px 15px -3px rgba(255, 87, 34, 0.3)' : '0 10px 15px -3px rgba(79, 70, 229, 0.3)',
              marginBottom: '16px',
              transition: 'all 0.3s ease',
            }}
          >
            {role === 'partner' ? <Coffee size={28} /> : <ShieldCheck size={28} />}
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            UNI-MATE PORTAL
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Cổng quản lý dành cho Đối tác & Quản trị viên
          </p>
        </div>

        {/* Role Selector Tabs */}
        <div
          style={{
            display: 'flex',
            backgroundColor: 'var(--bg-page)',
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '24px',
            border: '1px solid var(--border-color)',
          }}
        >
          <button
            type="button"
            onClick={() => handleRoleChange('partner')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              backgroundColor: role === 'partner' ? '#FFFFFF' : 'transparent',
              color: role === 'partner' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: role === 'partner' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <Coffee size={16} />
            <span>Đối tác Quán Cafe</span>
          </button>

          <button
            type="button"
            onClick={() => handleRoleChange('admin')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '700',
              backgroundColor: role === 'admin' ? '#FFFFFF' : 'transparent',
              color: role === 'admin' ? 'var(--indigo)' : 'var(--text-secondary)',
              boxShadow: role === 'admin' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <ShieldCheck size={16} />
            <span>Quản trị viên (Admin)</span>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
              Email đăng nhập
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 14px',
                backgroundColor: '#FFFFFF',
              }}
            >
              <Mail size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="partner@thecoffeehouse.vn"
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
              <a href="#forgot" style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: '600' }}>
                Quên mật khẩu?
              </a>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                border: '1.5px solid var(--border-color)',
                borderRadius: '12px',
                padding: '10px 14px',
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
            className={`btn ${role === 'partner' ? 'btn-primary' : 'btn-indigo'}`}
            style={{ width: '100%', padding: '13px', fontSize: '15px', marginTop: '8px' }}
          >
            <span>{loading ? 'Đang xác thực...' : 'Đăng nhập vào Portal'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        {/* Demo fast-login pills */}
        <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid var(--border-light)', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: '600' }}>
            ⚡ Tài khoản Demo 1-Click:
          </p>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => {
                handleRoleChange('partner');
                login('partner@thecoffeehouse.vn', '123456', 'partner').then(() => navigate('/partner/dashboard'));
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
              }}
            >
              Coffee House Partner
            </button>
            <button
              type="button"
              onClick={() => {
                handleRoleChange('admin');
                login('admin@unimate.vn', '123456', 'admin').then(() => navigate('/admin/dashboard'));
              }}
              style={{
                padding: '6px 12px',
                fontSize: '12px',
                fontWeight: '700',
                borderRadius: '8px',
                backgroundColor: 'var(--indigo-light)',
                color: 'var(--indigo)',
              }}
            >
              Super Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
