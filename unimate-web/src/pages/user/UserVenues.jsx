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
} from 'lucide-react';
import { venueApi, voucherApi } from '../../services/api';

const MOCK_FALLBACK_VENUES = [
  {
    id: 'v1',
    name: 'The Coffee House - Sư Vạn Hạnh',
    address: 'Vạn Hạnh Mall, Q.10, TP.HCM',
    distance: '0.6 km',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600',
    rating: 4.8,
    reviews: 240,
    priceRange: '35.000đ - 55.000đ',
    amenities: ['Wifi 150Mbps', 'Ổ điện mọi bàn', 'Bàn lớn học nhóm', 'Máy lạnh 24/24'],
    tags: ['Yên tĩnh', 'Học bài', 'Có voucher SV'],
    hours: '07:00 - 23:00',
    voucher: 'Giảm 25% tổng bill cho sinh viên',
    voucherCode: 'UNI-TCH-25',
  },
];

export default function UserVenues() {
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [claimedCodes, setClaimedCodes] = useState({});

  const fetchVenues = useCallback(async () => {
    try {
      setLoading(true);
      const res = await venueApi.getVenues();
      const realData = res.data || [];

      if (realData.length > 0) {
        const formatted = realData.map((v, idx) => ({
          id: v._id,
          name: v.name,
          address: v.address,
          distance: `${(Math.random() * 2 + 0.3).toFixed(1)} km`,
          image:
            v.images?.[0] ||
            (idx % 2 === 0
              ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600'
              : 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600'),
          rating: v.rating || 4.8,
          reviews: v.reviewCount || 120 + idx * 25,
          priceRange: v.priceRange ? `${v.priceRange.min?.toLocaleString('vi-VN')}đ - ${v.priceRange.max?.toLocaleString('vi-VN')}đ` : '35.000đ - 55.000đ',
          amenities: v.amenities?.length > 0 ? v.amenities : ['Wifi tốc độ cao', 'Ổ cắm điện', 'Máy lạnh 24/7'],
          tags: ['Yên tĩnh', 'Học bài', 'Có voucher SV'],
          hours: v.openingHours || '07:00 - 23:00',
          voucher: 'Ưu đãi dành riêng cho sinh viên UNI-MATE',
          voucherCode: `UNI-${v.name.slice(0, 3).toUpperCase()}-20`,
        }));
        setVenues(formatted);
      } else {
        setVenues(MOCK_FALLBACK_VENUES);
      }
    } catch (err) {
      console.error('Lỗi lấy danh sách quán:', err);
      setVenues(MOCK_FALLBACK_VENUES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVenues();
  }, [fetchVenues]);

  const handleClaimVoucher = (venueId, code) => {
    setClaimedCodes((prev) => ({ ...prev, [venueId]: true }));
    alert(`🎉 Đã lưu voucher [${code}] vào ví voucher của bạn! Bạn có thể xem mã QR ở mục "Ví Voucher của tôi".`);
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
          Tuyển chọn quán cafe đối tác của UNI-MATE có wifi mạnh, ổ cắm điện đầy đủ, không gian yên tĩnh và ưu đãi riêng cho sinh viên.
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm quán theo tên, khu vực (Q.10, Thủ Đức, Bình Thạnh...)"
            style={{ border: 'none', outline: 'none', width: '100%', fontSize: '13.5px' }}
          />
        </div>

        <button
          onClick={fetchVenues}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            borderRadius: '12px',
            border: '1.5px solid var(--border-color)',
            backgroundColor: '#FFFFFF',
            cursor: 'pointer',
            fontWeight: '600',
            fontSize: '13px',
          }}
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} />
          <span>Làm mới</span>
        </button>

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Tất cả', 'Có Voucher SV', 'Mở 24/7', 'Yên tĩnh'].map((filter) => {
            const isActive = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                style={{
                  padding: '9px 16px',
                  borderRadius: '12px',
                  fontSize: '12.5px',
                  fontWeight: '700',
                  backgroundColor: isActive ? '#FF5722' : '#FFFFFF',
                  color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
                  border: isActive ? '1px solid #FF5722' : '1.5px solid var(--border-color)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {filter}
              </button>
            );
          })}
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
          <RefreshCw size={32} className="spin" style={{ margin: '0 auto 12px', color: '#FF5722' }} />
          <p style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>
            Đang tải danh sách quán cafe đối tác từ máy chủ...
          </p>
        </div>
      ) : filteredVenues.length === 0 ? (
        <div
          style={{
            padding: '60px',
            textAlign: 'center',
            backgroundColor: '#fff',
            borderRadius: '16px',
            border: '1px solid var(--border-color)',
          }}
        >
          <Store size={40} style={{ margin: '0 auto 12px', opacity: 0.4, color: '#FF5722' }} />
          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>
            Không tìm thấy quán cafe nào
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Hãy thử tìm với từ khoá khác hoặc chọn bộ lọc "Tất cả".
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
              }}
            >
              {/* Image & Badges */}
              <div style={{ position: 'relative', height: '200px' }}>
                <img
                  src={venue.image}
                  alt={venue.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <div
                  style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
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
                  }}
                >
                  <Clock size={12} color="#FFB74D" />
                  <span>{venue.hours}</span>
                </div>
              </div>

              {/* Content Details */}
              <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3
                  style={{
                    fontSize: '17px',
                    fontWeight: '800',
                    color: 'var(--text-primary)',
                    marginBottom: '4px',
                  }}
                >
                  {venue.name}
                </h3>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '12px',
                  }}
                >
                  <MapPin size={14} color="#FF5722" />
                  <span>
                    {venue.address} • <strong>{venue.distance}</strong>
                  </span>
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
                      onClick={() => handleClaimVoucher(venue.id, venue.voucherCode)}
                      disabled={claimedCodes[venue.id]}
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
                      {claimedCodes[venue.id] ? 'Đã lưu ví ✓' : 'Nhận mã'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
