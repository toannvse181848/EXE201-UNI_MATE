import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { onboardingApi } from '../services/api';

// ── Constants ────────────────────────────────────────────────────────────────
const OBJECTIVES = [
  { id: 'study_buddy', emoji: '📚', label: 'Tìm bạn học bài', desc: 'Body-doubling, cùng cày deadline, ôn thi' },
  { id: 'project',    emoji: '💻', label: 'Tìm teammate đồ án', desc: 'Hackathon, Assignment, Khởi nghiệp' },
  { id: 'certificate', emoji: '🎯', label: 'Luyện chứng chỉ', desc: 'IELTS, TOEIC, JLPT, chứng chỉ chuyên môn' },
  { id: 'hangout',    emoji: '☕', label: 'Đi cafe chill', desc: 'Khám phá quán mới, mở rộng kết nối' },
  { id: 'activities', emoji: '🏃', label: 'Thể thao & Hoạt động', desc: 'Cầu lông, chạy bộ, boardgame' },
];

const INTEREST_CATEGORIES = [
  {
    title: '📖 Học tập & Kỹ năng',
    tags: [
      { id: 'coding', label: '💻 Lập trình' },
      { id: 'ai_ml', label: '🤖 AI / Machine Learning' },
      { id: 'uiux', label: '🎨 Thiết kế UI/UX' },
      { id: 'finance', label: '💹 Tài chính & Đầu tư' },
      { id: 'marketing', label: '📣 Marketing' },
      { id: 'ielts', label: '🇬🇧 IELTS / TOEIC' },
      { id: 'data', label: '📊 Data Science' },
      { id: 'blockchain', label: '🔗 Blockchain' },
    ],
  },
  {
    title: '🌿 Đời sống & Sở thích',
    tags: [
      { id: 'cafe', label: '☕ Cafe chill' },
      { id: 'reading', label: '📚 Đọc sách' },
      { id: 'indie', label: '🎵 Nhạc indie' },
      { id: 'film_photo', label: '📷 Chụp ảnh film' },
      { id: 'travel', label: '✈️ Du lịch bụi' },
      { id: 'foodie', label: '🍜 Khám phá ẩm thực' },
      { id: 'gaming', label: '🎮 Gaming' },
      { id: 'boardgame', label: '🎲 Boardgame' },
      { id: 'podcast', label: '🎙️ Podcast' },
    ],
  },
  {
    title: '⚡ Thể thao & Năng lượng',
    tags: [
      { id: 'running', label: '🏃 Chạy bộ' },
      { id: 'gym', label: '💪 Gym & Fitness' },
      { id: 'badminton', label: '🏸 Cầu lông' },
      { id: 'billiards', label: '🎱 Billiards' },
      { id: 'yoga', label: '🧘 Yoga' },
      { id: 'football', label: '⚽ Bóng đá' },
    ],
  },
];

const TIME_SLOTS = [
  { id: 'morning',   emoji: '🌅', label: 'Buổi sáng', sub: '7h – 12h' },
  { id: 'afternoon', emoji: '☀️', label: 'Buổi chiều', sub: '13h – 18h' },
  { id: 'evening',   emoji: '🌙', label: 'Buổi tối', sub: '18h – 22h' },
  { id: 'weekend',   emoji: '🎉', label: 'Cuối tuần', sub: 'Thứ 7 & Chủ nhật' },
];

const SPACE_TYPES = [
  { id: 'quiet', emoji: '🤫', label: 'Yên tĩnh tuyệt đối', desc: 'Tập trung cao độ, đeo tai nghe' },
  { id: 'social', emoji: '🎵', label: 'Năng động & Chill', desc: 'Vừa học vừa có thể trò chuyện' },
  { id: 'any',   emoji: '🌈', label: 'Thoải mái cả 2', desc: 'Không có yêu cầu cụ thể' },
];

const DISTANCE_OPTIONS = [
  { value: 3,  label: 'Rất gần', desc: '< 3 km', icon: '📍' },
  { value: 5,  label: 'Gần',     desc: '< 5 km', icon: '🗺️' },
  { value: 10, label: 'Xa hơn', desc: '< 10 km', icon: '🌏' },
];

// ── Styles ───────────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #FFF8F6 0%, #FFF3E0 100%)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    padding: '40px 16px 60px',
    fontFamily: 'Inter, system-ui, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '620px',
    background: '#FFFFFF',
    borderRadius: '24px',
    boxShadow: '0 20px 60px -10px rgba(255,87,34,0.12), 0 0 1px rgba(0,0,0,0.06)',
    padding: '40px 36px',
  },
  // Progress bar
  progressWrap: { display: 'flex', gap: '8px', marginBottom: '32px' },
  progressSegment: (active, done) => ({
    flex: 1,
    height: '5px',
    borderRadius: '99px',
    background: done || active ? '#FF5722' : '#E7E5E4',
    transition: 'background 0.3s ease',
  }),
  // Header
  stepLabel: { fontSize: '12px', fontWeight: '700', color: '#FF5722', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '8px' },
  title: { fontSize: '24px', fontWeight: '900', color: '#1C1917', letterSpacing: '-0.5px', marginBottom: '6px' },
  subtitle: { fontSize: '14px', color: '#78716C', marginBottom: '28px', lineHeight: '1.6' },
  // Objective / Space cards
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' },
  objCard: (selected) => ({
    padding: '16px',
    borderRadius: '16px',
    border: `2px solid ${selected ? '#FF5722' : '#E7E5E4'}`,
    background: selected ? '#FFF3E0' : '#FAFAF9',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    boxShadow: selected ? '0 4px 12px rgba(255,87,34,0.12)' : 'none',
  }),
  objEmoji: { fontSize: '26px', lineHeight: 1 },
  objLabel: (selected) => ({ fontSize: '13px', fontWeight: '800', color: selected ? '#BF360C' : '#1C1917' }),
  objDesc: { fontSize: '11px', color: '#A8A29E', lineHeight: '1.4' },
  // Interest tags
  tagCloud: { display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '4px' },
  tag: (selected) => ({
    padding: '7px 14px',
    borderRadius: '99px',
    border: `1.5px solid ${selected ? '#FF5722' : '#E7E5E4'}`,
    background: selected ? '#FF5722' : '#FAFAF9',
    color: selected ? '#FFFFFF' : '#44403C',
    fontSize: '13px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    userSelect: 'none',
  }),
  catTitle: { fontSize: '13px', fontWeight: '800', color: '#44403C', marginBottom: '10px', marginTop: '20px' },
  minBadge: (ok) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '5px',
    padding: '4px 12px',
    borderRadius: '99px',
    background: ok ? '#DCFCE7' : '#FEF9C3',
    color: ok ? '#166534' : '#713F12',
    fontSize: '12px',
    fontWeight: '700',
    marginBottom: '20px',
  }),
  // Time slots
  timeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' },
  timeCard: (selected) => ({
    padding: '14px',
    borderRadius: '14px',
    border: `2px solid ${selected ? '#FF5722' : '#E7E5E4'}`,
    background: selected ? '#FFF3E0' : '#FAFAF9',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    transition: 'all 0.15s ease',
    boxShadow: selected ? '0 4px 12px rgba(255,87,34,0.1)' : 'none',
  }),
  timeEmoji: { fontSize: '22px' },
  timeLabelWrap: { display: 'flex', flexDirection: 'column' },
  timeLabel: (selected) => ({ fontSize: '13px', fontWeight: '700', color: selected ? '#BF360C' : '#1C1917' }),
  timeSub: { fontSize: '11px', color: '#A8A29E' },
  // Space type cards
  spaceGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '20px' },
  spaceCard: (selected) => ({
    padding: '14px 10px',
    borderRadius: '14px',
    border: `2px solid ${selected ? '#FF5722' : '#E7E5E4'}`,
    background: selected ? '#FFF3E0' : '#FAFAF9',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
    boxShadow: selected ? '0 4px 12px rgba(255,87,34,0.1)' : 'none',
  }),
  sectionLabel: { fontSize: '14px', fontWeight: '800', color: '#1C1917', marginBottom: '10px' },
  // Distance
  distRow: { display: 'flex', gap: '10px', marginBottom: '24px' },
  distBtn: (selected) => ({
    flex: 1,
    padding: '14px 8px',
    borderRadius: '14px',
    border: `2px solid ${selected ? '#FF5722' : '#E7E5E4'}`,
    background: selected ? '#FF5722' : '#FAFAF9',
    color: selected ? '#FFF' : '#44403C',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.15s ease',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '3px',
    boxShadow: selected ? '0 4px 12px rgba(255,87,34,0.2)' : 'none',
  }),
  // Navigation buttons
  navRow: { display: 'flex', gap: '12px', marginTop: '32px' },
  btnBack: {
    padding: '14px 24px',
    borderRadius: '14px',
    border: '1.5px solid #E7E5E4',
    background: '#FAFAF9',
    color: '#44403C',
    fontSize: '14px',
    fontWeight: '700',
    cursor: 'pointer',
  },
  btnNext: (disabled) => ({
    flex: 1,
    padding: '14px 24px',
    borderRadius: '14px',
    border: 'none',
    background: disabled ? '#E7E5E4' : 'linear-gradient(135deg, #FF5722, #FF7043)',
    color: disabled ? '#A8A29E' : '#FFFFFF',
    fontSize: '15px',
    fontWeight: '800',
    cursor: disabled ? 'not-allowed' : 'pointer',
    boxShadow: disabled ? 'none' : '0 8px 20px rgba(255,87,34,0.3)',
    transition: 'all 0.2s ease',
    letterSpacing: '-0.2px',
  }),
  // Success screen
  successWrap: { textAlign: 'center', padding: '20px 0' },
  successIcon: { fontSize: '64px', marginBottom: '16px' },
  successTitle: { fontSize: '28px', fontWeight: '900', color: '#1C1917', marginBottom: '8px' },
  successSub: { fontSize: '14px', color: '#78716C', lineHeight: '1.6', marginBottom: '24px' },
  statRow: { display: 'flex', gap: '12px', marginBottom: '28px' },
  statBox: (color) => ({
    flex: 1,
    padding: '16px',
    borderRadius: '16px',
    background: color + '15',
    border: `1px solid ${color}30`,
    textAlign: 'center',
  }),
  statNum: (color) => ({ fontSize: '28px', fontWeight: '900', color }),
  statLbl: { fontSize: '11px', color: '#78716C', fontWeight: '600' },
};

// ── Component ────────────────────────────────────────────────────────────────
export default function Onboarding() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [step, setStep] = useState(1); // 1 | 2 | 3 | 4 (success)
  const [loading, setLoading] = useState(false);

  // Step 1 state
  const [objectives, setObjectives] = useState([]);
  // Step 2 state
  const [interests, setInterests] = useState([]);
  // Step 3 state
  const [timeSlots, setTimeSlots] = useState([]);
  const [spaceType, setSpaceType] = useState('any');
  const [distance, setDistance] = useState(5);
  const [bio, setBio] = useState('');

  const toggleObjective = (id) => {
    setObjectives((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleInterest = (id) => {
    setInterests((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };
  const toggleTimeSlot = (id) => {
    setTimeSlots((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await onboardingApi.savePreferences({
        objectives,
        interests,
        studyHabits: { timeSlots, spaceType },
        distancePreference: distance,
        bio: bio.trim() || undefined,
      });
      // Update AuthContext with new data
      if (typeof updateUser === 'function') updateUser(result.data);
      setStep(4); // success screen
    } catch (err) {
      alert('Lưu thất bại: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const isDone = (s) => s < step;

  return (
    <div style={S.page}>
      <div style={S.card}>
        {/* Progress bar */}
        {step < 4 && (
          <div style={S.progressWrap}>
            {[1, 2, 3].map((s) => (
              <div key={s} style={S.progressSegment(step === s, isDone(s))} />
            ))}
          </div>
        )}

        {/* ── STEP 1: Mục tiêu kết nối ── */}
        {step === 1 && (
          <>
            <div style={S.stepLabel}>Bước 1 / 3</div>
            <h1 style={S.title}>Bạn muốn kết nối vì điều gì? 🎯</h1>
            <p style={S.subtitle}>Chọn 1 hoặc nhiều mục tiêu. Thuật toán sẽ ưu tiên ghép đôi bạn với người có cùng định hướng.</p>

            <div style={S.grid2}>
              {OBJECTIVES.map((obj) => {
                const selected = objectives.includes(obj.id);
                return (
                  <div key={obj.id} id={`obj-${obj.id}`} style={S.objCard(selected)} onClick={() => toggleObjective(obj.id)}>
                    <div style={S.objEmoji}>{obj.emoji}</div>
                    <div style={S.objLabel(selected)}>{obj.label}</div>
                    <div style={S.objDesc}>{obj.desc}</div>
                  </div>
                );
              })}
            </div>

            <div style={S.navRow}>
              <button style={S.btnNext(objectives.length === 0)} disabled={objectives.length === 0} onClick={() => setStep(2)}>
                Tiếp theo →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 2: Sở thích & Tags ── */}
        {step === 2 && (
          <>
            <div style={S.stepLabel}>Bước 2 / 3</div>
            <h1 style={S.title}>Sở thích & Tag cá nhân 🏷️</h1>
            <p style={S.subtitle}>Chọn tối thiểu 3 tags. UNI-MATE dùng AI để tìm người có sở thích trùng khớp cao nhất với bạn.</p>

            <div style={S.minBadge(interests.length >= 3)}>
              {interests.length >= 3 ? '✅' : '⚠️'} Đã chọn {interests.length} / 3+ tags
            </div>

            {INTEREST_CATEGORIES.map((cat) => (
              <div key={cat.title}>
                <div style={S.catTitle}>{cat.title}</div>
                <div style={S.tagCloud}>
                  {cat.tags.map((t) => {
                    const sel = interests.includes(t.id);
                    return (
                      <span key={t.id} id={`tag-${t.id}`} style={S.tag(sel)} onClick={() => toggleInterest(t.id)}>
                        {t.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ))}

            <div style={S.navRow}>
              <button style={S.btnBack} onClick={() => setStep(1)}>← Quay lại</button>
              <button style={S.btnNext(interests.length < 3)} disabled={interests.length < 3} onClick={() => setStep(3)}>
                Tiếp theo →
              </button>
            </div>
          </>
        )}

        {/* ── STEP 3: Thói quen học tập ── */}
        {step === 3 && (
          <>
            <div style={S.stepLabel}>Bước 3 / 3</div>
            <h1 style={S.title}>Thói quen học tập ☕</h1>
            <p style={S.subtitle}>Giúp chúng tôi ghép bạn với người có lịch trình phù hợp để việc hẹn gặp dễ dàng hơn.</p>

            <div style={S.sectionLabel}>🕐 Khung giờ thường hay ra ngoài học</div>
            <div style={S.timeGrid}>
              {TIME_SLOTS.map((t) => {
                const sel = timeSlots.includes(t.id);
                return (
                  <div key={t.id} id={`time-${t.id}`} style={S.timeCard(sel)} onClick={() => toggleTimeSlot(t.id)}>
                    <div style={S.timeEmoji}>{t.emoji}</div>
                    <div style={S.timeLabelWrap}>
                      <div style={S.timeLabel(sel)}>{t.label}</div>
                      <div style={S.timeSub}>{t.sub}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div style={S.sectionLabel}>🎚️ Gu không gian học tập</div>
            <div style={S.spaceGrid}>
              {SPACE_TYPES.map((s) => {
                const sel = spaceType === s.id;
                return (
                  <div key={s.id} id={`space-${s.id}`} style={S.spaceCard(sel)} onClick={() => setSpaceType(s.id)}>
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{s.emoji}</div>
                    <div style={{ fontSize: '12px', fontWeight: '800', color: sel ? '#BF360C' : '#1C1917', marginBottom: '4px' }}>{s.label}</div>
                    <div style={{ fontSize: '11px', color: '#A8A29E' }}>{s.desc}</div>
                  </div>
                );
              })}
            </div>

            <div style={S.sectionLabel}>📍 Bán kính muốn gặp mặt</div>
            <div style={S.distRow}>
              {DISTANCE_OPTIONS.map((d) => {
                const sel = distance === d.value;
                return (
                  <div key={d.value} id={`dist-${d.value}`} style={S.distBtn(sel)} onClick={() => setDistance(d.value)}>
                    <div style={{ fontSize: '20px' }}>{d.icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '800' }}>{d.label}</div>
                    <div style={{ fontSize: '11px', opacity: 0.8 }}>{d.desc}</div>
                  </div>
                );
              })}
            </div>

            <div style={S.sectionLabel}>✍️ Giới thiệu ngắn (tùy chọn)</div>
            <textarea
              id="bio-input"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={200}
              placeholder="Ví dụ: Mình đang tìm bạn cùng cày LeetCode và khám phá những quán cafe yên tĩnh khu Thủ Đức 🚀"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: '14px',
                border: '1.5px solid #E7E5E4',
                fontSize: '13px',
                color: '#1C1917',
                resize: 'none',
                outline: 'none',
                fontFamily: 'Inter, sans-serif',
                lineHeight: '1.5',
                minHeight: '84px',
                boxSizing: 'border-box',
                marginBottom: '4px',
              }}
            />
            <div style={{ textAlign: 'right', fontSize: '11px', color: '#A8A29E', marginBottom: '8px' }}>{bio.length}/200</div>

            <div style={S.navRow}>
              <button style={S.btnBack} onClick={() => setStep(2)}>← Quay lại</button>
              <button
                id="btn-finish-onboarding"
                style={S.btnNext(loading)}
                disabled={loading}
                onClick={handleSubmit}
              >
                {loading ? 'Đang lưu...' : '🎉 Hoàn thành & Khám phá ngay'}
              </button>
            </div>
          </>
        )}

        {/* ── STEP 4: Success screen ── */}
        {step === 4 && (
          <div style={S.successWrap}>
            <div style={S.successIcon}>🎉</div>
            <h1 style={S.successTitle}>Hồ sơ đã sẵn sàng!</h1>
            <p style={S.successSub}>
              Thuật toán UNI-MATE đã ghi nhận sở thích của bạn.<br />
              Chúng tôi sẽ gợi ý những bạn học <strong>hợp gu nhất</strong> ngay bây giờ!
            </p>

            <div style={S.statRow}>
              <div style={S.statBox('#FF5722')}>
                <div style={S.statNum('#FF5722')}>{objectives.length}</div>
                <div style={S.statLbl}>Mục tiêu kết nối</div>
              </div>
              <div style={S.statBox('#F59E0B')}>
                <div style={S.statNum('#F59E0B')}>{interests.length}</div>
                <div style={S.statLbl}>Tags sở thích</div>
              </div>
              <div style={S.statBox('#10B981')}>
                <div style={S.statNum('#10B981')}>{timeSlots.length || '∞'}</div>
                <div style={S.statLbl}>Khung giờ rảnh</div>
              </div>
            </div>

            <button
              id="btn-go-discover"
              onClick={() => navigate('/user/discover')}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                border: 'none',
                background: 'linear-gradient(135deg, #FF5722, #FF7043)',
                color: '#FFF',
                fontSize: '16px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(255,87,34,0.3)',
                letterSpacing: '-0.3px',
              }}
            >
              🔥 Khám phá bạn học ngay →
            </button>

            <button
              onClick={() => navigate('/user/discover')}
              style={{
                marginTop: '12px',
                background: 'none',
                border: 'none',
                color: '#A8A29E',
                fontSize: '13px',
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Bỏ qua, vào trang chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
