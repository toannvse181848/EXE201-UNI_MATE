import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle, ArrowLeft, Loader } from 'lucide-react';
import { authApi } from '../services/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // null | 'success' | 'error'
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Link đặt lại mật khẩu không hợp lệ. Vui lòng yêu cầu lại.');
    }
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage('Mật khẩu xác nhận không khớp.');
      return;
    }
    if (newPassword.length < 6) {
      setStatus('error');
      setMessage('Mật khẩu phải có ít nhất 6 ký tự.');
      return;
    }

    setLoading(true);
    setStatus(null);
    try {
      const res = await authApi.resetPassword(token, newPassword);
      setStatus('success');
      setMessage(res.message || 'Đặt lại mật khẩu thành công!');
    } catch (err) {
      setStatus('error');
      setMessage(err.message || 'Có lỗi xảy ra. Token có thể đã hết hạn.');
    } finally {
      setLoading(false);
    }
  };

  return (
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
      {/* Back Button */}
      <div style={{ width: '100%', maxWidth: '460px', marginBottom: '14px' }}>
        <Link
          to="/login"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            padding: '10px 18px', borderRadius: '12px',
            backgroundColor: '#FFFFFF', border: '1.5px solid #E2E8F0',
            color: '#334155', fontSize: '14px', fontWeight: '700',
            textDecoration: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          }}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Đăng nhập</span>
        </Link>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: '460px',
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 20px 40px -12px rgba(0,0,0,0.1)',
          border: '1px solid #E2E8F0',
        }}
      >
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '64px', height: '64px', borderRadius: '20px',
            background: 'linear-gradient(135deg, #FF5722, #FF8A50)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px',
            boxShadow: '0 8px 20px rgba(255,87,34,0.3)',
          }}>
            <Lock size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: '#0F172A', margin: '0 0 6px', letterSpacing: '-0.5px' }}>
            Đặt lại mật khẩu
          </h1>
          <p style={{ fontSize: '13px', color: '#64748B', margin: 0 }}>
            Nhập mật khẩu mới cho tài khoản UNI-MATE của bạn
          </p>
        </div>

        {/* Success State */}
        {status === 'success' ? (
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: '72px', height: '72px', borderRadius: '50%',
              backgroundColor: '#D1FAE5', display: 'flex', alignItems: 'center',
              justifyContent: 'center', margin: '0 auto 20px',
            }}>
              <CheckCircle size={36} color="#10B981" />
            </div>
            <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#0F172A', margin: '0 0 10px' }}>
              Thành công! 🎉
            </h2>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.7', margin: '0 0 28px' }}>
              {message}
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #FF5722, #FF8A50)',
                color: '#fff', border: 'none',
                fontSize: '15px', fontWeight: '700', cursor: 'pointer',
                boxShadow: '0 6px 16px rgba(255,87,34,0.3)',
              }}
            >
              Đăng nhập ngay →
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Error Banner */}
            {status === 'error' && (
              <div style={{
                display: 'flex', alignItems: 'flex-start', gap: '10px',
                padding: '12px 14px', borderRadius: '12px',
                backgroundColor: '#FEF2F2', border: '1px solid #FCA5A5',
              }}>
                <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0, marginTop: '1px' }} />
                <p style={{ fontSize: '13px', color: '#B91C1C', margin: 0, lineHeight: '1.5' }}>{message}</p>
              </div>
            )}

            {/* New Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
                Mật khẩu mới
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: '1.5px solid #E2E8F0', borderRadius: '12px',
                padding: '11px 14px', backgroundColor: '#FFFFFF',
              }}>
                <Lock size={18} color="#94A3B8" style={{ marginRight: '10px', flexShrink: 0 }} />
                <input
                  id="new-password-input"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                  disabled={!token}
                  style={{
                    border: 'none', outline: 'none', width: '100%',
                    fontSize: '14px', color: '#0F172A', backgroundColor: 'transparent',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#94A3B8', flexShrink: 0 }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#0F172A', marginBottom: '8px' }}>
                Xác nhận mật khẩu
              </label>
              <div style={{
                display: 'flex', alignItems: 'center',
                border: `1.5px solid ${confirmPassword && confirmPassword !== newPassword ? '#FCA5A5' : '#E2E8F0'}`,
                borderRadius: '12px',
                padding: '11px 14px', backgroundColor: '#FFFFFF',
              }}>
                <Lock size={18} color="#94A3B8" style={{ marginRight: '10px', flexShrink: 0 }} />
                <input
                  id="confirm-password-input"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  disabled={!token}
                  style={{
                    border: 'none', outline: 'none', width: '100%',
                    fontSize: '14px', color: '#0F172A', backgroundColor: 'transparent',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0', color: '#94A3B8', flexShrink: 0 }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {confirmPassword && confirmPassword !== newPassword && (
                <p style={{ fontSize: '12px', color: '#EF4444', margin: '6px 0 0' }}>Mật khẩu không khớp</p>
              )}
            </div>

            {/* Submit */}
            <button
              id="reset-password-submit-btn"
              type="submit"
              disabled={loading || !token}
              style={{
                width: '100%', padding: '13px', borderRadius: '12px',
                background: (loading || !token) ? '#CBD5E1' : 'linear-gradient(135deg, #FF5722, #FF8A50)',
                color: '#fff', border: 'none',
                fontSize: '15px', fontWeight: '700',
                cursor: (loading || !token) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                boxShadow: (loading || !token) ? 'none' : '0 6px 16px rgba(255,87,34,0.3)',
                transition: 'all 0.2s',
                marginTop: '4px',
              }}
            >
              {loading ? (
                <>
                  <Loader size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <span>🔑 Đặt lại mật khẩu</span>
              )}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
