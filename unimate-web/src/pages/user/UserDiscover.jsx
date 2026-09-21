import React, { useState } from 'react';
import {
  Heart,
  Coffee,
  X,
  Sparkles,
  MapPin,
  GraduationCap,
  BookOpen,
  Filter,
  CheckCircle2,
  Calendar,
  Send,
} from 'lucide-react';

const MOCK_STUDENTS = [
  {
    id: 's1',
    name: 'Lê Minh Thảo',
    age: 20,
    gender: 'Nữ',
    university: 'Đại học FPT TP.HCM',
    major: 'Truyền thông Đa phương tiện',
    year: 'Năm 2',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500',
    distance: '0.8 km',
    trustScore: 99,
    bio: 'Đang làm đồ án môn PR, tìm bạn cày deadline chung ở The Coffee House hoặc Highlands cuối tuần này! ✨',
    interests: ['Chụp ảnh phim', 'Cafe chill', 'Thiết kế Canva', 'Acoustic'],
    favoritePlace: 'The Coffee House - Sư Vạn Hạnh',
  },
  {
    id: 's2',
    name: 'Trần Quốc Bảo',
    age: 21,
    gender: 'Nam',
    university: 'ĐH Bách Khoa TP.HCM',
    major: 'Khoa học Máy tính',
    year: 'Năm 3',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500',
    distance: '1.5 km',
    trustScore: 97,
    bio: 'Dev Backend đang học LeetCode và chuẩn bị phỏng vấn thực tập. Tìm bạn ngồi code chung không gian yên tĩnh 💻',
    interests: ['Lập trình Go/Java', 'Board game', 'Cafe 24h', 'Gym'],
    favoritePlace: 'Cheese Coffee - D2 Bình Thạnh',
  },
  {
    id: 's3',
    name: 'Nguyễn Hà My',
    age: 19,
    gender: 'Nữ',
    university: 'ĐH Kinh Tế TP.HCM (UEH)',
    major: 'Kinh doanh Quốc tế',
    year: 'Năm 1',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500',
    distance: '2.3 km',
    trustScore: 98,
    bio: 'Mới lên Sài Gòn, muốn tìm bạn cùng trường hoặc trường bạn dẫn đi khám phá các quán cafe view đẹp học bài 🌸',
    interests: ['Học Tiếng Anh', 'Đọc sách', 'Trà sữa', 'Podcast'],
    favoritePlace: 'Phúc Long Coffee & Tea',
  },
  {
    id: 's4',
    name: 'Phạm Hoàng Nam',
    age: 22,
    gender: 'Nam',
    university: 'ĐH Quốc Tế (ĐHQG TP.HCM)',
    major: 'Tài chính - Ngân hàng',
    year: 'Năm 4',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500',
    distance: '3.1 km',
    trustScore: 96,
    bio: 'Chuẩn bị làm khóa luận tốt nghiệp, cần tìm hội cày đề IELTS 7.0+ và giải đề CFA ☕',
    interests: ['IELTS 7.5', 'Chứng khoán', 'Cà phê sách', 'Bóng rổ'],
    favoritePlace: 'Trung Nguyên Legend Cafe',
  },
];

const UNIVERSITIES = ['Tất cả các trường', 'Đại học FPT TP.HCM', 'ĐH Bách Khoa TP.HCM', 'ĐH Kinh Tế TP.HCM (UEH)', 'ĐH Quốc Tế (ĐHQG)'];

export default function UserDiscover() {
  const [students, setStudents] = useState(MOCK_STUDENTS);
  const [selectedUni, setSelectedUni] = useState('Tất cả các trường');
  const [activeStudent, setActiveStudent] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedStudent, setInvitedStudent] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);

  const filteredStudents = selectedUni === 'Tất cả các trường'
    ? students
    : students.filter((s) => s.university === selectedUni);

  const handleLike = (student) => {
    alert(`🎉 Đã gửi lời kết bạn thành công đến ${student.name}! Khi bạn ấy đồng ý, cả 2 có thể nhắn tin hẹn cafe học bài.`);
  };

  const handleOpenInvite = (student) => {
    setInvitedStudent(student);
    setShowInviteModal(true);
    setInviteSuccess(false);
  };

  const handleSendInvite = (e) => {
    e.preventDefault();
    setInviteSuccess(true);
    setTimeout(() => {
      setShowInviteModal(false);
      setInviteSuccess(false);
    }, 1800);
  };

  return (
    <div>
      {/* Top Banner / Welcome */}
      <div
        style={{
          backgroundColor: '#E64A19',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#FFFFFF',
          marginBottom: '28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 10px 25px -5px rgba(230, 74, 25, 0.3)',
          backgroundImage: 'linear-gradient(135deg, #E64A19 0%, #1A0E00 100%)',
        }}
      >
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', backgroundColor: 'rgba(255,255,255,0.15)', padding: '4px 12px', borderRadius: '16px', fontSize: '12px', fontWeight: '700', marginBottom: '10px' }}>
            <Sparkles size={14} color="#FFB74D" />
            <span>Ghép đôi học tập & Cafe thông minh</span>
          </div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', marginBottom: '6px' }}>
            Khám phá Bạn học & Đi Cà phê Sinh viên 🎓☕
          </h1>
          <p style={{ fontSize: '14px', color: '#FBE9E7', maxWidth: '580px' }}>
            Tìm kiếm bạn bè cùng trường ĐH, cùng cày deadline hoặc ôn thi tại các quán cafe thân thiện cho sinh viên gần bạn nhất.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#FFB74D' }}>
            {filteredStudents.length}
          </div>
          <div style={{ fontSize: '12px', color: '#FFCC80', fontWeight: '600' }}>
            Bạn học đang tìm cạ cứng
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: '#FFFFFF',
          padding: '14px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          marginBottom: '24px',
          gap: '12px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="#FF5722" />
          <span style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>Lọc theo Trường ĐH:</span>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {UNIVERSITIES.map((uni) => {
            const isSelected = selectedUni === uni;
            return (
              <button
                key={uni}
                onClick={() => setSelectedUni(uni)}
                style={{
                  padding: '7px 14px',
                  borderRadius: '20px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  backgroundColor: isSelected ? '#FF5722' : '#F1F5F9',
                  color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isSelected ? '1px solid #FF5722' : '1px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {uni}
              </button>
            );
          })}
        </div>
      </div>

      {/* Student Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {filteredStudents.map((student) => (
          <div
            key={student.id}
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '1px solid var(--border-color)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
              transition: 'all 0.2s ease',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Student Photo & Distance Pill */}
            <div style={{ position: 'relative', height: '260px' }}>
              <img
                src={student.avatar}
                alt={student.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  right: '14px',
                  backgroundColor: 'rgba(0, 0, 0, 0.65)',
                  backdropFilter: 'blur(4px)',
                  color: '#FFFFFF',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                <MapPin size={12} color="#FFB74D" />
                <span>Cách bạn {student.distance}</span>
              </div>

              {/* Verified Trust Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '14px',
                  left: '14px',
                  backgroundColor: '#FFF3E0',
                  color: '#E64A19',
                  padding: '4px 10px',
                  borderRadius: '16px',
                  fontSize: '11px',
                  fontWeight: '800',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  border: '1px solid #A7F3D0',
                }}
              >
                <CheckCircle2 size={12} />
                <span>Tín nhiệm {student.trustScore}%</span>
              </div>

              {/* Name & Uni Overlay */}
              <div style={{ position: 'absolute', bottom: '14px', left: '16px', right: '16px', color: '#FFFFFF' }}>
                <div style={{ fontSize: '19px', fontWeight: '800' }}>
                  {student.name}, <span style={{ fontWeight: '400', fontSize: '17px' }}>{student.age}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#FBE9E7', marginTop: '2px' }}>
                  <GraduationCap size={14} />
                  <span>{student.university} • {student.year}</span>
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '12px', fontStyle: 'italic', lineHeight: '1.5' }}>
                "{student.bio}"
              </div>

              {/* Major & Favorite Cafe */}
              <div style={{ marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <BookOpen size={14} color="#FF5722" />
                  <span>Ngành: <strong>{student.major}</strong></span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-primary)' }}>
                  <Coffee size={14} color="#FF5722" />
                  <span>Quán yêu thích: <strong>{student.favoritePlace}</strong></span>
                </div>
              </div>

              {/* Interest Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '18px' }}>
                {student.interests.map((tag) => (
                  <span
                    key={tag}
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      backgroundColor: '#FFF3E0',
                      color: '#E64A19',
                      border: '1px solid #FBE9E7',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Action Buttons */}
              <div style={{ marginTop: 'auto', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => handleLike(student)}
                  style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '12px',
                    backgroundColor: '#FFF3E0',
                    color: '#FF5722',
                    border: '1.5px solid #FFCC80',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                  }}
                >
                  <Heart size={16} />
                  <span>Kết bạn</span>
                </button>

                <button
                  onClick={() => handleOpenInvite(student)}
                  style={{
                    flex: 1.3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px',
                    borderRadius: '12px',
                    backgroundColor: '#FF5722',
                    color: '#FFFFFF',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    boxShadow: '0 4px 10px rgba(255, 87, 34, 0.25)',
                  }}
                >
                  <Coffee size={16} />
                  <span>Rủ đi cafe</span>
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: Rủ đi cafe học bài */}
      {showInviteModal && invitedStudent && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '28px',
              maxWidth: '460px',
              width: '100%',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coffee size={22} color="#FF5722" />
                <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Rủ {invitedStudent.name} đi Cafe
                </h3>
              </div>
              <button onClick={() => setShowInviteModal(false)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            {inviteSuccess ? (
              <div style={{ textAlign: 'center', padding: '30px 10px' }}>
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '50%',
                    backgroundColor: '#FFF3E0',
                    color: '#E64A19',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <CheckCircle2 size={36} />
                </div>
                <h4 style={{ fontSize: '18px', fontWeight: '800', color: '#E64A19' }}>
                  Lời mời đã được gửi đi! ☕🎉
                </h4>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '6px' }}>
                  {invitedStudent.name} sẽ nhận được thông báo kèm mã giảm giá áp dụng tại quán.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    Chọn Quán Cafe hẹn gặp:
                  </label>
                  <select
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    <option>{invitedStudent.favoritePlace} (Ưu đãi SV -20%)</option>
                    <option>Highlands Coffee - Gần trường ĐH (Tặng bánh)</option>
                    <option>Cheese Coffee - Sư Vạn Hạnh (Giảm 15k)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    Thời gian hẹn:
                  </label>
                  <input
                    type="datetime-local"
                    defaultValue="2026-09-22T14:30"
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
                  <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                    Lời nhắn rủ bạn:
                  </label>
                  <textarea
                    rows={3}
                    defaultValue={`Chào ${invitedStudent.name}, mình thấy bạn cũng đang tìm bạn đi cafe cày deadline. Chiều mai cùng qua quán học bài nhé! 💻`}
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
                    marginTop: '8px',
                    padding: '12px',
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
                    boxShadow: '0 4px 12px rgba(255, 87, 34, 0.3)',
                  }}
                >
                  <Send size={16} />
                  <span>Gửi lời mời kèm Voucher</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

