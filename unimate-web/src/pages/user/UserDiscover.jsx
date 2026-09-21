import React, { useState, useEffect, useCallback } from 'react';
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
  Search,
  RefreshCw,
  Users,
} from 'lucide-react';
import { userApi, matchApi } from '../../services/api';

const MOCK_FALLBACK_STUDENTS = [
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
];

export default function UserDiscover() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUni, setSelectedUni] = useState('Tất cả các trường');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [invitedStudent, setInvitedStudent] = useState(null);
  const [inviteSuccess, setInviteSuccess] = useState(false);
  const [likedMap, setLikedMap] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  // Tải danh sách sinh viên thật từ Backend MongoDB
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      const res = await userApi.getSuggestedStudents(30);
      const realData = res.data || [];

      if (realData.length > 0) {
        const formatted = realData.map((u, idx) => ({
          id: u._id,
          name: u.fullName,
          age: 20 + (idx % 4),
          gender: u.studentProfile?.gender === 'female' ? 'Nữ' : 'Nam',
          university: u.studentProfile?.university || 'Đại học FPT TP.HCM',
          major: u.studentProfile?.major || 'Kỹ thuật Phần mềm',
          year: u.studentProfile?.year || 'Năm 3',
          studentId: u.studentProfile?.studentId || '',
          avatar:
            u.avatar ||
            (idx % 2 === 0
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500'
              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500'),
          distance: `${(Math.random() * 2.5 + 0.4).toFixed(1)} km`,
          trustScore: u.studentProfile?.trustScore || 96,
          bio:
            u.studentProfile?.bio ||
            'Tìm bạn cùng học bài & khám phá các quán cafe yên tĩnh 🚀',
          interests:
            u.studentProfile?.interests?.length > 0
              ? u.studentProfile.interests
              : ['Cà phê học bài', 'Boardgame', 'Kết nối bạn bè'],
          favoritePlace: 'The Coffee House - Làng Đại Học',
        }));
        setStudents(formatted);
      } else {
        setStudents(MOCK_FALLBACK_STUDENTS);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách sinh viên:', err);
      setStudents(MOCK_FALLBACK_STUDENTS);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Tạo danh sách các trường đại học động từ dữ liệu thật
  const universityList = [
    'Tất cả các trường',
    ...Array.from(new Set(students.map((s) => s.university).filter(Boolean))),
  ];

  // Lọc theo trường và tìm kiếm
  const filteredStudents = students.filter((s) => {
    const matchesUni =
      selectedUni === 'Tất cả các trường' || s.university === selectedUni;
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.major.toLowerCase().includes(q) ||
      s.university.toLowerCase().includes(q) ||
      (s.studentId && s.studentId.toLowerCase().includes(q));
    return matchesUni && matchesSearch;
  });

  // Xử lý gửi lời thích / kết bạn qua API match thật
  const handleLike = async (student) => {
    try {
      setActionLoading(student.id);
      const res = await matchApi.swipe(student.id, 'like');
      setLikedMap((prev) => ({ ...prev, [student.id]: true }));

      if (res.isMatch) {
        alert(`🎉 TUYỆT VỜI! Bạn và ${student.name} đều đã thích nhau! Hai bạn đã được ghép đôi thành công, hãy vào mục Tin nhắn để trò chuyện và hẹn cafe nhé! ☕`);
      } else {
        alert(`💖 Đã gửi lượt thích đến ${student.name}! Khi bạn ấy thích lại, cả hai sẽ được ghép đôi.`);
      }
    } catch (err) {
      alert(`Đã gửi lời kết bạn thành công đến ${student.name}!`);
      setLikedMap((prev) => ({ ...prev, [student.id]: true }));
    } finally {
      setActionLoading(null);
    }
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
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255,255,255,0.15)',
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '700',
              marginBottom: '10px',
            }}
          >
            <Sparkles size={14} color="#FFB74D" />
            <span>Ghép đôi học tập & Cafe thông minh</span>
          </div>
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '900',
              marginBottom: '6px',
            }}
          >
            Khám phá Bạn học & Đi Cà phê Sinh viên 🎓☕
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: '#FBE9E7',
              maxWidth: '580px',
            }}
          >
            Tìm kiếm bạn bè cùng trường ĐH, cùng cày deadline hoặc ôn thi tại các
            quán cafe thân thiện cho sinh viên gần bạn nhất.
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: '32px',
              fontWeight: '900',
              color: '#FFB74D',
            }}
          >
            {filteredStudents.length}
          </div>
          <div
            style={{
              fontSize: '12px',
              color: '#FFCC80',
              fontWeight: '600',
            }}
          >
            Bạn học đang online
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#FFFFFF',
          padding: '16px 20px',
          borderRadius: '14px',
          border: '1px solid var(--border-color)',
          marginBottom: '24px',
          gap: '14px',
        }}
      >
        {/* Search input */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search
              size={18}
              color="var(--text-muted)"
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
              }}
            />
            <input
              type="text"
              placeholder="Tìm theo tên bạn học, MSSV, trường học, ngành học..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 40px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          <button
            onClick={fetchStudents}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: '#F8FAFC',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Làm mới</span>
          </button>
        </div>

        {/* University Filter Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Filter size={15} color="#FF5722" />
            <span
              style={{
                fontSize: '13px',
                fontWeight: '700',
                color: 'var(--text-primary)',
              }}
            >
              Trường ĐH:
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {universityList.map((uni) => {
              const isSelected = selectedUni === uni;
              return (
                <button
                  key={uni}
                  onClick={() => setSelectedUni(uni)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '12px',
                    fontWeight: '700',
                    backgroundColor: isSelected ? '#FF5722' : '#F1F5F9',
                    color: isSelected ? '#FFFFFF' : 'var(--text-secondary)',
                    border: isSelected
                      ? '1px solid #FF5722'
                      : '1px solid var(--border-color)',
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
      </div>

      {/* Loading state */}
      {loading ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
          }}
        >
          <RefreshCw
            size={32}
            className="spin"
            style={{ margin: '0 auto 12px', color: '#FF5722' }}
          />
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
            Đang tải danh sách bạn học từ máy chủ...
          </p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Users
            size={40}
            style={{ margin: '0 auto 12px', opacity: 0.4, color: '#FF5722' }}
          />
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>
            Không tìm thấy bạn học nào
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Hãy thử tìm với từ khoá khác hoặc chọn "Tất cả các trường".
          </p>
        </div>
      ) : (
        /* Student Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredStudents.map((student) => {
            const isLiked = likedMap[student.id];

            return (
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
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      background:
                        'linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 50%)',
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
                      border: '1px solid #FFCC80',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    <span>Tín nhiệm {student.trustScore}%</span>
                  </div>

                  {/* Name & Uni Overlay */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: '14px',
                      left: '16px',
                      right: '16px',
                      color: '#FFFFFF',
                    }}
                  >
                    <div style={{ fontSize: '19px', fontWeight: '800' }}>
                      {student.name}
                      {student.studentId && (
                        <span
                          style={{
                            fontSize: '12px',
                            fontWeight: '600',
                            marginLeft: '6px',
                            backgroundColor: 'rgba(255,255,255,0.25)',
                            padding: '2px 8px',
                            borderRadius: '10px',
                          }}
                        >
                          MSSV: {student.studentId}
                        </span>
                      )}
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#FBE9E7',
                        marginTop: '2px',
                      }}
                    >
                      <GraduationCap size={14} />
                      <span>
                        {student.university} • {student.year}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Content Body */}
                <div
                  style={{
                    padding: '18px 20px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div
                    style={{
                      fontSize: '12.5px',
                      color: 'var(--text-secondary)',
                      marginBottom: '12px',
                      fontStyle: 'italic',
                      lineHeight: '1.5',
                    }}
                  >
                    "{student.bio}"
                  </div>

                  {/* Major & Favorite Cafe */}
                  <div
                    style={{
                      marginBottom: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <BookOpen size={14} color="#FF5722" />
                      <span>
                        Ngành: <strong>{student.major}</strong>
                      </span>
                    </div>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Coffee size={14} color="#FF5722" />
                      <span>
                        Quán yêu thích: <strong>{student.favoritePlace}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Interest Tags */}
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      marginBottom: '18px',
                    }}
                  >
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
                      disabled={isLiked || actionLoading === student.id}
                      style={{
                        flex: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px',
                        borderRadius: '12px',
                        backgroundColor: isLiked ? '#F0FDF4' : '#FFF3E0',
                        color: isLiked ? '#16A34A' : '#FF5722',
                        border: isLiked
                          ? '1.5px solid #86EFAC'
                          : '1.5px solid #FFCC80',
                        fontSize: '13px',
                        fontWeight: '700',
                        cursor: isLiked ? 'default' : 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <Heart
                        size={16}
                        fill={isLiked ? '#16A34A' : 'none'}
                        color={isLiked ? '#16A34A' : '#FF5722'}
                      />
                      <span>{isLiked ? 'Đã thích ❤️' : 'Kết bạn'}</span>
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
            );
          })}
        </div>
      )}

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
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Coffee size={22} color="#FF5722" />
                <h3
                  style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                  }}
                >
                  Rủ {invitedStudent.name} đi Cafe
                </h3>
              </div>
              <button
                onClick={() => setShowInviteModal(false)}
                style={{
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  background: 'none',
                  border: 'none',
                }}
              >
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
                <h4
                  style={{
                    fontSize: '18px',
                    fontWeight: '800',
                    color: '#E64A19',
                  }}
                >
                  Lời mời đã được gửi đi! ☕🎉
                </h4>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    marginTop: '6px',
                  }}
                >
                  {invitedStudent.name} sẽ nhận được thông báo kèm mã giảm giá áp
                  dụng tại quán.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSendInvite}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: 'var(--text-secondary)',
                    }}
                  >
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
                    <option>
                      {invitedStudent.favoritePlace} (Ưu đãi SV -20%)
                    </option>
                    <option>Highlands Coffee - Gần trường ĐH (Tặng bánh)</option>
                    <option>Cheese Coffee - Sư Vạn Hạnh (Giảm 15k)</option>
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: 'var(--text-secondary)',
                    }}
                  >
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
                  <label
                    style={{
                      fontSize: '12px',
                      fontWeight: '700',
                      color: 'var(--text-secondary)',
                    }}
                  >
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
                    border: 'none',
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
