import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Heart,
  Coffee,
  Sparkles,
  MapPin,
  GraduationCap,
  BookOpen,
  Filter,
  CheckCircle2,
  Search,
  RefreshCw,
  Users,
} from 'lucide-react';
import { userApi, matchApi, onboardingApi } from '../../services/api';
import { trackEvent } from '../../utils/analytics';
import { formatStudentYear } from '../../constants/academic';
import { getAvatarUrl, DEFAULT_AVATAR } from '../../constants/avatar';
import { useAuth } from '../../context/AuthContext';


/**
 * Vị trí hiện tại để gợi ý theo khoảng cách thật. Chỉ lấy khi người dùng đã cho phép định vị
 * (không bật hộp xin quyền khi mở trang); lỗi / chưa cho phép → null, gợi ý vẫn chạy bình thường.
 */
const getCurrentCoords = async () => {
  try {
    if (!navigator.geolocation || !navigator.permissions) return null;
    const perm = await navigator.permissions.query({ name: 'geolocation' });
    if (perm.state !== 'granted') return null;
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { timeout: 4000, maximumAge: 10 * 60 * 1000 }
      );
    });
  } catch {
    return null;
  }
};

export default function UserDiscover() {
  const { user } = useAuth();
  const myUniversity = user?.university || '';
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUni, setSelectedUni] = useState('Tất cả các trường');
  const navigate = useNavigate();
  const [likedMap, setLikedMap] = useState({});
  // Bạn đã kết bạn: id người đó → matchId (để mở đúng cuộc trò chuyện và rủ cafe thật)
  const [friendMatchIds, setFriendMatchIds] = useState({});
  const [actionLoading, setActionLoading] = useState(null);

  // Tải danh sách sinh viên thật từ Backend MongoDB (ưu tiên thuật toán gợi ý matching)
  const fetchStudents = useCallback(async () => {
    try {
      setLoading(true);
      let realData = [];
      let isAlgorithm = false;

      // Ưu tiên gọi API Thuật toán Matching Weighted Hybrid
      try {
        const recoRes = await onboardingApi.getRecommendations(30, await getCurrentCoords());
        if (recoRes?.data && Array.isArray(recoRes.data) && recoRes.data.length > 0) {
          realData = recoRes.data;
          isAlgorithm = true;
        }
      } catch (recoErr) {
        console.log('Chưa đăng nhập hoặc chưa đủ dữ liệu matching, chuyển sang danh sách chung:', recoErr.message);
      }

      // Fallback sang API danh sách sinh viên cơ bản
      if (realData.length === 0) {
        const res = await userApi.getSuggestedStudents(30);
        realData = res.data || [];
      }

      if (realData.length > 0) {
        // Chỉ hiển thị thông tin thật người dùng đã điền — không tự đặt tuổi, ảnh, khoảng cách, điểm
        const formatted = realData.map((u) => {
          const profile = u.studentProfile || {};
          const isReco = isAlgorithm && u.matchPercentage !== undefined;
          const university = u.university || profile.university || '';

          return {
            id: u.id || u._id,
            name: u.name || u.fullName,
            university: university || 'Chưa cập nhật trường',
            // Cùng trường với mình (thông tin thật, thay cho khoảng cách ngẫu nhiên trước đây)
            sameSchool: Boolean(university && myUniversity && university === myUniversity),
            major: u.major || profile.major || '',
            year: u.year || profile.year || '',
            studentId: profile.studentId || u.studentId || '',
            avatar: u.avatar ? getAvatarUrl(u.avatar) : DEFAULT_AVATAR,
            isVerifiedStudent: Boolean(u.isVerifiedStudent || u.isPremium || profile.isVerifiedStudent || profile.isPremium),
            isPremium: Boolean(u.isPremium || profile.isPremium),
            // % hợp nhau chỉ có khi thuật toán gợi ý tính được
            matchPercentage: isReco ? u.matchPercentage : null,
            commonTags: u.commonTags || [],
            bio: u.bio || profile.bio || '',
            interests: u.interests?.length > 0 ? u.interests : profile.interests || [],
          };
        });
        setStudents(formatted);
      } else {
        setStudents([]);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách sinh viên:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [myUniversity]);

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

  useEffect(() => {
    matchApi
      .getMyMatches()
      .then((res) => {
        const map = {};
        (res?.data || []).forEach((m) => {
          if (m.buddy?.id) map[String(m.buddy.id)] = m.matchId;
        });
        setFriendMatchIds(map);
      })
      .catch(() => {});
  }, []);

  // Xử lý gửi lời thích / kết bạn qua API match thật
  const handleLike = async (student) => {
    try {
      setActionLoading(student.id);
      const res = await matchApi.swipe(student.id, 'like');
      setLikedMap((prev) => ({ ...prev, [student.id]: true }));
      trackEvent('friend_request_send');
      if (res.isMatch) trackEvent('friend_match', { source: 'discover' });

      if (res.isMatch) {
        if (res.data?._id) setFriendMatchIds((prev) => ({ ...prev, [String(student.id)]: res.data._id }));
        alert(`🎉 TUYỆT VỜI! Bạn và ${student.name} đều đã thích nhau! Hai bạn đã được kết bạn thành công, hãy vào mục Tin nhắn để trò chuyện và hẹn cafe nhé! ☕`);
      } else {
        alert(`💖 Đã gửi lượt thích đến ${student.name}! Khi bạn ấy thích lại, cả hai sẽ được kết bạn.`);
      }
    } catch (err) {
      // Lỗi thì báo lỗi (trước đây vẫn báo "đã gửi thành công" và đánh dấu đã thích)
      alert(`Chưa gửi được lời kết bạn: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
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
            <span>Kết bạn học tập & Cafe thông minh</span>
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
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))',
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
                  {/* Match Score Badge */}
                  {student.matchPercentage && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '14px',
                        right: '14px',
                        background: 'linear-gradient(135deg, #FF5722 0%, #FF9800 100%)',
                        color: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        fontSize: '11px',
                        fontWeight: '800',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        boxShadow: '0 2px 8px rgba(255, 87, 34, 0.45)',
                        zIndex: 2,
                      }}
                    >
                      <Sparkles size={12} color="#FFF" />
                      <span>{student.matchPercentage}% Hợp gu</span>
                    </div>
                  )}

                  {/* Distance Pill */}
                  {student.sameSchool && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '46px',
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
                      zIndex: 2,
                    }}
                  >
                    <MapPin size={12} color="#FFB74D" />
                    <span>Cùng trường với bạn</span>
                  </div>
                  )}

                  {/* Verified Trust Badge */}
                  {student.isVerifiedStudent && (
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
                    <span>Đã xác minh</span>
                  </div>
                  )}

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
                    <div style={{ fontSize: '19px', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span>{student.name}</span>
                      {student.isVerifiedStudent && (
                        <span title="Tài khoản Premium (Đã xác minh tích xanh)">
                          <CheckCircle2 size={17} color="#38BDF8" fill="#0284C7" />
                        </span>
                      )}
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
                        {student.university} • {formatStudentYear(student.year)}
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
                  {student.bio && (
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
                  )}

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
                        Ngành: <strong>{student.major || "Chưa cập nhật"}</strong>
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
                    {student.interests.map((tag) => {
                      const isCommon = student.commonTags?.some(
                        (c) => String(c).toLowerCase().trim() === String(tag).toLowerCase().trim()
                      );
                      return (
                        <span
                          key={tag}
                          style={{
                            fontSize: '11px',
                            fontWeight: isCommon ? '700' : '600',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            backgroundColor: isCommon ? '#FF5722' : '#FFF3E0',
                            color: isCommon ? '#FFFFFF' : '#E64A19',
                            border: isCommon ? '1px solid #FF5722' : '1px solid #FBE9E7',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '3px',
                            boxShadow: isCommon ? '0 2px 6px rgba(255, 87, 34, 0.25)' : 'none',
                          }}
                        >
                          {isCommon && <Sparkles size={11} color="#FFF" />}
                          #{tag}
                        </span>
                      );
                    })}
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

                    {friendMatchIds[String(student.id)] && (
                    <button
                      onClick={() => navigate(`/user/messages?matchId=${friendMatchIds[String(student.id)]}`)}
                      title="Mở khung chat để rủ bạn tới quán đối tác"
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
                    )}
                  </div>
                  {!friendMatchIds[String(student.id)] && (
                    <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '8px', textAlign: 'center' }}>
                      Hai bạn kết bạn xong là rủ đi cafe được, cả hai nhận ưu đãi của quán đối tác.
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
