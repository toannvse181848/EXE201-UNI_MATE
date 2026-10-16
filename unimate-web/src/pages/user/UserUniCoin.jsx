import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Coins,
  CalendarCheck,
  QrCode,
  Flame,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Gift,
  ArrowRight,
  Sparkles,
  Coffee,
  Check,
  AlertCircle,
  RefreshCw,
  Award,
  ChevronRight,
  Camera,
  Info
} from 'lucide-react';
import { coinApi, venueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import QRCheckinModal from '../../components/user/QRCheckinModal';

export default function UserUniCoin() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [coinStatus, setCoinStatus] = useState(null);
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState(null);
  const [submittingVenue, setSubmittingVenue] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'success' | 'error', text: '' }
  const [showQRModal, setShowQRModal] = useState(false);
  const [manualCode, setManualCode] = useState('');

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const res = await coinApi.getStatus();
      if (res?.success && res?.data) {
        setCoinStatus(res.data);
        // Đồng bộ lại coin trong Auth context
        if (res.data.uniCoin !== undefined && user?.uniCoin !== res.data.uniCoin) {
          updateUser({ uniCoin: res.data.uniCoin });
        }
      }
    } catch (err) {
      console.error('Lỗi lấy thông tin UniCoin:', err);
    } finally {
      setLoading(false);
    }
  }, [updateUser, user?.uniCoin]);

  const fetchVenues = useCallback(async () => {
    try {
      const res = await venueApi.getAll({ limit: 6 });
      if (res?.data?.venues) {
        setVenues(res.data.venues);
        if (res.data.venues.length > 0) {
          setSelectedVenue(res.data.venues[0]);
        }
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách quán cafe:', err);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    fetchVenues();
  }, [fetchStatus, fetchVenues]);

  // Xử lý Điểm danh hằng ngày
  const handleDailyCheckin = async () => {
    if (submittingCheckin) return;
    try {
      setSubmittingCheckin(true);
      setMessage(null);
      const res = await coinApi.dailyCheckin();
      if (res?.success) {
        setMessage({
          type: 'success',
          text: res.message || `Điểm danh thành công! +${res.data?.coinEarned} UniCoin`,
        });
        if (res.data?.uniCoin !== undefined) {
          updateUser({ uniCoin: res.data.uniCoin });
        }
        await fetchStatus();
      }
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Điểm danh thất bại. Vui lòng thử lại!';
      setMessage({ type: 'error', text: errorMsg });
    } finally {
      setSubmittingCheckin(false);
    }
  };

  // Xử lý Check-in quán cafe qua mã QR & vị trí GPS
  const handleVenueCheckin = (venueToUse) => {
    if (venueToUse) {
      setSelectedVenue(venueToUse);
    }
    setShowQRModal(true);
  };

  // Tính chuỗi streak 7 ngày
  const currentStreak = coinStatus?.currentStreak || 0;
  const streakDays = [
    { day: 1, coin: 10, bonus: null },
    { day: 2, coin: 10, bonus: null },
    { day: 3, coin: 10, bonus: '+5 🔥' },
    { day: 4, coin: 10, bonus: null },
    { day: 5, coin: 10, bonus: null },
    { day: 6, coin: 10, bonus: null },
    { day: 7, coin: 10, bonus: '+15 🔥🔥' },
  ];

  const earnedToday = coinStatus?.earnedToday ?? 0;
  const maxDaily = coinStatus?.maxDailyEarn ?? 60;
  const venueCountToday = coinStatus?.venueCheckinsToday ?? 0;
  const maxVenueToday = coinStatus?.maxVenueCheckinsPerDay ?? 2;
  const canCheckinToday = coinStatus?.canCheckinToday ?? true;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      {/* Thông báo Alert */}
      {message && (
        <div
          style={{
            marginBottom: '20px',
            padding: '14px 20px',
            borderRadius: '14px',
            backgroundColor: message.type === 'success' ? '#ECFDF5' : '#FEF2F2',
            border: `1.5px solid ${message.type === 'success' ? '#10B981' : '#EF4444'}`,
            color: message.type === 'success' ? '#065F46' : '#991B1B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '700', fontSize: '14px' }}>
            {message.type === 'success' ? <CheckCircle2 size={20} color="#10B981" /> : <AlertCircle size={20} color="#EF4444" />}
            <span>{message.text}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: message.type === 'success' ? '#065F46' : '#991B1B',
              fontWeight: '900',
              fontSize: '16px',
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* TOP HERO BANNER: TỔNG SỐ DƯ & TIẾN ĐỘ CHỐNG LẠM PHÁT */}
      <div
        style={{
          background: 'linear-gradient(135deg, #1E1B4B 0%, #312E81 50%, #4338CA 100%)',
          borderRadius: '24px',
          padding: '32px',
          color: '#FFFFFF',
          marginBottom: '24px',
          boxShadow: '0 12px 30px rgba(67, 56, 202, 0.25)',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Glow decoration */}
        <div
          style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '200px',
            height: '200px',
            background: 'radial-gradient(circle, rgba(245, 158, 11, 0.35) 0%, transparent 70%)',
            borderRadius: '50%',
            pointerEvents: 'none',
          }}
        />

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <span
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                backdropFilter: 'blur(10px)',
                padding: '4px 12px',
                borderRadius: '20px',
                fontSize: '12px',
                fontWeight: '700',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Sparkles size={14} color="#FDE047" /> Ví Thưởng Uni-Mate
            </span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: '900', margin: '0 0 8px 0', lineHeight: '1.2' }}>
            Điểm UniCoin của bạn
          </h1>
          <p style={{ fontSize: '14px', color: '#C7D2FE', margin: '0 0 20px 0', maxWidth: '420px', lineHeight: '1.5' }}>
            Tích lũy điểm khi hoạt động, điểm danh mỗi ngày và check-in không gian học cafe đối tác để đổi voucher đồ uống & tài khoản Premium!
          </p>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <div
              style={{
                fontSize: '44px',
                fontWeight: '900',
                color: '#FBBF24',
                letterSpacing: '-1px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <Coins size={38} color="#F59E0B" />
              <span>{coinStatus?.uniCoin ?? user?.uniCoin ?? 0}</span>
            </div>
            <span style={{ fontSize: '16px', fontWeight: '700', color: '#FDE68A' }}>UniCoin</span>
          </div>
        </div>

        {/* Cột thống kê giới hạn ngày (Anti-Inflation Shield) */}
        <div
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(16px)',
            borderRadius: '20px',
            padding: '22px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={18} color="#FDE047" />
              <span style={{ fontSize: '13px', fontWeight: '800', color: '#FFFFFF' }}>Hạn mức kiếm hôm nay</span>
            </div>
            <span style={{ fontSize: '12px', color: '#A5B4FC', fontWeight: '700' }}>
              {earnedToday} / {maxDaily} Coin
            </span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              overflow: 'hidden',
              marginBottom: '10px',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, (earnedToday / maxDaily) * 100)}%`,
                height: '100%',
                backgroundColor: earnedToday >= maxDaily ? '#EF4444' : '#F59E0B',
                borderRadius: '6px',
                transition: 'width 0.4s ease',
              }}
            />
          </div>

          <div style={{ fontSize: '11px', color: '#C7D2FE', lineHeight: '1.4', marginBottom: '16px' }}>
            {earnedToday >= maxDaily ? (
              <span style={{ color: '#FCA5A5', fontWeight: '700' }}>
                🎉 Bạn đã đạt mức tối đa 60 Coin hôm nay! Hãy quay lại vào ngày mai nhé.
              </span>
            ) : (
              `Bạn còn có thể kiếm tối đa ${maxDaily - earnedToday} UniCoin nữa trong hôm nay.`
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => navigate('/user/vouchers')}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: '#F59E0B',
                color: '#1E1B4B',
                fontWeight: '800',
                fontSize: '13px',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <Gift size={16} /> Đổi Voucher ngay
            </button>
            <button
              onClick={fetchStatus}
              title="Làm mới điểm"
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>
      </div>

      {/* 2 MAIN CARDS: ĐIỂM DANH HÀNG NGÀY & QUÉT QR CHECK-IN */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(330px, 1fr))', gap: '24px', marginBottom: '32px' }}>
        {/* CARD 1: ĐIỂM DANH HÀNG NGÀY (DAILY CHECK-IN) */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: '#FEF3C7',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#D97706',
                  }}
                >
                  <CalendarCheck size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1E293B' }}>
                    Điểm danh hằng ngày
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Duy trì chuỗi streak để nhận thưởng lớn</div>
                </div>
              </div>

              {/* Badge Streak */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#FFF7ED',
                  border: '1px solid #FFEDD5',
                  padding: '6px 12px',
                  borderRadius: '20px',
                }}
              >
                <Flame size={16} color="#EA580C" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#EA580C' }}>
                  {currentStreak} Ngày
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '20px' }}>
              Mỗi ngày đăng nhập và điểm danh nhận <strong>+10 UniCoin</strong>. Đạt mốc liên tiếp <strong>3 ngày (+5)</strong> và <strong>7 ngày (+15)</strong> sẽ nhận thêm thưởng lớn!
            </p>

            {/* Streak Timeline 7 ngày */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px', marginBottom: '24px' }}>
              {streakDays.map((st) => {
                const isPassed = currentStreak >= st.day;
                const isToday = currentStreak + 1 === st.day && canCheckinToday;
                return (
                  <div
                    key={st.day}
                    style={{
                      textAlign: 'center',
                      padding: '10px 4px',
                      borderRadius: '12px',
                      backgroundColor: isPassed ? '#ECFDF5' : isToday ? '#FFFBEB' : '#F8FAFC',
                      border: `1.5px solid ${isPassed ? '#10B981' : isToday ? '#F59E0B' : '#E2E8F0'}`,
                      position: 'relative',
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '700', marginBottom: '4px' }}>
                      N{st.day}
                    </div>
                    <div
                      style={{
                        fontSize: '13px',
                        fontWeight: '900',
                        color: isPassed ? '#059669' : isToday ? '#D97706' : '#94A3B8',
                      }}
                    >
                      +{st.coin}
                    </div>
                    {st.bonus && (
                      <div
                        style={{
                          fontSize: '9px',
                          color: '#DC2626',
                          fontWeight: '800',
                          marginTop: '2px',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {st.bonus}
                      </div>
                    )}
                    {isPassed && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '-6px',
                          right: '-6px',
                          backgroundColor: '#10B981',
                          borderRadius: '50%',
                          width: '16px',
                          height: '16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#fff',
                        }}
                      >
                        <Check size={10} strokeWidth={3} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action button */}
          <button
            onClick={handleDailyCheckin}
            disabled={!canCheckinToday || submittingCheckin || earnedToday >= maxDaily}
            style={{
              width: '100%',
              padding: '14px',
              borderRadius: '16px',
              backgroundColor: !canCheckinToday ? '#E2E8F0' : '#10B981',
              color: !canCheckinToday ? '#64748B' : '#FFFFFF',
              fontWeight: '800',
              fontSize: '15px',
              border: 'none',
              cursor: !canCheckinToday ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: canCheckinToday ? '0 4px 14px rgba(16, 185, 129, 0.35)' : 'none',
              transition: 'all 0.2s',
            }}
          >
            {submittingCheckin ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Đang ghi nhận...
              </>
            ) : !canCheckinToday ? (
              <>
                <CheckCircle2 size={18} color="#10B981" /> Đã điểm danh hôm nay!
              </>
            ) : (
              <>
                <CalendarCheck size={18} /> Điểm danh ngay (+10 Coin)
              </>
            )}
          </button>
        </div>

        {/* CARD 2: QUÉT QR CHECK-IN TẠI QUÁN CAFE HỌC TẬP */}
        <div
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '24px',
            padding: '28px',
            border: '1px solid #E2E8F0',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '46px',
                    height: '46px',
                    borderRadius: '14px',
                    backgroundColor: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                  }}
                >
                  <QrCode size={24} />
                </div>
                <div>
                  <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1E293B' }}>
                    Quét QR Check-in Quán
                  </h2>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>Thưởng khi học nhóm tại đối tác</div>
                </div>
              </div>

              {/* Giới hạn quán / ngày */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  backgroundColor: '#F0FDF4',
                  border: '1px solid #DCFCE7',
                  padding: '6px 12px',
                  borderRadius: '20px',
                }}
              >
                <Coffee size={16} color="#16A34A" />
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#16A34A' }}>
                  {venueCountToday}/{maxVenueToday} Quán hôm nay
                </span>
              </div>
            </div>

            <p style={{ fontSize: '13px', color: '#475569', lineHeight: '1.5', marginBottom: '16px' }}>
              Ghé quán cafe / coworking đối tác Uni-Mate, quét mã QR đặt tại bàn hoặc quầy thu ngân để nhận ngay <strong>+20 UniCoin / quán</strong>.
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                borderRadius: '16px',
                padding: '14px',
                border: '1px solid #E2E8F0',
                marginBottom: '20px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '700', color: '#475569', marginBottom: '8px' }}>
                Chọn quán đối tác bạn đang có mặt:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '140px', overflowY: 'auto' }}>
                {venues.length > 0 ? (
                  venues.slice(0, 4).map((v) => {
                    const isSelected = (selectedVenue?._id || selectedVenue?.id) === (v._id || v.id);
                    return (
                      <div
                        key={v._id || v.id}
                        onClick={() => setSelectedVenue(v)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: '10px',
                          backgroundColor: isSelected ? '#EFF6FF' : '#FFFFFF',
                          border: `1.5px solid ${isSelected ? '#3B82F6' : '#E2E8F0'}`,
                          cursor: 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Coffee size={14} color={isSelected ? '#2563EB' : '#64748B'} />
                          <span style={{ fontSize: '13px', fontWeight: '700', color: isSelected ? '#1E40AF' : '#1E293B' }}>
                            {v.name}
                          </span>
                        </div>
                        <span style={{ fontSize: '11px', color: '#10B981', fontWeight: '800' }}>+20 Coin</span>
                      </div>
                    );
                  })
                ) : (
                  <div style={{ fontSize: '12px', color: '#94A3B8', textAlign: 'center', padding: '10px' }}>
                    Đang tải danh sách quán đối tác...
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setShowQRModal(true)}
              disabled={venueCountToday >= maxVenueToday || earnedToday >= maxDaily}
              style={{
                flex: 1,
                padding: '14px',
                borderRadius: '16px',
                backgroundColor: venueCountToday >= maxVenueToday ? '#E2E8F0' : '#2563EB',
                color: venueCountToday >= maxVenueToday ? '#64748B' : '#FFFFFF',
                fontWeight: '800',
                fontSize: '14px',
                border: 'none',
                cursor: venueCountToday >= maxVenueToday ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: venueCountToday < maxVenueToday ? '0 4px 14px rgba(37, 99, 235, 0.35)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              <Camera size={18} /> Quét mã QR tại quán
            </button>
            <button
              onClick={() => handleVenueCheckin(selectedVenue)}
              disabled={!selectedVenue || venueCountToday >= maxVenueToday || submittingVenue || earnedToday >= maxDaily}
              title="Mô phỏng check-in nhanh"
              style={{
                padding: '14px 18px',
                borderRadius: '16px',
                backgroundColor: '#F1F5F9',
                color: '#334155',
                fontWeight: '800',
                fontSize: '13px',
                border: '1px solid #CBD5E1',
                cursor: venueCountToday >= maxVenueToday ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              {submittingVenue ? <RefreshCw size={16} className="animate-spin" /> : 'Check-in'}
            </button>
          </div>
        </div>
      </div>

      {/* MODAL QUÉT QR CODE DÁN TẠI QUÁN + XÁC THỰC GPS */}
      <QRCheckinModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        onSuccess={(res) => {
          if (res?.data?.uniCoin !== undefined) {
            updateUser({ uniCoin: res.data.uniCoin });
          }
          fetchStatus();
        }}
      />

      {/* BẢNG CHÍNH SÁCH CHỐNG LẠM PHÁT & GIỮ CHÂN USER (TOKENOMICS) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
          marginBottom: '32px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <ShieldAlert size={22} color="#F59E0B" />
          <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1E293B' }}>
            Cơ chế Tích lũy & Giá trị UniCoin (Chống lạm phát)
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              Kiếm điểm mỗi ngày
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#1E293B', marginTop: '4px' }}>
              Tối đa 60 Coin/ngày
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
              Bao gồm điểm danh (10-25) + 2 lần check-in quán đối tác (tối đa 40). Chặn cày coin ảo, giữ giá trị voucher ổn định.
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              Quy đổi Voucher đồ uống
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
              50 – 200 Coin
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
              Chỉ cần 3 - 5 ngày duy trì thói quen học nhóm là có thể đổi được voucher giảm 10% - 25% tại các quán đối tác liên kết.
            </div>
          </div>

          <div style={{ padding: '16px', borderRadius: '16px', backgroundColor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
            <div style={{ fontSize: '12px', color: '#64748B', fontWeight: '700', textTransform: 'uppercase' }}>
              Đổi Gói Premium Tích Xanh
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#4F46E5', marginTop: '4px' }}>
              800 Coin / Tháng
            </div>
            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '6px', lineHeight: '1.4' }}>
              Sinh viên chăm chỉ hoạt động 2-3 tuần hoàn toàn có thể sở hữu tài khoản Premium tích xanh xịn xò mà không cần nạp tiền.
            </div>
          </div>
        </div>
      </div>

      {/* LỊCH SỬ BIẾN ĐỘNG ĐIỂM (COIN LOG) */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          padding: '28px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 4px 16px rgba(0,0,0,0.04)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Clock size={20} color="#64748B" />
            <h2 style={{ fontSize: '18px', fontWeight: '800', margin: 0, color: '#1E293B' }}>
              Lịch sử biến động UniCoin
            </h2>
          </div>
          <span style={{ fontSize: '12px', color: '#94A3B8', fontWeight: '600' }}>
            20 giao dịch gần nhất
          </span>
        </div>

        {coinStatus?.coinLog && coinStatus.coinLog.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {coinStatus.coinLog.map((log, idx) => {
              const isPositive = log.amount > 0;
              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    borderRadius: '14px',
                    backgroundColor: '#F8FAFC',
                    border: '1px solid #F1F5F9',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '10px',
                        backgroundColor: isPositive ? '#ECFDF5' : '#FEF2F2',
                        color: isPositive ? '#10B981' : '#EF4444',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '900',
                      }}
                    >
                      {isPositive ? '+' : '-'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1E293B' }}>
                        {log.description || (isPositive ? 'Cộng điểm UniCoin' : 'Dùng điểm UniCoin')}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {new Date(log.createdAt || Date.now()).toLocaleString('vi-VN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '900',
                      color: isPositive ? '#059669' : '#DC2626',
                    }}
                  >
                    {isPositive ? `+${log.amount}` : log.amount} Coin
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '36px 20px', color: '#94A3B8' }}>
            <Coins size={36} style={{ margin: '0 auto 10px auto', opacity: 0.5 }} />
            <div style={{ fontSize: '14px', fontWeight: '600' }}>Chưa có biến động điểm nào</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              Hãy bấm "Điểm danh ngay" hoặc check-in quán cafe để nhận những điểm UniCoin đầu tiên nhé!
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
