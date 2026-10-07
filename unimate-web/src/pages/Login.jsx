import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import cover from '../assets/cover.png';
import { useAuth } from '../context/AuthContext';
import { GraduationCap, Coffee, ShieldCheck, ArrowRight, ArrowLeft, Lock, Mail, UserPlus, X, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { authApi } from '../services/api';


export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [role, setRole] = useState('user'); // 'user' | 'partner' | 'admin'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // === Forgot Password Modal State ===
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotStatus, setForgotStatus] = useState(null); // null | 'success' | 'error'
  const [forgotMessage, setForgotMessage] = useState('');


  const roleConfigs = {
    user: {
      title: 'Sinh viên & Người dùng',
      desc: 'Dành cho sinh viên kết nối bạn học, khám phá quán cafe & đổi voucher',
      email: '',
      placeholder: 'vd: ho.ten@fpt.edu.vn',
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
      email: '',
      placeholder: 'vd: partner@quancafe.vn',
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
      email: '',
      placeholder: 'vd: admin@unimate.vn',
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
    setEmail('');
    setPassword('');
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

  const handleOpenForgotModal = () => {
    setForgotEmail('');
    setForgotStatus(null);
    setForgotMessage('');
    setShowForgotModal(true);
  };

  const handleCloseForgotModal = () => {
    setShowForgotModal(false);
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!forgotEmail) return;
    setForgotLoading(true);
    setForgotStatus(null);
    try {
      const res = await authApi.forgotPassword(forgotEmail);
      setForgotStatus('success');
      setForgotMessage(res.message || 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.');
    } catch (err) {
      setForgotStatus('error');
      setForgotMessage(err.message || 'Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setForgotLoading(false);
    }
  };




  return (
    <>
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8FAFC',
        padding: '24px',
        backgroundImage: 'radial-gradient(#E2E8F0 1px, transparent 1px)',
        backgroundSize: '24px 24px',
      }}
    >
      {/* Back to Home Button (Clean, prominent, perfectly clickable) */}
      <div style={{ width: '100%', maxWidth: '520px', marginBottom: '14px', display: 'flex', justifyContent: 'flex-start' }}>
        <button
          type="button"
          onClick={() => navigate('/')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            border: '1.5px solid #E2E8F0',
            color: '#334155',
            fontSize: '14px',
            fontWeight: '700',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#FF5722';
            e.currentTarget.style.borderColor = '#FF5722';
            e.currentTarget.style.backgroundColor = '#FFF7ED';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#334155';
            e.currentTarget.style.borderColor = '#E2E8F0';
            e.currentTarget.style.backgroundColor = '#FFFFFF';
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay về Trang chủ UNI-MATE</span>
        </button>
      </div>

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
          <img
            src={cover}
            alt="UniMate - Học hết mình, chơi hết phố"
            style={{
              display: 'block',
              width: 'calc(100% + 80px)',
              margin: '-40px -40px 20px',
              borderRadius: '24px 24px 0 0',
              borderBottom: '1px solid var(--border-color)',
            }}
          />

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

        {/* Auth Mode Toggle: Login vs Register */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '4px',
            padding: '4px',
            backgroundColor: '#F1F5F9',
            borderRadius: '12px',
            marginBottom: '20px',
          }}
        >
          <div
            style={{
              padding: '8px',
              textAlign: 'center',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: '800',
              backgroundColor: '#FFFFFF',
              color: 'var(--text-primary)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)',
            }}
          >
            Đăng nhập
          </div>
          <Link
            to="/register"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '8px',
              textAlign: 'center',
              borderRadius: '9px',
              fontSize: '13px',
              fontWeight: '700',
              color: 'var(--text-secondary)',
              textDecoration: 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <UserPlus size={15} color="#FF5722" />
            <span>Đăng ký mới</span>
          </Link>
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
                placeholder={currentConfig.placeholder}
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
              <span
                id="forgot-password-btn"
                onClick={handleOpenForgotModal}
                style={{ fontSize: '12px', color: currentConfig.color, fontWeight: '600', cursor: 'pointer' }}
              >
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

        {/* Register Link Prompt */}
        <div style={{ marginTop: '16px', textAlign: 'center', fontSize: '14px', color: 'var(--text-secondary)' }}>
          Chưa có tài khoản?{' '}
          <Link
            to="/register"
            style={{
              color: currentConfig.color,
              fontWeight: '700',
              textDecoration: 'none',
            }}
          >
            Đăng ký tài khoản mới ngay
          </Link>
        </div>


      </div>
    </div>

      {/* ===== FORGOT PASSWORD MODAL ===== */}
      {showForgotModal && (
        <div
          onClick={handleCloseForgotModal}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.45)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '440px',
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '36px',
              boxShadow: '0 24px 48px -12px rgba(0,0,0,0.18)',
              animation: 'slideUp 0.25s ease',
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#0F172A', margin: 0 }}>🔐 Quên mật khẩu?</h2>
                <p style={{ fontSize: '13px', color: '#64748B', margin: '4px 0 0' }}>Nhập email để nhận link đặt lại mật khẩu</p>
              </div>
              <button
                onClick={handleCloseForgotModal}
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  backgroundColor: '#F1F5F9', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#64748B', flexShrink: 0,
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Success State */}
            {forgotStatus === 'success' ? (
              <div style={{
                textAlign: 'center', padding: '24px 0',
              }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '50%',
                  backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <CheckCircle size={32} color="#10B981" />
                </div>
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: '#0F172A', margin: '0 0 8px' }}>Email đã được gửi!</h3>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.6', margin: '0 0 24px' }}>
                  {forgotMessage}
                </p>
                <p style={{ fontSize: '12px', color: '#94A3B8', margin: '0 0 20px' }}>⏱ Link có hiệu lực trong 15 phút. Kiểm tra cả hòm thư spam nhé!</p>
                <button
                  onClick={handleCloseForgotModal}
                  style={{
                    width: '100%', padding: '12px', borderRadius: '12px',
                    backgroundColor: '#10B981', color: '#fff', border: 'none',
                    fontSize: '14px', fontWeight: '700', cursor: 'pointer',
                  }}
                >
                  Đóng
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleForgotPasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Error Banner */}
                {forgotStatus === 'error' && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '12px 14px', borderRadius: '12px',
                    backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
                  }}>
                    <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
                    <p style={{ fontSize: '13px', color: '#B91C1C', margin: 0 }}>{forgotMessage}</p>
                  </div>
                )}

                {/* Email Input */}
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
                    Email tài khoản
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    border: '1.5px solid #E2E8F0', borderRadius: '12px',
                    padding: '11px 14px', backgroundColor: '#FFFFFF',
                  }}>
                    <Mail size={18} color="#94A3B8" style={{ marginRight: '10px', flexShrink: 0 }} />
                    <input
                      id="forgot-email-input"
                      type="email"
                      required
                      autoFocus
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Nhập email tài khoản của bạn"
                      style={{
                        border: 'none', outline: 'none', width: '100%',
                        fontSize: '14px', color: '#0F172A',
                      }}
                    />
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  id="forgot-password-submit-btn"
                  type="submit"
                  disabled={forgotLoading}
                  style={{
                    width: '100%', padding: '13px', borderRadius: '12px',
                    background: forgotLoading
                      ? '#CBD5E1'
                      : 'linear-gradient(135deg, #FF5722, #FF8A50)',
                    color: '#fff', border: 'none',
                    fontSize: '14px', fontWeight: '700', cursor: forgotLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: forgotLoading ? 'none' : '0 6px 16px rgba(255,87,34,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  {forgotLoading ? (
                    <>
                      <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={18} />
                      <span>Gửi link đặt lại mật khẩu</span>
                    </>
                  )}
                </button>

                <p style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', margin: 0 }}>
                  Nhớ mật khẩu rồi?{' '}
                  <span
                    onClick={handleCloseForgotModal}
                    style={{ color: '#FF5722', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Quay lại đăng nhập
                  </span>
                </p>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Keyframes for animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </>
  );
}
