import React, { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { userApi, authApi, orderApi } from '../../services/api';
import { trackEvent, getAnalyticsClientId } from '../../utils/analytics';
import usePremiumPlans, { PREMIUM_PLAN_LABEL, formatVnd } from '../../hooks/usePremiumPlans';
import { getAvatarUrl } from '../../constants/avatar';
import PaymentSuccess from '../../components/PaymentSuccess';
import OrderHistory from '../../components/OrderHistory';
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
  Crown,
  X,
  Zap,
  Copy,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';

import { MAJORS, ACADEMIC_YEARS, formatStudentYear } from '../../constants/academic';

// Khớp giới hạn độ dài họ tên ở backend (userController)
const FULL_NAME_MAX_LENGTH = 60;

// Nhãn trên thẻ gói Premium mà người dùng đang dùng
const CurrentPlanTag = () => (
  <span
    style={{
      position: 'absolute',
      top: '-10px',
      left: '10px',
      backgroundColor: '#0284C7',
      color: '#FFFFFF',
      fontSize: '10px',
      fontWeight: '800',
      padding: '2px 8px',
      borderRadius: '10px',
    }}
  >
    GÓI HIỆN TẠI
  </span>
);

export default function UserProfile() {
  const { user, setUser, updateUser, upgradePremium, reloadUser } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isEditing, setIsEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [major, setMajor] = useState(user?.major || '');
  const [year, setYear] = useState(user?.year || '');
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarNotice, setAvatarNotice] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // === Premium Upgrade Modal State ===
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState('monthly');
  const [upgrading, setUpgrading] = useState(false);
  const [premiumNotice, setPremiumNotice] = useState(null);
  const premiumPlans = usePremiumPlans(showPremiumModal);
  const selectedPlanInfo = premiumPlans[selectedPlan] || premiumPlans.monthly;
  const premiumExpiresText = user?.premiumExpiresAt
    ? new Date(user.premiumExpiresAt).toLocaleDateString('vi-VN')
    : null;

  // Mở sẵn modal Premium khi vào từ link /user/profile?upgrade=monthly|yearly (vd: trang UniCoin)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const planFromLink = searchParams.get('upgrade');
    if (!planFromLink) return;
    if (planFromLink === 'monthly' || planFromLink === 'yearly') setSelectedPlan(planFromLink);
    setShowPremiumModal(true);
    setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // === Order & VietQR State ===
  const [currentOrder, setCurrentOrder] = useState(null); // { order, payment }
  const [paidOrder, setPaidOrder] = useState(null); // đơn vừa thanh toán xong → màn hình thành công
  const [copiedField, setCopiedField] = useState(null);
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderPolling, setOrderPolling] = useState(false);

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

  // Mở lại modal (vd: sau khi tắt tab) thì hiện tiếp đơn đang chờ thanh toán, không bắt tạo lại
  useEffect(() => {
    if (!showPremiumModal || currentOrder || paidOrder) return undefined;
    let active = true;
    orderApi
      .getMyOrders()
      .then(async (res) => {
        const pending = res?.data?.find((o) => o.status === 'pending');
        if (!pending || !active) return;
        const detail = await orderApi.getOrder(pending.code);
        if (active && detail?.data?.payment) setCurrentOrder(detail.data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [showPremiumModal, currentOrder, paidOrder]);

  // Đơn đã thanh toán: chuyển sang màn hình thành công (không tự đóng để khách kịp xem)
  const showPaymentSuccess = async (order) => {
    setPaidOrder(order);
    setCurrentOrder(null);
    setPremiumNotice(null);
    await reloadUser?.();
  };

  const closePremiumModal = () => {
    setShowPremiumModal(false);
    setPremiumNotice(null);
    setPaidOrder(null);
  };

  // Tự động kiểm tra trạng thái đơn hàng khi đang mở màn hình thanh toán VietQR
  useEffect(() => {
    let timer = null;
    if (currentOrder && currentOrder.order?.status === 'pending' && showPremiumModal) {
      timer = setInterval(async () => {
        try {
          const res = await orderApi.getOrder(currentOrder.order.code);
          if (res?.data?.order?.status === 'paid') {
            clearInterval(timer);
            await showPaymentSuccess(res.data.order);
          } else if (res?.data?.order?.status === 'cancelled') {
            clearInterval(timer);
            setPremiumNotice({ type: 'error', text: 'Đơn hàng đã bị huỷ.' });
            setCurrentOrder(null);
          }
        } catch (err) {
          console.log('Poll order error:', err.message);
        }
      }, 3500);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [currentOrder, showPremiumModal, reloadUser]);

  const handleStartOrderPayment = async () => {
    try {
      setIsCreatingOrder(true);
      setPremiumNotice(null);
      // Gửi kèm client_id để backend báo purchase về GA4 khi admin xác nhận đã nhận tiền
      const gaClientId = await getAnalyticsClientId();
      const res = await orderApi.createOrder(selectedPlan, gaClientId);
      const order = res.data?.order;
      if (order) {
        trackEvent('begin_checkout', {
          currency: 'VND',
          value: order.amount,
          items: [{ item_id: order.plan, item_name: order.planName, price: order.amount, quantity: 1 }],
        });
      }
      setCurrentOrder(res.data);
    } catch (err) {
      setPremiumNotice({ type: 'error', text: err.message || 'Không thể tạo đơn hàng' });
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrder?.order?.code) return;
    try {
      await orderApi.cancelMyOrder(currentOrder.order.code);
      setCurrentOrder(null);
      setPremiumNotice({ type: 'success', text: 'Đã huỷ đơn hàng.' });
    } catch (err) {
      setPremiumNotice({ type: 'error', text: err.message || 'Không thể huỷ đơn hàng' });
    }
  };

  const handleCheckOrderNow = async () => {
    if (!currentOrder?.order?.code) return;
    try {
      setOrderPolling(true);
      const res = await orderApi.getOrder(currentOrder.order.code);
      if (res?.data?.order?.status === 'paid') {
        await showPaymentSuccess(res.data.order);
      } else {
        setPremiumNotice({
          type: 'error',
          text: 'Hệ thống chưa ghi nhận tiền về tài khoản. Bạn vui lòng đợi 1-2 phút hoặc kiểm tra lại nội dung chuyển khoản nhé!',
        });
      }
    } catch (err) {
      setPremiumNotice({ type: 'error', text: err.message || 'Kiểm tra thất bại' });
    } finally {
      setOrderPolling(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };


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

    const trimmedName = fullName.trim();
    if (!trimmedName) {
      alert('Họ và tên không được để trống');
      return;
    }

    setIsSavingProfile(true);
    try {
      const res = await userApi.updateMe({ fullName: trimmedName, bio, major, year });
      const saved = res?.data?.user || { fullName: trimmedName, bio, major, year };
      const updated = {
        ...user,
        name: saved.fullName || trimmedName,
        bio: saved.bio ?? saved.studentProfile?.bio ?? bio,
        major: saved.major ?? saved.studentProfile?.major ?? major,
        year: saved.year ?? saved.studentProfile?.year ?? year,
      };
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '24px' }}>
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

              {user?.isVerifiedStudent ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#0284C7',
                      padding: '5px 12px',
                      borderRadius: '20px',
                      fontSize: '11px',
                      fontWeight: '800',
                      color: '#FFFFFF',
                      boxShadow: '0 2px 8px rgba(2, 132, 199, 0.4)',
                    }}
                  >
                    <CheckCircle2 size={13} color="#FFFFFF" />
                    <span>PREMIUM • TÍCH XANH XÁC THỰC</span>
                  </div>
                  {user?.isPremium && (
                    <button
                      type="button"
                      onClick={() => setShowPremiumModal(true)}
                      title={premiumExpiresText ? `Hết hạn ${premiumExpiresText}` : undefined}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        background: 'rgba(255,255,255,0.18)',
                        border: '1px solid rgba(255,255,255,0.4)',
                        borderRadius: '20px',
                        padding: '3px 10px',
                        fontSize: '10.5px',
                        fontWeight: '700',
                        color: '#FFFFFF',
                        cursor: 'pointer',
                      }}
                    >
                      <Crown size={11} color="#FFD54F" />
                      Gia hạn / Đổi gói
                    </button>
                  )}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPremiumModal(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: '#FF5722',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '800',
                    color: '#FFFFFF',
                    border: 'none',
                    cursor: 'pointer',
                    boxShadow: '0 2px 10px rgba(255, 87, 34, 0.4)',
                    transition: 'transform 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                >
                  <Sparkles size={13} color="#FFD54F" />
                  <span>NÂNG CẤP PREMIUM NHẬN TÍCH XANH</span>
                </button>
              )}
            </div>

            {/* Student Info & Photo */}
            <div style={{ display: 'flex', gap: '18px', alignItems: 'center', marginBottom: '24px' }}>
              {/* Avatar with Upload button badge */}
              <div style={{ position: 'relative' }}>
                <img
                  src={getAvatarUrl(user?.avatar)}
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
                <div style={{ fontSize: '20px', fontWeight: '900', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{user?.name || user?.fullName || 'Sinh viên'}</span>
                  {user?.isVerifiedStudent && (
                    <span title="Tài khoản Premium (Đã xác minh tích xanh)">
                      <CheckCircle2 size={18} color="#38BDF8" fill="#0284C7" />
                    </span>
                  )}
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
            <div
              onClick={() => navigate('/user/unicoin')}
              style={{ backgroundColor: '#FFFFFF', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-color)', textAlign: 'center', cursor: 'pointer', transition: 'transform 0.2s, box-shadow 0.2s' }}
              title="Nhấn để xem Điểm UniCoin & Điểm danh"
            >
              <div style={{ fontSize: '22px', fontWeight: '900', color: '#F59E0B' }}>{user?.uniCoin ?? 0}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600' }}>UniCoin ⭐</div>
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
                onClick={() => {
                  if (!isEditing) setFullName(user?.name || '');
                  setIsEditing(!isEditing);
                }}
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
                    Họ và tên:
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    maxLength={FULL_NAME_MAX_LENGTH}
                    placeholder="Nhập họ và tên đầy đủ"
                    required
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '13px',
                      outline: 'none',
                      backgroundColor: '#FFFFFF',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

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

      {/* ===== LỊCH SỬ GIAO DỊCH: tải lại mỗi khi đóng / mở khung thanh toán ===== */}
      <div style={{ marginTop: '24px' }}>
        <OrderHistory onResume={() => setShowPremiumModal(true)} refreshKey={showPremiumModal} />
      </div>

      {/* ============================================================== */}
      {/* MODAL NÂNG CẤP PREMIUM NHẬN TÍCH XANH                          */}
      {/* ============================================================== */}
      {showPremiumModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(6px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            padding: '16px',
            overflowY: 'auto',
            animation: 'fadeIn 0.2s ease-out',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !upgrading) closePremiumModal();
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '520px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              animation: 'slideUp 0.25s ease-out',
              margin: 'auto',
            }}
          >
            {/* Header Gradient */}
            <div
              style={{
                background: 'linear-gradient(135deg, #FF6F00 0%, #FF3D00 50%, #D84315 100%)',
                padding: '28px 24px 20px',
                color: '#FFFFFF',
                position: 'relative',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (!upgrading) closePremiumModal();
                }}
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s',
                }}
              >
                <X size={18} />
              </button>

              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '11px',
                  fontWeight: '800',
                  letterSpacing: '0.5px',
                  marginBottom: '10px',
                }}
              >
                <Crown size={13} color="#FFD54F" />
                <span>ĐẶC QUYỀN HỘI VIÊN UNI-MATE</span>
              </div>

              <h3 style={{ fontSize: '22px', fontWeight: '900', margin: '0 0 6px', color: '#FFFFFF' }}>
                {user?.isPremium ? 'Gia Hạn hoặc Đổi Gói Premium' : 'Nâng Cấp Premium & Nhận Tích Xanh'}
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: '#FFE0B2', lineHeight: '1.4' }}>
                {user?.isPremium
                  ? `Bạn đang dùng ${PREMIUM_PLAN_LABEL[user.premiumPlan] || 'Premium'}${premiumExpiresText ? `, hết hạn ${premiumExpiresText}` : ''}. Mua thêm gói nào thì thời hạn được cộng dồn vào hạn hiện tại.`
                  : 'Xác thực danh tính chính chủ và mở khoá trải nghiệm kết nối bạn học không giới hạn.'}
              </p>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '24px' }}>
              {/* Notice */}
              {premiumNotice && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 14px',
                    borderRadius: '12px',
                    marginBottom: '18px',
                    backgroundColor: premiumNotice.type === 'error' ? '#FEF2F2' : '#F0FDF4',
                    border: `1px solid ${premiumNotice.type === 'error' ? '#FCA5A5' : '#86EFAC'}`,
                  }}
                >
                  {premiumNotice.type === 'error' ? (
                    <AlertCircle size={18} color="#EF4444" style={{ flexShrink: 0 }} />
                  ) : (
                    <CheckCircle size={18} color="#22C55E" style={{ flexShrink: 0 }} />
                  )}
                  <span
                    style={{
                      fontSize: '13px',
                      fontWeight: '600',
                      color: premiumNotice.type === 'error' ? '#B91C1C' : '#15803D',
                    }}
                  >
                    {premiumNotice.text}
                  </span>
                </div>
              )}

              {paidOrder ? (
                <PaymentSuccess order={paidOrder} expiresAt={user?.premiumExpiresAt} onDone={closePremiumModal} />
              ) : /* Khi đang có đơn hàng chờ thanh toán VietQR */ currentOrder ? (
                <div>
                  <div
                    style={{
                      textAlign: 'center',
                      backgroundColor: '#FFF7ED',
                      padding: '14px',
                      borderRadius: '16px',
                      marginBottom: '16px',
                      border: '1.5px solid #FFEDD5',
                    }}
                  >
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#EA580C', marginBottom: '2px' }}>
                      {currentOrder.order?.planName || 'UniMate Premium'}
                    </div>
                    <div style={{ fontSize: '24px', fontWeight: '900', color: '#C2410C' }}>
                      {currentOrder.order?.amount?.toLocaleString('vi-VN')} đ
                    </div>
                    <div style={{ fontSize: '12px', color: '#9A3412', marginTop: '2px' }}>
                      Mã đơn hàng: <strong>{currentOrder.order?.code}</strong>
                    </div>
                  </div>

                  {/* QR Image Box */}
                  <div
                    style={{
                      backgroundColor: '#FFFFFF',
                      border: '2px dashed #FB923C',
                      borderRadius: '16px',
                      padding: '16px',
                      textAlign: 'center',
                      marginBottom: '16px',
                      boxShadow: '0 4px 12px rgba(251, 146, 60, 0.1)',
                    }}
                  >
                    {currentOrder.payment?.qrImageUrl ? (
                      <img
                        src={currentOrder.payment.qrImageUrl}
                        alt="Mã VietQR"
                        style={{
                          width: '200px',
                          height: '200px',
                          objectFit: 'contain',
                          margin: '0 auto',
                          borderRadius: '8px',
                          display: 'block',
                        }}
                      />
                    ) : (
                      <div style={{ padding: '40px 0', color: '#64748B', fontSize: '13px' }}>
                        Đang tạo mã VietQR...
                      </div>
                    )}
                    <p style={{ fontSize: '11.5px', color: '#64748B', marginTop: '8px', marginBottom: 0 }}>
                      Mở ứng dụng Ngân hàng (Vietcombank, MB, Techcombank...) để quét mã
                    </p>
                  </div>

                  {/* Bank Details Table */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '14px',
                      padding: '12px 14px',
                      marginBottom: '16px',
                      border: '1px solid #E2E8F0',
                      fontSize: '12.5px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748B' }}>Ngân hàng:</span>
                      <strong style={{ color: '#1E293B' }}>{currentOrder.payment?.bankId || 'MB Bank'}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748B' }}>Số tài khoản:</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#1E293B' }}>{currentOrder.payment?.accountNo}</strong>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentOrder.payment?.accountNo, 'accountNo')}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#FF5722', display: 'flex', alignItems: 'center' }}
                          title="Sao chép số tài khoản"
                        >
                          {copiedField === 'accountNo' ? <CheckCircle size={14} color="#10B981" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: '#64748B' }}>Chủ tài khoản:</span>
                      <strong style={{ color: '#1E293B' }}>{currentOrder.payment?.accountName}</strong>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FEF3C7', padding: '6px 8px', borderRadius: '8px' }}>
                      <span style={{ color: '#92400E', fontWeight: '700' }}>Nội dung CK (bắt buộc):</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <strong style={{ color: '#B45309', fontSize: '13px', letterSpacing: '0.5px' }}>
                          {currentOrder.payment?.transferContent || currentOrder.order?.code}
                        </strong>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(currentOrder.payment?.transferContent || currentOrder.order?.code, 'content')}
                          style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#B45309', display: 'flex', alignItems: 'center' }}
                          title="Sao chép nội dung chuyển khoản"
                        >
                          {copiedField === 'content' ? <CheckCircle size={14} color="#10B981" /> : <Copy size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Polling Indicator */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '12px',
                      color: '#0284C7',
                      backgroundColor: '#F0F9FF',
                      padding: '8px 12px',
                      borderRadius: '10px',
                      marginBottom: '16px',
                    }}
                  >
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Đang chờ chuyển khoản... Hệ thống tự động kích hoạt sau khi nhận</span>
                  </div>

                  {/* Buttons in Order View */}
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={orderPolling}
                      onClick={handleCheckOrderNow}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: '12px',
                        border: 'none',
                        backgroundColor: '#FF5722',
                        color: '#FFFFFF',
                        fontWeight: '800',
                        fontSize: '13px',
                        cursor: orderPolling ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                      }}
                    >
                      {orderPolling ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <RefreshCw size={16} />}
                      Kiểm tra ngay
                    </button>

                    <button
                      type="button"
                      onClick={handleCancelOrder}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '12px',
                        border: '1px solid #CBD5E1',
                        backgroundColor: '#FFFFFF',
                        color: '#64748B',
                        fontWeight: '700',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      Huỷ đơn
                    </button>
                  </div>
                </div>
              ) : (
                /* Màn hình chọn gói cước */
                <div>
                  {/* Benefits list */}
                  <div
                    style={{
                      backgroundColor: '#F8FAFC',
                      borderRadius: '16px',
                      padding: '16px',
                      marginBottom: '20px',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <CheckCircle2 size={15} color="#0284C7" />
                      </div>
                      <div>
                        <strong>Tích xanh xác thực chính chủ:</strong> Hồ sơ có tích xanh, bạn học yên tâm hơn khi kết bạn.
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Zap size={14} color="#D97706" />
                      </div>
                      <div>
                        <strong>Ưu tiên gợi ý kết bạn:</strong> Hồ sơ được xếp sớm hơn trong trang Khám phá của sinh viên khác.
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#334155' }}>
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', backgroundColor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Coffee size={14} color="#15803D" />
                      </div>
                      <div>
                        <strong>Voucher cafe độc quyền:</strong> Mở khoá các voucher quán đối tác chỉ dành cho thành viên Premium.
                      </div>
                    </div>
                  </div>

                  {/* Plan Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
                    {/* Monthly */}
                    <div
                      onClick={() => setSelectedPlan('monthly')}
                      style={{
                        border: `2px solid ${selectedPlan === 'monthly' ? '#FF5722' : '#E2E8F0'}`,
                        backgroundColor: selectedPlan === 'monthly' ? '#FFF7ED' : '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                    >
                      {user?.isPremium && user?.premiumPlan === 'monthly' && <CurrentPlanTag />}
                      <div style={{ fontSize: '12px', fontWeight: '700', color: selectedPlan === 'monthly' ? '#EA580C' : '#64748B', marginBottom: '4px' }}>
                        GÓI THÁNG ({premiumPlans.monthly.durationDays} NGÀY)
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#1E293B', marginBottom: '2px' }}>
                        {formatVnd(premiumPlans.monthly.amount)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {premiumPlans.monthly.coinPrice != null
                          ? `Hoặc đổi ${premiumPlans.monthly.coinPrice} UniCoin`
                          : 'Chỉ thanh toán VietQR'}
                      </div>
                    </div>

                    {/* Yearly */}
                    <div
                      onClick={() => setSelectedPlan('yearly')}
                      style={{
                        border: `2px solid ${selectedPlan === 'yearly' ? '#FF5722' : '#E2E8F0'}`,
                        backgroundColor: selectedPlan === 'yearly' ? '#FFF7ED' : '#FFFFFF',
                        borderRadius: '16px',
                        padding: '16px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          top: '-10px',
                          right: '10px',
                          backgroundColor: '#10B981',
                          color: '#FFFFFF',
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        TIẾT KIỆM 30%
                      </span>
                      {user?.isPremium && user?.premiumPlan === 'yearly' && <CurrentPlanTag />}
                      <div style={{ fontSize: '12px', fontWeight: '700', color: selectedPlan === 'yearly' ? '#EA580C' : '#64748B', marginBottom: '4px' }}>
                        GÓI NĂM ({premiumPlans.yearly.durationDays} NGÀY)
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '900', color: '#1E293B', marginBottom: '2px' }}>
                        {formatVnd(premiumPlans.yearly.amount)}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                        {premiumPlans.yearly.coinPrice != null
                          ? `Hoặc đổi ${premiumPlans.yearly.coinPrice} UniCoin`
                          : 'Chỉ thanh toán VietQR'}
                      </div>
                    </div>
                  </div>

                  {/* Wallet info */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      backgroundColor: '#FFFBEB',
                      borderRadius: '12px',
                      marginBottom: '20px',
                      border: '1px solid #FDE68A',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#92400E' }}>
                      <Coins size={16} color="#D97706" />
                      <span>Số dư UniCoin hiện có:</span>
                    </div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#B45309' }}>
                      {user?.uniCoin ?? 0} UniCoin
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <button
                      type="button"
                      disabled={upgrading || isCreatingOrder || selectedPlanInfo.coinPrice == null}
                      onClick={async () => {
                        const cost = selectedPlanInfo.coinPrice;
                        if (cost == null) return;
                        if ((user?.uniCoin || 0) < cost) {
                          setPremiumNotice({
                            type: 'error',
                            text: `Bạn không đủ UniCoin (cần ${cost} Coin, hiện có ${user?.uniCoin || 0} Coin). Bạn có thể đổi điểm hoặc thanh toán chuyển khoản VietQR.`,
                          });
                          return;
                        }
                        try {
                          setUpgrading(true);
                          setPremiumNotice(null);
                          const res = await upgradePremium(selectedPlan, 'coin');
                          setPremiumNotice({
                            type: 'success',
                            text: res.message || 'Nâng cấp Premium thành công! Tài khoản đã được cấp tích xanh.',
                          });
                          setTimeout(() => {
                            setShowPremiumModal(false);
                            setPremiumNotice(null);
                          }, 1800);
                        } catch (err) {
                          setPremiumNotice({ type: 'error', text: err.message || 'Có lỗi xảy ra.' });
                        } finally {
                          setUpgrading(false);
                        }
                      }}
                      style={{
                        width: '100%',
                        padding: '14px',
                        borderRadius: '14px',
                        border: 'none',
                        backgroundColor: selectedPlanInfo.coinPrice == null ? '#CBD5E1' : '#FF5722',
                        color: '#FFFFFF',
                        fontSize: '15px',
                        fontWeight: '800',
                        cursor: upgrading || isCreatingOrder || selectedPlanInfo.coinPrice == null ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        boxShadow: '0 4px 14px rgba(255, 87, 34, 0.4)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {upgrading ? (
                        <>
                          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                          Đang xử lý nâng cấp...
                        </>
                      ) : (
                        <>
                          <Crown size={18} color="#FFD54F" />
                          {selectedPlanInfo.coinPrice == null
                            ? `${selectedPlanInfo.label} chỉ thanh toán qua VietQR`
                            : `${user?.isPremium ? 'Gia hạn' : 'Kích hoạt ngay'} bằng ${selectedPlanInfo.coinPrice} UniCoin`}
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={upgrading || isCreatingOrder}
                      onClick={handleStartOrderPayment}
                      style={{
                        width: '100%',
                        padding: '13px',
                        borderRadius: '14px',
                        border: '1.5px solid #FF5722',
                        backgroundColor: '#FFF7ED',
                        color: '#EA580C',
                        fontSize: '13.5px',
                        fontWeight: '800',
                        cursor: upgrading || isCreatingOrder ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        boxShadow: '0 2px 6px rgba(234, 88, 12, 0.1)',
                      }}
                    >
                      {isCreatingOrder ? (
                        <>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                          Đang tạo mã VietQR...
                        </>
                      ) : (
                        <>
                          <QrCode size={17} />
                          Thanh toán VietQR ({formatVnd(selectedPlanInfo.amount)})
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
