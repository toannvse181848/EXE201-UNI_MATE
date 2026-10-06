import React, { useState } from 'react';
import {
  Store,
  Save,
  Zap,
  Phone,
  MapPin,
  Clock,
  DollarSign,
  Tag,
  Star,
  Wifi,
  BatteryCharging,
  Sparkles,
  Check,
  Upload,
  Image as ImageIcon,
  Trash2,
  Plus,
  Crown,
  Link as LinkIcon,
} from 'lucide-react';
import { venueApi } from '../../services/api';
import VenueImageCarousel from '../../components/VenueImageCarousel';

export default function VenueManagement() {
  const [venueId, setVenueId] = useState(null);
  const [formData, setFormData] = useState({
    name: 'The Coffee House - Sư Vạn Hạnh',
    description: 'Quán có không gian mở 3 tầng, thích hợp cho sinh viên học tập và làm việc nhóm. Wifi tốc độ cao, mỗi bàn đều có ổ cắm riêng biệt.',
    phone: '1800 6936',
    priceMin: '35.000',
    priceMax: '75.000',
    address: '798 Sư Vạn Hạnh, Phường 12, Quận 10, TP.HCM',
    openTime: '07:00',
    closeTime: '22:30',
    tags: ['Cafe', 'Học tập', 'Wifi mạnh', 'Yên tĩnh'],
    voucherTitle: 'Giảm 20% tổng hoá đơn',
    images: [
      'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800',
      'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
      'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
      'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
    ],
  });

  const [newTag, setNewTag] = useState('');
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);

  React.useEffect(() => {
    const loadMyVenue = async () => {
      try {
        const res = await venueApi.getMyVenues();
        if (res?.data && res.data.length > 0) {
          const v = res.data[0];
          setVenueId(v._id || v.id);
          setFormData((prev) => ({
            ...prev,
            name: v.name || prev.name,
            description: v.description || prev.description,
            phone: v.phone || prev.phone,
            address: v.address || prev.address,
            tags: v.tags?.length ? v.tags : prev.tags,
            images: v.images?.length
              ? v.images
              : v.image
              ? [v.image]
              : prev.images,
          }));
        }
      } catch (err) {
        console.log('Backend my venues note:', err.message);
      }
    };
    loadMyVenue();
  }, []);

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

    const payload = {
      name: formData.name,
      description: formData.description,
      phone: formData.phone,
      address: formData.address,
      tags: formData.tags,
      images: formData.images,
      image: formData.images[0] || '',
    };

    setIsSaving(true);
    try {
      if (venueId) {
        await venueApi.updateVenue(venueId, payload);
      } else {
        const res = await venueApi.createVenue(payload);
        if (res?.data?._id) setVenueId(res.data._id);
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      alert('Lưu thông tin quán thất bại: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Quản lý địa điểm
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Cập nhật thông tin cơ sở, ảnh không gian và xem trước giao diện vuốt ảnh trực tiếp trên app di động UNI-MATE.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setIsBoosted(!isBoosted)}
            className={`btn ${isBoosted ? 'btn-secondary' : 'btn-primary'}`}
            style={{
              backgroundColor: isBoosted ? '#FFECE6' : 'var(--primary)',
              color: isBoosted ? 'var(--primary)' : '#fff',
            }}
          >
            <Zap size={16} />
            <span>{isBoosted ? 'Đang Boost (Ưu tiên)' : 'Boost địa điểm'}</span>
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

      {savedSuccess && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #A7F3D0',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
            fontWeight: '700',
          }}
        >
          <Check size={18} />
          <span>Thông tin địa điểm và album ảnh đã được cập nhật đồng bộ lên toàn hệ thống app UNI-MATE!</span>
        </div>
      )}

      {/* Main Split: Form on Left, Live Mobile Preview on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '28px' }}>
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
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
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
                  Tên địa điểm / Cơ sở
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  Địa chỉ cụ thể
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-color)',
                    fontSize: '14px',
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
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
          <div style={{ position: 'sticky', top: '90px' }}>
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
                alt={formData.name}
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
                      Cách 650m
                    </div>
                  </>
                }
              />

              {/* Mobile Content Area */}
              <div style={{ padding: '16px', backgroundColor: '#FFFFFF', borderTopLeftRadius: '20px', borderTopRightRadius: '20px', marginTop: '-12px', position: 'relative', zIndex: 5 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: '#1A1A24', flex: 1, marginRight: '6px' }}>
                    {formData.name || 'Tên quán'}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '3px', backgroundColor: '#FEF3C7', padding: '2px 6px', borderRadius: '6px' }}>
                    <Star size={10} color="#D97706" fill="#D97706" />
                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#D97706' }}>4.8</span>
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
                      {formData.voucherTitle}
                    </span>
                    <p style={{ fontSize: '9px', color: '#9A3412' }}>Ưu đãi cho cặp đôi UNI-MATE</p>
                  </div>
                  <span style={{ fontSize: '10px', fontWeight: '800', color: '#fff', backgroundColor: 'var(--primary)', padding: '3px 8px', borderRadius: '6px' }}>
                    Lấy mã
                  </span>
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
    </div>
  );
}
