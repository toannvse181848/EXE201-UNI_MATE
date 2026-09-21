import React, { useState } from 'react';
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
} from 'lucide-react';

const MOCK_VENUES = [
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
    voucher: 'Giảm 25% tổng bill cho sinh viên có thẻ SV',
    voucherCode: 'UNI-TCH-25',
  },
  {
    id: 'v2',
    name: 'Cheese Coffee - D2 Hàng Xanh',
    address: '15 Nguyễn Gia Trí (D2), Q. Bình Thạnh',
    distance: '1.2 km',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=600',
    rating: 4.9,
    reviews: 412,
    priceRange: '42.000đ - 65.000đ',
    amenities: ['Wifi cực mạnh', 'Bàn làm việc đơn', 'Cà phê specialty', 'View kính đẹp'],
    tags: ['Thiết kế đẹp', 'Hẹn hò cạ cứng', 'Có voucher SV'],
    hours: '07:30 - 22:30',
    voucher: 'Mua 1 tặng 1 Trà sữa Cam sả',
    voucherCode: 'CHEESE-UNI-BOGO',
  },
  {
    id: 'v3',
    name: 'Cú Đêm 24/7 Study Hub Cafe',
    address: 'Khu Đô Thị ĐHQG TP.HCM, TP. Thủ Đức',
    distance: '1.8 km',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600',
    rating: 4.7,
    reviews: 189,
    priceRange: '29.000đ - 45.000đ',
    amenities: ['Mở 24/7', 'Mỗi ghế 2 ổ cắm', 'Khu im lặng tuyệt đối', 'In ấn tài liệu'],
    tags: ['Mở 24/7', 'Cày deadline', 'Sinh viên Làng ĐH'],
    hours: 'Mở cửa 24/7',
    voucher: 'Combo Cày Đêm: Cà phê + Bánh ngọt chỉ 39k',
    voucherCode: 'CUDEM-NIGHT-39',
  },
  {
    id: 'v4',
    name: 'Phúc Long Coffee & Tea - Lê Văn Việt',
    address: 'Vincom Plaza Lê Văn Việt, TP. Thủ Đức',
    distance: '2.5 km',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=600',
    rating: 4.6,
    reviews: 320,
    priceRange: '45.000đ - 70.000đ',
    amenities: ['Wifi ổn định', 'Trà đào signature', 'Chỗ đậu xe rộng', 'Gần FPT/HUTECH'],
    tags: ['Trà sữa', 'Gần trường ĐH'],
    hours: '08:00 - 22:00',
    voucher: 'Tặng 1 topping trân châu cho hóa đơn từ 45k',
    voucherCode: 'PL-TOPPING-FREE',
  },
];

export default function UserVenues() {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('Tất cả');
  const [claimedCodes, setClaimedCodes] = useState({});

  const handleClaimVoucher = (venueId, code) => {
    setClaimedCodes({ ...claimedCodes, [venueId]: true });
    alert(`🎉 Đã lưu voucher [${code}] vào ví voucher của bạn! Bạn có thể xem mã QR ở tab "Ví Voucher của tôi".`);
  };

  const filteredVenues = MOCK_VENUES.filter((venue) => {
    const matchesSearch = venue.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
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
          Tuyển chọn quán cafe có wifi mạnh, ổ cắm điện đầy đủ, không gian yên tĩnh và ưu đãi riêng cho sinh viên.
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

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {['Tất cả', 'Có Voucher SV', 'Mở 24/7', 'Yên tĩnh'].map((filter) => (
            <button
              key={filter}
              onClick={() => setActiveFilter(filter)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '12.5px',
                fontWeight: '700',
                backgroundColor: activeFilter === filter ? '#FF5722' : '#FFFFFF',
                color: activeFilter === filter ? '#FFFFFF' : 'var(--text-secondary)',
                border: activeFilter === filter ? '1px solid #FF5722' : '1px solid var(--border-color)',
                cursor: 'pointer',
              }}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Venues Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '24px' }}>
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
                <span style={{ color: 'var(--text-muted)', fontWeight: '400' }}>({venue.reviews})</span>
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
              <h3 style={{ fontSize: '17px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>
                {venue.name}
              </h3>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                <MapPin size={14} color="#FF5722" />
                <span>{venue.address} • <strong>{venue.distance}</strong></span>
              </div>

              {/* Price & Amenities */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px' }}>
                {venue.amenities.map((item) => (
                  <span
                    key={item}
                    style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '3px 8px',
                      borderRadius: '8px',
                      backgroundColor: '#F1F5F9',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <Zap size={11} color="#FF5722" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>

              {/* Voucher Box */}
              {venue.voucher && (
                <div
                  style={{
                    backgroundColor: '#FEF3C7',
                    border: '1px dashed #F59E0B',
                    borderRadius: '12px',
                    padding: '12px',
                    marginBottom: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Ticket size={18} color="#D97706" />
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '800', color: '#92400E' }}>
                        Ưu đãi SV độc quyền:
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#B45309' }}>
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
                      backgroundColor: claimedCodes[venue.id] ? '#FF7043' : '#D97706',
                      color: '#FFFFFF',
                      fontSize: '11px',
                      fontWeight: '800',
                      cursor: claimedCodes[venue.id] ? 'default' : 'pointer',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {claimedCodes[venue.id] ? (
                      <>
                        <CheckCircle2 size={12} />
                        <span>Đã lưu</span>
                      </>
                    ) : (
                      <span>Lưu mã</span>
                    )}
                  </button>
                </div>
              )}

              {/* Actions Footer */}
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                  {venue.priceRange}
                </span>

                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(venue.name + ' ' + venue.address)}`}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#FF5722',
                  }}
                >
                  <span>Mở bản đồ</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

