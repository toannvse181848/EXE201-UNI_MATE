import React, { useState } from 'react';
import {
  Save,
  Zap,
  MapPin,
  Clock,
  DollarSign,
  Star,
  Sparkles,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  QrCode,
  Printer,
  RefreshCw,
  X,
  Loader2,
  Crown,
} from 'lucide-react';
import { venueApi, voucherApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PartnerPlanModal from '../../components/partner/PartnerPlanModal';
import { describeVoucher } from '../../utils/voucher';
import { extractDistrict } from '../../utils/addressUtils';
import VenueImageCarousel from '../../components/VenueImageCarousel';

export default function VenueManagement() {
  const [venueId, setVenueId] = useState(null);
  const [formData, setFormData] = useState({
    branchName: '',
    description: '',
    phone: '',
    priceMin: '30.000',
    priceMax: '65.000',
    address: '',
    district: '',
    openTime: '07:00',
    closeTime: '22:30',
    tags: ['Cafe', 'Học tập', 'Wifi mạnh', 'Yên tĩnh'],
    images: [],
  });

  const [newTag, setNewTag] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  // Tên hiển thị = "Thương hiệu - Chi nhánh" (backend ghép khi lưu)
  const { user, reloadUser } = useAuth();
  const brand = user?.businessName || user?.partnerProfile?.businessName || user?.name || '';
  const displayName = [brand, formData.branchName.trim()].filter(Boolean).join(' - ');
  const [venues, setVenues] = useState([]);
  const [partnerVouchers, setPartnerVouchers] = useState([]);
  // Nổi bật = đang có Gói Đối tác còn hạn (trước đây nút Boost chỉ đổi chữ trên màn hình)
  const [showPlanModal, setShowPlanModal] = useState(false);
  const planExpiresAt = user?.partnerProfile?.planExpiresAt;
  const isBoosted = Boolean(planExpiresAt && new Date(planExpiresAt) > new Date());

  // === Check-in QR State ===
  const [showCheckinQrModal, setShowCheckinQrModal] = useState(false);
  const [checkinQrData, setCheckinQrData] = useState(null); // { qrContent, qrImageUrl }
  const [loadingQr, setLoadingQr] = useState(false);
  const [regeneratingQr, setRegeneratingQr] = useState(false);

  // Tên chi nhánh của quán tạo trước khi có quy tắc đặt tên: bỏ phần thương hiệu ở đầu tên
  const branchOf = (v) => {
    if (typeof v.branchName === 'string') return v.branchName;
    const name = v.name || '';
    if (brand && name.toLowerCase().startsWith(brand.toLowerCase())) {
      return name.slice(brand.length).replace(/^\s*[-–—:]\s*/, '');
    }
    return name;
  };

  // "07:00 - 22:30" → ['07:00', '22:30']; "30.000 - 65.000 VNĐ" → ['30.000', '65.000']
  const splitRange = (text, fallback) => {
    const parts = String(text || '').replace(/\s*VNĐ\s*$/i, '').split(/\s*[-–]\s*/);
    return parts.length === 2 && parts[0] && parts[1] ? parts : fallback;
  };

  // Điền form theo chi nhánh đang chọn; null = thêm chi nhánh mới
  const fillForm = (v) => {
    setVenueId(v ? v._id || v.id : null);
    setFormData((prev) =>
      v
        ? {
            ...prev,
            branchName: branchOf(v),
            description: v.description || '',
            phone: v.phone || '',
            address: v.address || '',
            district: v.district || extractDistrict(v.address) || '',
            tags: v.tags || [],
            images: v.images?.length ? v.images : v.image ? [v.image] : [],
            ...(([openTime, closeTime]) => ({ openTime, closeTime }))(splitRange(v.openHours, [prev.openTime, prev.closeTime])),
            ...(([priceMin, priceMax]) => ({ priceMin, priceMax }))(splitRange(v.priceRange, [prev.priceMin, prev.priceMax])),
          }
        : { ...prev, branchName: '', description: '', phone: '', address: '', district: '', images: [] }
    );
  };

  const loadVenues = async (selectId = null) => {
    try {
      const res = await venueApi.getMyVenues();
      const list = res?.data || [];
      setVenues(list);
      fillForm(list.find((v) => (v._id || v.id) === selectId) || list[0] || null);
    } catch (err) {
      console.log('Backend my venues note:', err.message);
    }
  };

  React.useEffect(() => {
    loadVenues();
    voucherApi.getMyPartnerVouchers().then((res) => setPartnerVouchers(res?.data || [])).catch(() => {});
    // Lấy hạn Gói Đối tác mới nhất (thông tin lúc đăng nhập không có partnerProfile)
    reloadUser?.();
    // Chỉ tải 1 lần khi mở trang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Voucher thật của chi nhánh đang chọn (để xem trước đúng như sinh viên thấy)
  const branchVouchers = partnerVouchers.filter(
    (v) => String(v.venueId?._id || v.venueId) === String(venueId) && v.isActive && new Date(v.validUntil) > new Date()
  );
  const previewReward = branchVouchers.find((v) => v.meetupReward);
  const activeVenue = venues.find((v) => (v._id || v.id) === venueId);
  const previewVoucher = branchVouchers.find((v) => !v.meetupReward);


  // Xử lý upload nhiều ảnh từ máy tính: đẩy lên server (Cloudinary) rồi lưu URL trả về
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []).filter((file) => file.type.startsWith('image/'));
    // Reset input file value để có thể chọn lại cùng file nếu muốn
    e.target.value = '';
    if (!files.length) return;

    if (files.length > 10) {
      alert('Chỉ được tải tối đa 10 ảnh mỗi lần');
      return;
    }
    const tooLarge = files.find((file) => file.size > 10 * 1024 * 1024);
    if (tooLarge) {
      alert(`Ảnh "${tooLarge.name}" vượt quá 10MB`);
      return;
    }

    setIsUploading(true);
    try {
      const res = await venueApi.uploadImages(files);
      const urls = res?.data?.urls || [];
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...urls],
      }));
    } catch (err) {
      alert('Tải ảnh thất bại: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  // Thêm ảnh bằng URL dán từ ngoài
  const handleAddImageUrl = (e) => {
    e.preventDefault();
    if (imageUrlInput.trim()) {
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, imageUrlInput.trim()],
      }));
      setImageUrlInput('');
    }
  };

  // Xóa 1 ảnh
  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, idx) => idx !== indexToRemove),
    }));
  };

  // Đặt làm ảnh bìa chính (đưa lên đầu danh sách)
  const handleSetCoverImage = (index) => {
    setFormData((prev) => {
      const selected = prev.images[index];
      const remaining = prev.images.filter((_, idx) => idx !== index);
      return {
        ...prev,
        images: [selected, ...remaining],
      };
    });
  };

  const handleAddTag = (e) => {
    e.preventDefault();
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, newTag.trim()] });
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tagToRemove),
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (isSaving || isUploading) return;

    const districtVal = formData.district?.trim() || extractDistrict(formData.address);
    const payload = {
      branchName: formData.branchName.trim(),
      description: formData.description,
      phone: formData.phone,
      address: formData.address,
      district: districtVal,
      tags: formData.tags,
      images: formData.images,
      image: formData.images[0] || '',
      openHours: `${formData.openTime.trim()} - ${formData.closeTime.trim()}`,
      priceRange: `${formData.priceMin.trim()} - ${formData.priceMax.trim()} VNĐ`,
    };


    setIsSaving(true);
    try {
      let saved;
      let needsReview = false;
      if (venueId) {
        const res = await venueApi.updateVenue(venueId, payload);
        saved = res?.data;
        needsReview = Boolean(res?.needsReview);
        await loadVenues(venueId);
      } else {
        const res = await venueApi.createVenue(payload);
        saved = res?.data;
        await loadVenues(res?.data?._id || null);
      }
      // Báo đúng sinh viên đã thấy thay đổi hay chưa (quán chưa duyệt thì chưa hiện)
      setSavedSuccess(
        needsReview
          ? { tone: 'warn', text: 'Đã lưu. Bạn đổi tên hoặc địa chỉ nên chi nhánh cần admin duyệt lại; trong lúc chờ, sinh viên tạm thời không thấy chi nhánh này.' }
          : saved?.status === 'approved'
            ? { tone: 'ok', text: 'Đã lưu. Sinh viên thấy thông tin mới ngay trên web và app.' }
            : { tone: 'warn', text: 'Đã lưu. Chi nhánh đang chờ admin duyệt nên sinh viên chưa thấy.' }
      );
      setTimeout(() => setSavedSuccess(false), 6000);
    } catch (err) {
      alert('Lưu thông tin quán thất bại: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCheckinQr = async () => {
    if (!venueId) {
      alert('Vui lòng lưu thông tin địa điểm trước khi lấy mã QR');
      return;
    }
    setShowCheckinQrModal(true);
    setLoadingQr(true);
    try {
      const res = await venueApi.getCheckinQr(venueId);
      setCheckinQrData(res.data);
    } catch (err) {
      alert('Lỗi lấy mã QR check-in: ' + err.message);
    } finally {
      setLoadingQr(false);
    }
  };

  const handleRegenerateQr = async () => {
    if (!venueId) return;
    if (!window.confirm('Bạn có chắc chắn muốn tạo lại mã QR mới? Mã QR cũ đã in sẽ hết hiệu lực ngay lập tức!')) return;
    setRegeneratingQr(true);
    try {
      const res = await venueApi.regenerateCheckinQr(venueId);
      setCheckinQrData(res.data);
      alert('Đã tạo mã QR check-in mới thành công! Vui lòng in lại mã mới dán tại quán.');
    } catch (err) {
      alert('Lỗi tạo lại mã QR: ' + err.message);
    } finally {
      setRegeneratingQr(false);
    }
  };

  const handlePrintQr = () => {
    if (!checkinQrData?.qrImageUrl) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Vui lòng cho phép popup để mở trang in ấn.');
      return;
    }
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Mã QR Check-in - ${displayName || 'UNI-MATE'}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; text-align: center; padding: 40px; margin: 0; background: #f8fafc; }
            .card { background: #fff; border: 3px solid #FF5722; border-radius: 28px; padding: 36px 28px; display: inline-block; max-width: 360px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); }
            .badge { background: #FFF7ED; color: #EA580C; font-weight: 800; font-size: 12px; padding: 6px 14px; border-radius: 20px; display: inline-block; margin-bottom: 12px; }
            h2 { color: #1E293B; margin: 0 0 6px 0; font-size: 22px; font-weight: 900; }
            p { color: #64748B; font-size: 13px; margin: 0 0 20px 0; line-height: 1.4; }
            img { width: 240px; height: 240px; display: block; margin: 0 auto; border-radius: 16px; border: 1px solid #E2E8F0; }
            .footer { margin-top: 20px; font-weight: 900; color: #FF5722; font-size: 16px; letter-spacing: 0.5px; }
            .sub { color: #16A34A; font-size: 13.5px; font-weight: 800; margin-top: 4px; }
            @media print {
              body { background: #fff; padding: 0; }
              .card { border: 2px solid #000; box-shadow: none; max-width: 100%; width: 340px; margin: 20px auto; }
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">ĐỐI TÁC CHÍNH THỨC UNI-MATE</div>
            <h2>${displayName || 'Quán Cafe'}</h2>
            <p>Mở app UNI-MATE quét mã để nhận UniCoin tích luỹ ưu đãi</p>
            <img src="${checkinQrData.qrImageUrl}" alt="Check-in QR" />
            <div class="footer">CHECK-IN TẠI QUÁN</div>
            <div class="sub">+20 UNICOIN / LẦN</div>
          </div>
          <script>
            window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Quản lý địa điểm
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Cập nhật thông tin cơ sở, ảnh không gian và xem trước giao diện vuốt ảnh trực tiếp trên app di động UNI-MATE.
          </p>
        </div>

        <div className="venue-header-actions" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleOpenCheckinQr}
            className="btn"
            style={{
              backgroundColor: '#2563EB',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <QrCode size={16} />
            <span>Mã QR Check-in quán</span>
          </button>

          <button
            type="button"
            onClick={() => setShowPlanModal(true)}
            className={`btn ${isBoosted ? 'btn-secondary' : 'btn-primary'}`}
            style={{
              backgroundColor: isBoosted ? '#FFECE6' : 'var(--primary)',
              color: isBoosted ? 'var(--primary)' : '#fff',
            }}
            title="Gói Đối tác 99.000đ/tháng: quán lên đầu danh sách và khung Rủ cafe"
          >
            <Zap size={16} />
            <span>{isBoosted ? `Nổi bật đến ${new Date(planExpiresAt).toLocaleDateString('vi-VN')}` : 'Đưa quán lên nổi bật'}</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving || isUploading}
            className="btn btn-primary"
            style={{ backgroundColor: '#10B981', opacity: isSaving || isUploading ? 0.7 : 1 }}
          >
            <Save size={16} />
            <span>
              {isSaving ? 'Đang lưu...' : isUploading ? 'Đang tải ảnh...' : savedSuccess ? 'Đã lưu thay đổi!' : 'Lưu thay đổi'}
            </span>
          </button>
        </div>
      </div>

      <PartnerPlanModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        onPaid={reloadUser}
        planExpiresAt={planExpiresAt}
      />

      {/* Chi nhánh của thương hiệu: mỗi chi nhánh là 1 quán riêng trên app, tên = "Thương hiệu - Chi nhánh" */}
      <div className="portal-card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)', marginRight: '4px' }}>
          Chi nhánh của {brand || 'quán'}:
        </span>
        {venues.map((v) => {
          const id = v._id || v.id;
          const active = id === venueId;
          const statusText = v.status === 'approved' ? 'Đã duyệt' : v.status === 'rejected' ? 'Bị từ chối' : 'Chờ duyệt';
          const statusColor = v.status === 'approved' ? '#059669' : v.status === 'rejected' ? '#DC2626' : '#B45309';
          return (
            <button
              key={id}
              type="button"
              onClick={() => fillForm(v)}
              style={{ padding: '7px 12px', borderRadius: '10px', border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`, backgroundColor: active ? '#FFF3E0' : '#FFFFFF', cursor: 'pointer', textAlign: 'left' }}
            >
              <div style={{ fontSize: '13px', fontWeight: '800', color: active ? '#C2410C' : 'var(--text-primary)' }}>{branchOf(v) || 'Cơ sở chính'}</div>
              <div style={{ fontSize: '11px', fontWeight: '700', color: statusColor }}>{statusText}</div>
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => fillForm(null)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 12px', borderRadius: '10px', border: `1.5px dashed ${venueId ? 'var(--border-color)' : 'var(--primary)'}`, backgroundColor: venueId ? '#FFFFFF' : '#FFF3E0', color: 'var(--primary)', fontSize: '13px', fontWeight: '800', cursor: 'pointer' }}
        >
          <Plus size={15} /> Thêm chi nhánh
        </button>
        {activeVenue?.status === 'rejected' && (
          <span style={{ fontSize: '12px', color: '#B91C1C', fontWeight: '700', flexBasis: '100%' }}>
            Chi nhánh bị từ chối{activeVenue.rejectionReason ? `: ${activeVenue.rejectionReason}` : ''}. Sửa thông tin rồi lưu để gửi duyệt lại.
          </span>
        )}
        {activeVenue?.status === 'pending' && (
          <span style={{ fontSize: '12px', color: '#B45309', fontWeight: '700', flexBasis: '100%' }}>
            Chi nhánh đang chờ admin duyệt: sinh viên chưa thấy chi nhánh này và voucher của nó.
          </span>
        )}
        {!venueId && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexBasis: '100%' }}>
            Đang thêm chi nhánh mới: điền thông tin bên dưới rồi bấm "Lưu thay đổi". Chi nhánh mới cần admin duyệt trước khi hiện cho sinh viên.
          </span>
        )}
      </div>

      {savedSuccess && (
        <div
          style={{
            backgroundColor: savedSuccess.tone === 'ok' ? '#ECFDF5' : '#FFFBEB',
            color: savedSuccess.tone === 'ok' ? '#065F46' : '#92400E',
            padding: '12px 18px',
            borderRadius: '12px',
            border: `1px solid ${savedSuccess.tone === 'ok' ? '#A7F3D0' : '#FDE68A'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '700',
          }}
        >
          <Check size={18} />
          <span>{savedSuccess.text}</span>
        </div>
      )}

      {/* Main Split: Form on Left, Live Mobile Preview on Right */}
      <div className="grid-venue-main">
        {/* Form Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Photos Upload Card */}
          <div className="portal-card" style={{ border: '1.5px solid rgba(255, 87, 34, 0.2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ImageIcon size={20} color="var(--primary)" />
                <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  Hình ảnh cơ sở / Không gian quán ({formData.images.length} ảnh)
                </h3>
              </div>
              <span className="badge badge-orange" style={{ fontSize: '11px' }}>
                Vuốt đa ảnh trên App
              </span>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '18px' }}>
              Tải lên nhiều góc ảnh đẹp: mặt tiền, khu vực bàn học, ổ cắm điện, thực đơn đồ uống. Sinh viên có thể <strong>vuốt trái/phải</strong> để xem toàn bộ album ảnh của quán trên app.
            </p>

            {/* Upload Buttons Box */}
            <div className="grid-upload-btns" style={{ marginBottom: '16px' }}>
              {/* File Input Trigger */}
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px',
                  backgroundColor: '#FFF7ED',
                  border: '2px dashed var(--primary)',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#FFEDD5')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#FFF7ED')}
              >
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  style={{ display: 'none' }}
                />
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(255, 87, 34, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--primary)',
                  }}
                >
                  <Upload size={18} />
                </div>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--primary)', display: 'block' }}>
                    {isUploading ? 'Đang tải ảnh lên...' : 'Tải ảnh từ máy tính'}
                  </span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Chọn nhiều ảnh cùng lúc (PNG, JPG, WEBP)
                  </span>
                </div>
              </label>

              {/* URL Input */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '12px 14px',
                  backgroundColor: '#F8FAFC',
                  border: '1.5px solid var(--border-color)',
                  borderRadius: '12px',
                }}
              >
                <label style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Hoặc dán URL ảnh trực tiếp:
                </label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input
                    type="url"
                    placeholder="https://images.unsplash..."
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '12px',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddImageUrl}
                    className="btn btn-secondary"
                    style={{ padding: '8px 12px', fontSize: '12px', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={14} /> Thêm
                  </button>
                </div>
              </div>
            </div>

            {/* Images Grid Showcase */}
            {formData.images.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '24px',
                  backgroundColor: '#F9FAFB',
                  borderRadius: '12px',
                  color: 'var(--text-muted)',
                  fontSize: '13px',
                }}
              >
                Chưa có ảnh nào. Vui lòng tải ít nhất 1 ảnh để hiển thị quán trên ứng dụng!
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))',
                  gap: '12px',
                }}
              >
                {formData.images.map((imgUrl, index) => {
                  const isCover = index === 0;
                  return (
                    <div
                      key={index}
                      style={{
                        position: 'relative',
                        height: '95px',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        border: isCover ? '2.5px solid var(--primary)' : '1px solid var(--border-color)',
                        boxShadow: isCover ? '0 4px 10px rgba(255, 87, 34, 0.25)' : 'none',
                        group: 'image-card',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Quán ${index + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={(e) => {
                          e.target.src = 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400';
                        }}
                      />

                      {/* Badge Cover */}
                      {isCover ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: 'var(--primary)',
                            color: '#fff',
                            fontSize: '9px',
                            fontWeight: '800',
                            padding: '2px 6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px',
                          }}
                        >
                          <Crown size={10} />
                          <span>Ảnh bìa</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetCoverImage(index)}
                          title="Đặt làm ảnh bìa chính"
                          style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            backgroundColor: 'rgba(0,0,0,0.6)',
                            color: '#fff',
                            border: 'none',
                            padding: '3px 6px',
                            borderRadius: '6px',
                            fontSize: '9px',
                            fontWeight: '700',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '2px',
                          }}
                        >
                          <Star size={9} /> Bìa
                        </button>
                      )}

                      {/* Delete button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        title="Xoá ảnh này"
                        style={{
                          position: 'absolute',
                          top: '4px',
                          right: '4px',
                          backgroundColor: 'rgba(239, 68, 68, 0.9)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          width: '22px',
                          height: '22px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>

                      <div
                        style={{
                          position: 'absolute',
                          bottom: '3px',
                          right: '4px',
                          backgroundColor: 'rgba(0,0,0,0.6)',
                          color: '#fff',
                          fontSize: '9px',
                          fontWeight: '700',
                          padding: '1px 5px',
                          borderRadius: '4px',
                        }}
                      >
                        #{index + 1}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* General Info Card */}
          <div className="portal-card">
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Thông tin chung
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Tên chi nhánh / cơ sở
                </label>
                <div style={{ display: 'flex', alignItems: 'stretch', border: '1.5px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden' }}>
                  <span style={{ padding: '10px 12px', backgroundColor: '#F1F5F9', fontSize: '14px', fontWeight: '700', color: 'var(--text-secondary)', whiteSpace: 'nowrap', borderRight: '1px solid var(--border-color)' }}>
                    {brand || 'Thương hiệu'} -
                  </span>
                  <input
                    type="text"
                    value={formData.branchName}
                    maxLength={80}
                    onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                    placeholder="VD: Sư Vạn Hạnh (để trống nếu quán chỉ có 1 cơ sở)"
                    style={{ flex: 1, minWidth: 0, padding: '10px 14px', border: 'none', fontSize: '14px', outline: 'none' }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  Sinh viên sẽ thấy: <strong style={{ color: 'var(--text-primary)' }}>{displayName || 'Tên quán'}</strong>. Muốn đổi tên thương hiệu, sửa ở hồ sơ đối tác.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Mô tả ngắn (Dành cho sinh viên)
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                  }}
                />
              </div>

              <div className="grid-2col">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Khoảng giá (VNĐ)
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="text"
                      value={formData.priceMin}
                      onChange={(e) => setFormData({ ...formData, priceMin: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border-color)',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}
                    />
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                    <input
                      type="text"
                      value={formData.priceMax}
                      onChange={(e) => setFormData({ ...formData, priceMax: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: '1.5px solid var(--border-color)',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Tags & Categories */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Tags / Tiện ích quán
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                  {formData.tags.map((tg) => (
                    <span
                      key={tg}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        backgroundColor: 'var(--bg-page)',
                        padding: '5px 12px',
                        borderRadius: '16px',
                        border: '1px solid var(--border-color)',
                        fontSize: '12px',
                        fontWeight: '700',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {tg}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tg)}
                        style={{ color: '#EF4444', fontWeight: '900', fontSize: '13px', cursor: 'pointer', border: 'none', background: 'transparent' }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Thêm tag tiện ích (VD: Máy lạnh, Ghế sofa...)"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                    }}
                  />
                  <button type="button" onClick={handleAddTag} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
                    Thêm
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Location & Opening Hours Card */}
          <div className="portal-card">
            <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '16px' }}>
              Vị trí & Giờ hoạt động
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="grid-addr-district">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Địa chỉ cụ thể
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Nhà văn hóa sinh viên ĐHQG, Lưu Hữu Phước..."
                    value={formData.address}
                    onChange={(e) => {
                      const newAddr = e.target.value;
                      setFormData((prev) => ({
                        ...prev,
                        address: newAddr,
                        district: prev.district ? prev.district : extractDistrict(newAddr),
                      }));
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Khu vực / Quận Huyện
                  </label>
                  <input
                    type="text"
                    placeholder="VD: Dĩ An, Bình Dương / Thủ Đức..."
                    value={formData.district}
                    onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>


              <div className="grid-2col">
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Giờ mở cửa
                  </label>
                  <input
                    type="text"
                    value={formData.openTime}
                    onChange={(e) => setFormData({ ...formData, openTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                    }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                    Giờ đóng cửa
                  </label>
                  <input
                    type="text"
                    value={formData.closeTime}
                    onChange={(e) => setFormData({ ...formData, closeTime: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-color)',
                      fontSize: '14px',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: LIVE MOBILE APP PREVIEW WITH SWIPEABLE CAROUSEL */}
        <div>
          <div className="venue-preview-sticky">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  📱 Xem trước trên Mobile
                </span>
                <span className="badge badge-orange">LIVE</span>
              </div>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                👉 Có thể vuốt ảnh trái / phải
              </span>
            </div>

            {/* Mobile Device Frame Mockup */}
            <div
              style={{
                width: '100%',
                maxWidth: '340px',
                margin: '0 auto',
                borderRadius: '36px',
                border: '8px solid #1E293B',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                overflow: 'hidden',
                backgroundColor: '#F5F5F7',
                position: 'relative',
              }}
            >
              {/* Notch */}
              <div
                style={{
                  height: '24px',
                  backgroundColor: '#1E293B',
                  borderBottomLeftRadius: '14px',
                  borderBottomRightRadius: '14px',
                  width: '140px',
                  margin: '0 auto',
                  position: 'relative',
                  zIndex: 10,
                }}
              />

              {/* Mobile Screen Header: Interactive Multi-Image Swipe Carousel */}
              <VenueImageCarousel
                images={formData.images}
                height="175px"
                borderRadius="0px"
                showDots={true}
                showArrows={true}
                showCounter={true}
                alt={displayName}
                overlayBadges={
                  <>
                    {isBoosted && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '10px',
                          left: '10px',
                          backgroundColor: 'var(--primary)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: '800',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                          zIndex: 4,
                          boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
                        }}
                      >
                        <Zap size={10} />
                        <span>NỔI BẬT</span>
                      </div>
                    )}
                    {formData.district && (
                      <div
                        style={{
                          position: 'absolute',
                          bottom: '10px',
                          right: '10px',
                          backgroundColor: 'rgba(0,0,0,0.65)',
                          backdropFilter: 'blur(4px)',
                          color: '#fff',
                          fontSize: '10px',
                          fontWeight: '700',
                          padding: '3px 8px',
                          borderRadius: '8px',
                          zIndex: 4,
                        }}
                      >
                        {formData.district}
                      </div>
                    )}
                  </>
                }
              />

              {/* Mobile Content Area */}
              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', marginTop: '-12px', position: 'relative', zIndex: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1A1A24', flex: 1, marginRight: '6px' }}>
                    {displayName || 'Tên quán'}
                  </h4>
                  {/* Chưa có hệ thống đánh giá → sinh viên thấy "Quán mới" thay cho số sao */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#D97706' }}>Quán mới</span>
                  </div>
                </div>

                <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '8px', lineHeight: '15px' }}>
                  {formData.description}
                </p>

                {/* Tags in preview */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '12px' }}>
                  {formData.tags.map((tg, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: 'var(--primary)',
                        backgroundColor: '#FFECE6',
                        padding: '2px 6px',
                        borderRadius: '4px',
                      }}
                    >
                      {tg}
                    </span>
                  ))}
                </div>

                {/* Location & Hours */}
                <div style={{ fontSize: '11px', color: '#4B5563', display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <MapPin size={12} color="var(--primary)" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {formData.address}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Clock size={12} color="#10B981" />
                    <span>Mở cửa • {formData.openTime} - {formData.closeTime}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <DollarSign size={12} color="#6366F1" />
                    <span>{formData.priceMin} - {formData.priceMax} VNĐ</span>
                  </div>
                </div>

                {/* Voucher Box in preview */}
                <div
                  style={{
                    backgroundColor: '#FFECE6',
                    border: '1px dashed var(--primary)',
                    borderRadius: '10px',
                    padding: '8px 12px',
                    marginBottom: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--primary)' }}>
                      {previewReward
                        ? `🤝 Hẹn ở đây, cả hai nhận: ${previewReward.title}`
                        : previewVoucher
                          ? `${previewVoucher.title} · ${describeVoucher(previewVoucher).discountLabel}`
                          : 'Chưa có voucher đang chạy'}
                    </span>
                    <p style={{ fontSize: '9px', color: '#9A3412' }}>
                      {previewReward || previewVoucher ? 'Lấy từ voucher thật của chi nhánh này' : 'Tạo ở mục Quản lý Voucher'}
                    </p>
                  </div>
                  {(previewReward || previewVoucher) && (
                    <span style={{ fontSize: '10px', fontWeight: '800', color: '#fff', backgroundColor: 'var(--primary)', padding: '3px 8px', borderRadius: '6px' }}>
                      Lấy mã
                    </span>
                  )}
                </div>

                {/* Action CTA Button */}
                <button
                  type="button"
                  style={{
                    width: '100%',
                    padding: '10px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--primary)',
                    color: '#fff',
                    fontWeight: '800',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    border: 'none',
                    cursor: 'pointer',
                  }}
                >
                  <Sparkles size={14} />
                  <span>Chọn làm điểm hẹn</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL MÃ QR CHECK-IN TẠI QUÁN (IN & TẢI XUỐNG) */}
      {showCheckinQrModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              textAlign: 'center',
            }}
          >
            <button
              onClick={() => setShowCheckinQrModal(false)}
              style={{
                position: 'absolute',
                top: '18px',
                right: '18px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94A3B8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                backgroundColor: '#EFF6FF',
                color: '#2563EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px auto',
              }}
            >
              <QrCode size={28} />
            </div>

            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginBottom: '4px' }}>
              Mã QR Check-in Quán ☕
            </h3>
            <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '18px', lineHeight: '1.4' }}>
              In và dán mã này tại bàn hoặc quầy thu ngân. Sinh viên quét mã bằng ứng dụng UNI-MATE để nhận UniCoin.
            </p>

            {loadingQr ? (
              <div style={{ padding: '60px 0', color: '#64748B' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px auto' }} />
                <div style={{ fontSize: '13px' }}>Đang tải mã QR của quán...</div>
              </div>
            ) : checkinQrData ? (
              <div>
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    border: '2px dashed #2563EB',
                    borderRadius: '20px',
                    padding: '18px',
                    margin: '0 auto 16px auto',
                    maxWidth: '240px',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.08)',
                  }}
                >
                  <img
                    src={checkinQrData.qrImageUrl}
                    alt="Checkin QR"
                    style={{ width: '100%', height: 'auto', display: 'block', borderRadius: '10px' }}
                  />
                  <div style={{ fontSize: '12px', fontWeight: '800', color: '#1E40AF', marginTop: '10px' }}>
                    {displayName || 'Quán Đối Tác'}
                  </div>
                  <div style={{ fontSize: '11px', color: '#16A34A', fontWeight: '700', marginTop: '2px' }}>
                    +20 UniCoin cho sinh viên
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '11px',
                    color: '#64748B',
                    backgroundColor: '#F8FAFC',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    marginBottom: '18px',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                  }}
                >
                  {checkinQrData.qrContent}
                </div>

                <div style={{ display: 'flex', gap: '10px', marginBottom: '10px' }}>
                  <button
                    type="button"
                    onClick={handlePrintQr}
                    style={{
                      flex: 1,
                      padding: '12px',
                      borderRadius: '12px',
                      border: 'none',
                      backgroundColor: '#2563EB',
                      color: '#FFFFFF',
                      fontSize: '13.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                    }}
                  >
                    <Printer size={16} /> In / Tải mã QR
                  </button>
                </div>

                <button
                  type="button"
                  disabled={regeneratingQr}
                  onClick={handleRegenerateQr}
                  style={{
                    width: '100%',
                    padding: '9px',
                    borderRadius: '10px',
                    border: '1px solid #CBD5E1',
                    backgroundColor: '#FFFFFF',
                    color: '#64748B',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: regeneratingQr ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {regeneratingQr ? (
                    <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Tạo lại mã QR mới (khi ảnh cũ bị lộ)
                </button>
              </div>
            ) : (
              <div style={{ padding: '30px 0', color: '#DC2626' }}>
                Không tìm thấy mã QR check-in
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
