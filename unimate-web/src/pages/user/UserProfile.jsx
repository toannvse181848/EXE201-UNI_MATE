import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
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
} from 'lucide-react';

export default function UserProfile() {
  const { user, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(user?.bio || 'Tìm bạn cùng cày deadline & khám phá các quán cafe yên tĩnh khu Công nghệ cao 🚀');
  const [major, setMajor] = useState(user?.major || 'Kỹ thuật Phần mềm');

  const handleSave = (e) => {
    e.preventDefault();
    const updated = { ...user, bio, major };
    setUser(updated);
    localStorage.setItem('unimate_portal_user', JSON.stringify(updated));
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
              background: 'linear-gradient(135deg, #0F766E 0%, #042F2E 100%)',
              borderRadius: '24px',
              padding: '28px',
              color: '#FFFFFF',
              boxShadow: '0 20px 25px -5px rgba(15, 118, 110, 0.3)',
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
                    backgroundColor: '#14B8A6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#042F2E',
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
                  color: '#5EEAD4',
                  border: '1px solid rgba(45, 212, 191, 0.4)',
                }}
              >
                <CheckCircle2 size={12} />
                <span>XÁC THỰC BỞI TRƯỜNG</span>
              </div>
            </div>

            {/* Student Info & Photo */}
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '24px' }}>
              <img
                src={user?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'}
                alt="Avatar"
                style={{
                  width: '74px',
                  height: '74px',
                  borderRadius: '16px',
                  objectFit: 'cover',
                  border: '3px solid #2DD4BF',
                  boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                }}
              />
              <div>
                <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.3px' }}>
                  {user?.name || 'Nguyễn Văn Toàn'}
                </div>
                <div style={{ fontSize: '13px', color: '#99F6E4', marginTop: '2px' }}>
                  MSSV: <strong>{user?.studentId || 'SE181848'}</strong>
                </div>
                <div style={{ fontSize: '12px', color: '#CCFBF1', marginTop: '2px' }}>
                  {user?.university || 'Đại học FPT TP.HCM'}
                </div>
              </div>
            </div>

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
                <div style={{ fontSize: '10px', color: '#99F6E4', textTransform: 'uppercase' }}>
                  Chuyên ngành
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                  {user?.major || 'Kỹ thuật Phần mềm'}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: '#99F6E4', textTransform: 'uppercase' }}>
                  Niên khóa
                </div>
                <div style={{ fontSize: '13px', fontWeight: '700' }}>
                  2023 - 2027 ({user?.year || 'Năm 3'})
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <QrCode size={36} color="#5EEAD4" />
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
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#0D9488' }}>98%</div>
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
                  color: '#0D9488',
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
                  <input
                    type="text"
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
                    }}
                  />
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
                    backgroundColor: '#0D9488',
                    color: '#FFFFFF',
                    fontWeight: '700',
                    fontSize: '14px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(13, 148, 136, 0.3)',
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
                          backgroundColor: '#F0FDFA',
                          color: '#0F766E',
                          fontSize: '12px',
                          fontWeight: '700',
                          border: '1px solid #CCFBF1',
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-light)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669', fontSize: '13px', fontWeight: '700' }}>
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
