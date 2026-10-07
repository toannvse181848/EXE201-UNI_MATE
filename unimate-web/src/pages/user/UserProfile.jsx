import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userApi, authApi } from '../../services/api';
import {
  GraduationCap,
  ShieldCheck,
  CheckCircle2,
  Coins,
  QrCode,
  Sparkles,
  MapPin,
  Calendar,
  BookOpen,
  Edit3,
  Coffee,
  Heart,
  Award,
  Camera,
  Loader2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  KeyRound,
  CheckCircle,
} from 'lucide-react';

import { MAJORS, ACADEMIC_YEARS, formatStudentYear } from '../../constants/academic';

export default function UserProfile() {
  const { user, setUser, updateUser } = useAuth();
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || '');
  const [major, setMajor] = useState(user?.major || '');
  const [year, setYear] = useState(user?.year || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // === Change Password State ===
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdNotice, setPwdNotice] = useState(null); // { type: 'success'|'error', text }


  const handleAvatarSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WEBP...)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Dung lượng ảnh tối đa là 10MB');
      return;
    }

    setIsUploadingAvatar(true);
    setAvatarNotice(null);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await userApi.updateAvatar(formData);
      const newAvatar = res?.data?.avatar;
      if (!newAvatar) throw new Error('Máy chủ không trả về ảnh đại diện mới');

      const updated = { ...user, avatar: newAvatar };
      if (updateUser) {
        updateUser({ avatar: newAvatar });
      } else {
        setUser(updated);
        localStorage.setItem('unimate_portal_user', JSON.stringify(updated));
      }

      setAvatarNotice({ type: 'success', text: 'Cập nhật ảnh đại diện thành công!' });
      setTimeout(() => setAvatarNotice(null), 4000);
    } catch (err) {
      // Không giả lập thành công bằng ảnh base64 local — ảnh chưa được lưu vào DB
      setAvatarNotice({ type: 'error', text: 'Tải ảnh đại diện thất bại: ' + err.message });
      setTimeout(() => setAvatarNotice(null), 6000);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSavingProfile) return;

    setIsSavingProfile(true);
    try {
      const res = await userApi.updateMe({ bio, major, year });
      const saved = res?.data?.user || { bio, major, year };
      const updated = { ...user, bio: saved.bio, major: saved.major, year: saved.year };
      if (updateUser) {
        updateUser(updated);
      } else {
        setUser(updated);
        localStorage.setItem('unimate_portal_user', JSON.stringify(updated));
      }
      setIsEditing(false);
      alert('Đã cập nhật hồ sơ sinh viên thành công!');
    } catch (err) {
      alert('Lưu hồ sơ thất bại: ' + err.message);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPwdNotice({ type: 'error', text: 'Mật khẩu xác nhận không khớp.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwdNotice({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự.' });
      return;
    }
    setPwdLoading(true);
    setPwdNotice(null);
    try {
      await authApi.changePassword(currentPassword, newPassword);
      setPwdNotice({ type: 'success', text: 'Đổi mật khẩu thành công! 🎉' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => { setPwdNotice(null); setShowChangePassword(false); }, 3000);
    } catch (err) {
      setPwdNotice({ type: 'error', text: err.message || 'Đổi mật khẩu thất bại. Vui lòng thử lại.' });
    } finally {
      setPwdLoading(false);
    }
  };


  return (
    <div style={{ maxWidth: '960px', margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>
          Hồ sơ Sinh viên & Thẻ Uni-Card 🎓
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Quản lý thông tin học tập, thẻ sinh viên điện tử được xác thực và điểm tín nhiệm.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px' }}>
        {/* Left Column: Electronic Student Card (Uni-Card) */}
        <div>
          <div
            style={{
              background: 'linear-gradient(135deg, #E64A19 0%, #1A0E00 100%)',
              borderRadius: '24px',
              padding: '28px',
              color: '#FFFFFF',
              boxShadow: '0 20px 25px -5px rgba(230, 74, 25, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              border: '1px solid rgba(255,255,255,0.15)',
              marginBottom: '24px',
            }}
          >
            {/* Background watermark */}
            <div
              style={{
                position: 'absolute',
                top: '-20px',
                right: '-20px',
                opacity: 0.08,
                fontSize: '180px',
                fontWeight: '900',
                userSelect: 'none',
              }}
            >
              U
            </div>

            {/* Card Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: '#FF5722',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#1A0E00',
                    fontWeight: '900',
                  }}
                >
                  U
                </div>
                <span style={{ fontSize: '15px', fontWeight: '900', letterSpacing: '1px' }}>
                  UNI-MATE CARD
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: 'rgba(45, 212, 191, 0.2)',
                  padding: '4px 10px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '700',
                  color: '#FFB74D',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
                }}
              >
                <CheckCircle2 size={12} />
                <span>XÁC THỰC BỞI TRƯỜNG</span>
              </div>
            </div>

            {/* Student Info & Photo */}
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '24px' }}>
              {/* Avatar with Upload button badge */}
              <div style={{ position: 'relative' }}>
                <img
                  src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                  alt="Avatar"
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '20px',
                    objectFit: 'cover',
                    border: '3px solid #FF8A50',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
                    display: 'block',
                  }}
                />

                {/* Upload Trigger Badge */}
                <button
                  type="button"
                  title="Thay đổi ảnh đại diện"
                  disabled={isUploadingAvatar}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    bottom: '-4px',
                    right: '-4px',
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#FF5722',
                    border: '2px solid #FFFFFF',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: isUploadingAvatar ? 'not-allowed' : 'pointer',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  {isUploadingAvatar ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Camera size={15} />
                  )}
                </button>

                {/* Hidden File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAvatarSelect}
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  style={{ display: 'none' }}
                />
              </div>

              <div>
                <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.3px' }}>
                  {user?.name || user?.fullName || 'Sinh viên'}
                </div>
                <div style={{ fontSize: '13px', color: '#FFCC80', marginTop: '2px' }}>
                  MSSV: <strong>{user?.studentId || '—'}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#FBE9E7', marginTop: '2px' }}>
                  {user?.university || '—'}
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  style={{
                    marginTop: '6px',
                    fontSize: '11px',
                    fontWeight: '600',
                    color: '#FFE0B2',
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '8px',
                    padding: '3px 10px',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <Camera size={12} />
                  {isUploadingAvatar ? 'Đang tải ảnh lên...' : 'Đổi ảnh đại diện'}
                </button>
              </div>
            </div>

            {/* Avatar notification toast */}
            {avatarNotice && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  backgroundColor: avatarNotice.type === 'error' ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
                  border: avatarNotice.type === 'error' ? '1px solid rgba(239, 68, 68, 0.5)' : '1px solid rgba(16, 185, 129, 0.5)',
                  color: avatarNotice.type === 'error' ? '#FECACA' : '#A7F3D0',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {avatarNotice.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                <span>{avatarNotice.text}</span>
              </div>
            )}

            {/* Bottom Meta Bar */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingTop: '16px',
                borderTop: '1px solid rgba(255,255,255,0.15)',
              }}
            >
              <div>
                <div style={{ fontSize: '10px', color: '#FFCC80', textTransform: 'uppercase' }}>
                  Chuyên ngành
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                  {user?.major || 'Kỹ thuật Phần mềm'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: '#FFCC80', textTransform: 'uppercase' }}>
                  Năm học
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                  {formatStudentYear(user?.year || 'Sinh viên năm 3')}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <QrCode size={36} color="#FFB74D" />
              </div>
            </div>
          </div>

          {/* Student Stats Summary */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#FF5722' }}>98%</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Tín nhiệm SV</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#F59E0B' }}>450</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>UniCoin</div>
            </div>
            <div style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center' }}>
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#6366F1' }}>12</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>Cạ cứng Match</div>
            </div>
          </div>
        </div>

        {/* Right Column: Bio, Interests, Edit Form */}
        <div>
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Thông tin & Giới thiệu
              </h3>
              <button
                onClick={() => setIsEditing(!isEditing)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  color: '#FF5722',
                  cursor: 'pointer',
                }}
              >
                <Edit3 size={15} />
                <span>{isEditing ? 'Hủy chỉnh sửa' : 'Chỉnh sửa'}</span>
              </button>
            </div>

            {isEditing ? (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Chuyên ngành:
                  </label>
                  <select
                    value={major}
                    onChange={(e) => setMajor(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {MAJORS.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Năm học:
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    {ACADEMIC_YEARS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Tiểu sử (Bio giới thiệu khi tìm bạn cafe):
                  </label>
                  <textarea
                    rows={4}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSavingProfile}
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#FF5722',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: isSavingProfile ? 'default' : 'pointer',
                    opacity: isSavingProfile ? 0.7 : 1,
                    boxShadow: '0 4px 10px rgba(255, 87, 34, 0.3)',
                  }}
                >
                  {isSavingProfile ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </form>
            ) : (
              <div>
                <div style={{ marginBottom: '18px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '4px' }}>
                    GIỚI THIỆU BẢN THÂN
                  </div>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', lineHeight: '1.6' }}>
                    {user?.bio || 'Chưa cập nhật tiểu sử.'}
                  </p>
                </div>

                <div style={{ marginBottom: '22px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: '600', marginBottom: '8px' }}>
                    SỞ THÍCH & HỌC TẬP
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(user?.interests || ['Lập trình React', 'Cafe học bài', 'Boardgame', 'Guitar']).map((tag) => (
                      <span
                        key={tag}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '14px',
                          backgroundColor: '#FFF3E0',
                          color: '#E64A19',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: '1px solid #FBE9E7',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#E64A19', fontSize: '13px', fontWeight: '700' }}>
                    <Award size={18} />
                    <span>Huy hiệu: Thành viên Tích cực Uni-Mate 2026</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ===== CHANGE PASSWORD SECTION ===== */}
      <div
        style={{
          marginTop: '24px',
          backgroundColor: '#FFFFFF',
          borderRadius: '20px',
          border: '1px solid var(--border-color)',
          boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
          overflow: 'hidden',
        }}
      >
        {/* Section Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 28px',
            cursor: 'pointer',
            borderBottom: showChangePassword ? '1px solid var(--border-color)' : 'none',
            transition: 'background 0.15s',
          }}
          onClick={() => { setShowChangePassword(!showChangePassword); setPwdNotice(null); }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFF8F5')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFFFFF')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #FF5722, #FF8A50)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 10px rgba(255,87,34,0.25)',
            }}>
              <KeyRound size={20} color="#fff" />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>Đổi mật khẩu</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cập nhật mật khẩu bảo mật tài khoản</div>
            </div>
          </div>
          <div style={{
            fontSize: '12px', fontWeight: '700', color: '#FF5722',
            display: 'flex', alignItems: 'center', gap: '4px',
          }}>
            {showChangePassword ? '▲ Thu gọn' : '▼ Mở rộng'}
          </div>
        </div>

        {/* Form */}
        {showChangePassword && (
          <div style={{ padding: '24px 28px' }}>
            {/* Notice */}
            {pwdNotice && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '12px 14px', borderRadius: '12px', marginBottom: '20px',
                backgroundColor: pwdNotice.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                border: `1px solid ${pwdNotice.type === 'error' ? '#FCA5A5' : '#86EFAC'}`,
              }}>
                {pwdNotice.type === 'error'
                  ? <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
                  : <CheckCircle size={18} color="#22C55E" style={{ flexShrink: 0 }} />}
                <span style={{ fontSize: '13px', fontWeight: '600', color: pwdNotice.type === 'error' ? '#B91C1C' : '#15803D' }}>
                  {pwdNotice.text}
                </span>
              </div>
            )}

            <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '16px', maxWidth: '480px' }}>
              {/* Current Password */}
              {[{
                id: 'current-password-input',
                label: 'Mật khẩu hiện tại',
                value: currentPassword,
                setter: setCurrentPassword,
                show: showCurrentPwd,
                toggle: () => setShowCurrentPwd(!showCurrentPwd),
              }, {
                id: 'new-password-input',
                label: 'Mật khẩu mới',
                value: newPassword,
                setter: setNewPassword,
                show: showNewPwd,
                toggle: () => setShowNewPwd(!showNewPwd),
              }, {
                id: 'confirm-new-password-input',
                label: 'Xác nhận mật khẩu mới',
                value: confirmPassword,
                setter: setConfirmPassword,
                show: showConfirmPwd,
                toggle: () => setShowConfirmPwd(!showConfirmPwd),
                isError: confirmPassword && confirmPassword !== newPassword,
              }].map((field) => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '8px' }}>
                    {field.label}
                  </label>
                  <div style={{
                    display: 'flex', alignItems: 'center',
                    border: `1.5px solid ${field.isError ? '#FCA5A5' : 'var(--border-color)'}`,
                    borderRadius: '12px', padding: '10px 14px',
                    transition: 'border-color 0.2s',
                  }}>
                    <Lock size={17} color="#94A3B8" style={{ marginRight: '10px', flexShrink: 0 }} />
                    <input
                      id={field.id}
                      type={field.show ? 'text' : 'password'}
                      required
                      value={field.value}
                      onChange={(e) => field.setter(e.target.value)}
                      placeholder={field.label}
                      style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', color: 'var(--text-primary)' }}
                    />
                    <button type="button" onClick={field.toggle}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', flexShrink: 0, padding: 0 }}>
                      {field.show ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {field.isError && (
                    <p style={{ fontSize: '12px', color: '#EF4444', margin: '5px 0 0' }}>Mật khẩu không khớp</p>
                  )}
                </div>
              ))}

              <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                <button
                  id="change-password-submit-btn"
                  type="submit"
                  disabled={pwdLoading}
                  style={{
                    flex: 1, padding: '12px', borderRadius: '12px',
                    background: pwdLoading ? '#CBD5E1' : 'linear-gradient(135deg, #FF5722, #FF8A50)',
                    color: '#fff', border: 'none',
                    fontSize: '14px', fontWeight: '700',
                    cursor: pwdLoading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    boxShadow: pwdLoading ? 'none' : '0 4px 12px rgba(255,87,34,0.3)',
                    transition: 'all 0.2s',
                  }}
                >
                  {pwdLoading
                    ? <><Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} /> Đang lưu...</>
                    : <><KeyRound size={17} /> Đổi mật khẩu</>
                  }
                </button>
                <button
                  type="button"
                  onClick={() => { setShowChangePassword(false); setPwdNotice(null); setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); }}
                  style={{
                    padding: '12px 18px', borderRadius: '12px',
                    backgroundColor: '#F1F5F9', border: '1.5px solid #E2E8F0',
                    fontSize: '14px', fontWeight: '700', color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Hủy
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
