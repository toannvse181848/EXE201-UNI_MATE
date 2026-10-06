import React, { useState, useEffect, useCallback } from 'react';
import {
  Coffee,
  MapPin,
  Star,
  Wifi,
  Zap,
  Volume2,
  Clock,
  Ticket,
  Search,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Store,
  X,
  Sparkles,
  Phone,
} from 'lucide-react';
import { venueApi, voucherApi } from '../../services/api';
import VenueImageCarousel from '../../components/VenueImageCarousel';

export default function UserVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [claimedCodes, setClaimedCodes] = useState({});
  const [claimingVenueId, setClaimingVenueId] = useState(null);
  const [selectedVenueModal, setSelectedVenueModal] = useState(null);

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true);
      const [venuesRes, vouchersRes, walletRes] = await Promise.allSettled([
        venueApi.getPublicVenues(),
        voucherApi.getPublicVouchers(),
        voucherApi.getMyWallet(),
      ]);
      if (venuesRes.status === 'rejected') throw venuesRes.reason;
      const realData = venuesRes.value?.data || [];

      // Voucher đang chạy của từng quán (lấy voucher mới nhất)
      const voucherByVenue = {};
      (vouchersRes.status === 'fulfilled' ? vouchersRes.value?.data || [] : []).forEach((vch) => {
        const vId = vch.venueId?._id || vch.venueId;
        if (vId && !voucherByVenue[vId]) voucherByVenue[vId] = vch;
      });

      // Những voucher sinh viên đã lưu vào ví
      const walletVoucherIds = new Set(
        (walletRes.status === 'fulfilled' ? walletRes.value?.data || [] : []).map(
          (uv) => uv.voucherId?._id || uv.voucherId
        )
      );

      if (realData.length > 0) {
        const formatted = realData.map((v, idx) => {
          // Chuẩn hóa danh sách ảnh (nhiều ảnh để vuốt)
          const venueImages =
            Array.isArray(v.images) && v.images.length > 0
              ? v.images
              : v.image
              ? [
                  v.image,
                  'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
                  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
                ]
              : [
                  idx % 2 === 0
                    ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=800'
                    : 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
                  'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=800',
                  'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=800',
                ];

          return {
            id: v._id,
            name: v.name,
            address: v.address,
            phone: v.phone || '0901 234 567',
            description: v.description || 'Không gian học tập và kết nối lý tưởng dành cho sinh viên.',
            distance: `${(Math.random() * 2 + 0.3).toFixed(1)} km`,
            image: venueImages[0],
            images: venueImages,
            rating: v.rating || 4.8,
            reviews: v.reviewCount || 120 + idx * 25,
            priceRange: v.priceRange
              ? `${v.priceRange.min?.toLocaleString('vi-VN')}đ - ${v.priceRange.max?.toLocaleString('vi-VN')}đ`
              : '35.000đ - 55.000đ',
            amenities:
              v.amenities && Array.isArray(v.amenities) && v.amenities.length > 0
                ? v.amenities
                : ['Wifi tốc độ cao', 'Ổ cắm điện', 'Máy lạnh 24/7'],
            tags: v.tags?.length > 0 ? v.tags : ['Yên tĩnh', 'Học bài', 'Có voucher SV'],
            hours: v.openingHours || v.openHours || '07:00 - 23:00',
            voucher: voucherByVenue[v._id]?.title || null,
            voucherId: voucherByVenue[v._id]?._id || null,
            voucherCode: voucherByVenue[v._id]?.code || null,
          };
        });
        setVenues(formatted);
        setClaimedCodes(
          formatted.reduce((acc, venue) => {
            if (venue.voucherId && walletVoucherIds.has(venue.voucherId)) acc[venue.id] = true;
            return acc;
          }, {})
        );
      } else {
        setVenues([]);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách quán:', err);
      setVenues([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleClaimVoucher = async (venue) => {
    if (!venue?.voucherId || claimedCodes[venue.id] || claimingVenueId) return;
    setClaimingVenueId(venue.id);
    try {
      await voucherApi.claimVoucher(venue.voucherId);
      setClaimedCodes((prev) => ({ ...prev, [venue.id]: true }));
      alert(`🎉 Đã lưu voucher [${venue.voucherCode}] vào ví voucher của bạn! Bạn có thể xem mã QR ở mục "Ví Voucher của tôi".`);
    } catch (err) {
      alert('Không thể nhận voucher: ' + err.message);
    } finally {
      setClaimingVenueId(null);
    }
  };

  const filteredVenues = venues.filter((venue) => {
    const matchesSearch =
      venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      venue.address.toLowerCase().includes(searchTerm.toLowerCase());
    if (activeFilter === 'Tất cả') return matchesSearch;
    if (activeFilter === 'Có Voucher SV') return matchesSearch && venue.voucher;
    if (activeFilter === 'Mở 24/7') return matchesSearch && venue.hours.includes('24/7');
    if (activeFilter === 'Yên tĩnh') return matchesSearch && venue.tags.includes('Yên tĩnh');
    return matchesSearch;
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>
          Quán Cafe & Không gian Học bài Sinh viên ☕📚
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
          Tuyển chọn quán cafe đối tác của UNI-MATE. Bạn có thể <strong>vuốt trái/phải</strong> trên ảnh quán để xem nhiều góc không gian học tập và menu đồ uống.
        </p>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: '1',
            minWidth: '280px',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            padding: '10px 16px',
            border: '1.5px solid var(--border-color)',
          }}
        >
          <Search size={18} color="var(--text-muted)" style={{ marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Tìm theo tên quán, địa chỉ (VD: The Coffee House, Quận 10...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              outline: 'none',
              width: '100%',
              fontSize: '14px',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Tất cả', 'Có Voucher SV', 'Mở 24/7', 'Yên tĩnh'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: activeFilter === filter ? 'none' : '1px solid var(--border-color)',
                backgroundColor: activeFilter === filter ? 'var(--primary)' : '#FFFFFF',
                color: activeFilter === filter ? '#FFFFFF' : 'var(--text-secondary)',
                fontWeight: activeFilter === filter ? '700' : '500',
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                height: '380px',
                border: '1px solid var(--border-color)',
                animation: 'pulse 1.5s infinite ease-in-out',
              }}
            />
          ))}
        </div>
      ) : filteredVenues.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '60px 20px',
            backgroundColor: '#FFFFFF',
            borderRadius: '20px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Coffee size={48} color="#FFCCBC" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Không tìm thấy quán phù hợp
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '6px' }}>
            Hãy thử tìm bằng từ khoá khác hoặc bỏ bớt bộ lọc bạn nhé!
          </p>
        </div>
      ) : (
        /* Venue Cards Grid */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
          }}
        >
          {filteredVenues.map((venue) => (
            <div
              key={venue.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '20px',
                overflow: 'hidden',
                border: '1px solid var(--border-color)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s ease, box-shadow 0.2s ease',
              }}
            >
              {/* Image Carousel (Hỗ trợ vuốt trái / phải) */}
              <VenueImageCarousel
                images={venue.images}
                height="210px"
                borderRadius="19px 19px 0 0"
                alt={venue.name}
                showDots={true}
                showArrows={true}
                showCounter={true}
                onImageClick={() => setSelectedVenueModal(venue)}
                overlayBadges={
                  <>
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        left: '12px',
                        backgroundColor: '#FFFFFF',
                        padding: '4px 10px',
                        borderRadius: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        fontWeight: '800',
                        color: '#B45309',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
                        zIndex: 4,
                      }}
                    >
                      <Star size={13} fill="#F59E0B" color="#F59E0B" />
                      <span>{venue.rating}</span>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>
                        ({venue.reviews})
                      </span>
                    </div>

                    <div
                      style={{
                        position: 'absolute',
                        bottom: '12px',
                        left: '12px',
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        backdropFilter: 'blur(4px)',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        color: '#FFFFFF',
                        fontSize: '11.5px',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        zIndex: 4,
                      }}
                    >
                      <Clock size={12} color="#FFB74D" />
                      <span>{venue.hours}</span>
                    </div>
                  </>
                }
              />

              {/* Content Details */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                  <h3
                    onClick={() => setSelectedVenueModal(venue)}
                    style={{
                      fontSize: '17px',
                      fontWeight: '800',
                      color: 'var(--text-primary)',
                      cursor: 'pointer',
                      flex: 1,
                    }}
                  >
                    {venue.name}
                  </h3>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '10px',
                  }}
                >
                  <MapPin size={14} color="#FF5722" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {venue.address} • <strong>{venue.distance}</strong>
                  </span>
                </div>

                {/* Tags */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginBottom: '12px' }}>
                  {venue.tags.map((tag, i) => (
                    <span
                      key={i}
                      style={{
                        fontSize: '11px',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#FFECE6',
                        color: 'var(--primary)',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Amenities */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                  {venue.amenities.map((item) => (
                    <span
                      key={item}
                      style={{
                        fontSize: '11px',
                        fontWeight: '600',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        backgroundColor: '#F1F5F9',
                        color: '#475569',
                      }}
                    >
                      {item}
                    </span>
                  ))}
                </div>

                {/* Voucher Highlight */}
                {venue.voucher && (
                  <div
                    style={{
                      marginTop: 'auto',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: '#FFF3E0',
                      border: '1px dashed #FFCC80',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                      <Ticket size={18} color="#FF5722" />
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: '800', color: '#E64A19' }}>
                          ƯU ĐÃI SINH VIÊN
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: '600' }}>
                          {venue.voucher}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleClaimVoucher(venue)}
                      disabled={claimedCodes[venue.id] || claimingVenueId === venue.id}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        backgroundColor: claimedCodes[venue.id] ? '#10B981' : '#FF5722',
                        color: '#FFFFFF',
                        border: 'none',
                        fontSize: '11.5px',
                        fontWeight: '700',
                        cursor: claimedCodes[venue.id] ? 'default' : 'pointer',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {claimedCodes[venue.id] ? 'Đã lưu ví ✓' : claimingVenueId === venue.id ? 'Đang lưu...' : 'Nhận mã'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal xem chi tiết quán & Phóng to album ảnh */}
      {selectedVenueModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '20px',
          }}
          onClick={() => setSelectedVenueModal(null)}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              maxWidth: '680px',
              width: '100%',
              overflow: 'hidden',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
              position: 'relative',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedVenueModal(null)}
              style={{
                position: 'absolute',
                top: '14px',
                right: '14px',
                zIndex: 10,
                backgroundColor: 'rgba(0,0,0,0.6)',
                color: '#fff',
                border: 'none',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>

            {/* Modal Image Carousel: Vuốt ảnh lớn */}
            <div style={{ width: '100%' }}>
              <VenueImageCarousel
                images={selectedVenueModal.images}
                height="320px"
                borderRadius="0"
                alt={selectedVenueModal.name}
                showDots={true}
                showArrows={true}
                showCounter={true}
              />
            </div>

            {/* Modal Body Info */}
            <div style={{ padding: '24px', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: '900', color: 'var(--text-primary)' }}>
                  {selectedVenueModal.name}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF3C7', padding: '4px 10px', borderRadius: '8px' }}>
                  <Star size={14} fill="#F59E0B" color="#F59E0B" />
                  <span style={{ fontSize: '13px', fontWeight: '800', color: '#D97706' }}>
                    {selectedVenueModal.rating} ({selectedVenueModal.reviews} đánh giá)
                  </span>
                </div>
              </div>

              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '22px' }}>
                {selectedVenueModal.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <MapPin size={16} color="var(--primary)" />
                  <span>{selectedVenueModal.address}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Clock size={16} color="#10B981" />
                  <span>{selectedVenueModal.hours}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Phone size={16} color="#6366F1" />
                  <span>{selectedVenueModal.phone}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  <Coffee size={16} color="#F59E0B" />
                  <span>{selectedVenueModal.priceRange}</span>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '16px' }}>
                {selectedVenueModal.voucherId ? (
                  <button
                    onClick={() => handleClaimVoucher(selectedVenueModal)}
                    disabled={claimedCodes[selectedVenueModal.id] || claimingVenueId === selectedVenueModal.id}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    <Ticket size={16} />
                    <span>{claimedCodes[selectedVenueModal.id] ? 'Đã lưu voucher vào ví' : 'Lấy mã ưu đãi ngay'}</span>
                  </button>
                ) : (
                  <span style={{ flex: 1, fontSize: '13px', color: 'var(--text-muted)' }}>
                    Quán chưa có voucher đang chạy
                  </span>
                )}
                <button
                  onClick={() => setSelectedVenueModal(null)}
                  className="btn btn-secondary"
                  style={{ padding: '12px 20px' }}
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
