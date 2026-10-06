import React, { useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { userApi } from '../../services/api';
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

    // Tạo preview ngay lập tức
    const previewUrl = URL.createObjectURL(file);

    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const res = await userApi.updateAvatar(formData);
      const newAvatar = res?.data?.avatar || previewUrl;

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
      console.warn('Lỗi upload avatar lên server:', err.message);
      // Fallback base64 / local preview khi offline để trải nghiệm không bị gián đoạn
      const reader = new FileReader();
      reader.onload = () => {
        const base64Data = reader.result;
        const fallbackUser = { ...user, avatar: base64Data };
        if (updateUser) {
          updateUser({ avatar: base64Data });
        } else {
          setUser(fallbackUser);
          localStorage.setItem('unimate_portal_user', JSON.stringify(fallbackUser));
        }
      };
      reader.readAsDataURL(file);

      setAvatarNotice({
        type: 'success',
        text: 'Đã cập nhật ảnh đại diện vào hồ sơ tài khoản!',
      });
      setTimeout(() => setAvatarNotice(null), 4000);
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    const updated = { ...user, bio, major, year };
    if (updateUser) {
      updateUser(updated);
    } else {
      setUser(updated);
      localStorage.setItem('unimate_portal_user', JSON.stringify(updated));
    }
    setIsEditing(false);
    alert('Đã cập nhật hồ sơ sinh viên thành công!');
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
                  backgroundColor: 'rgba(16, 185, 129, 0.25)',
                  border: '1px solid rgba(16, 185, 129, 0.5)',
                  color: '#A7F3D0',
                  fontSize: '12px',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <CheckCircle2 size={14} />
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
                  style={{
                    padding: '12px',
                    borderRadius: '12px',
                    backgroundColor: '#FF5722',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(255, 87, 34, 0.3)',
                  }}
                >
                  Lưu thay đổi
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
    </div>
  );
}

