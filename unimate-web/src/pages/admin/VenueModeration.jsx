import React, { useState, useEffect } from 'react';
import {
  Store,
  Search,
  Check,
  X,
  AlertOctagon,
  Eye,
  MapPin,
  Phone,
  Calendar,
  Filter,
} from 'lucide-react';
import { venueApi } from '../../services/api';

const INITIAL_VENUES = [
  {
    id: 'v1',
    name: 'The Coffee House - Sư Vạn Hạnh',
    owner: 'Nguyễn Văn Hùng',
    phone: '0901 234 567',
    district: 'Quận 10, TP.HCM',
    registeredAt: '12/10/2024',
    status: 'active', // 'active' | 'pending' | 'suspended'
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200',
    vouchersCount: 3,
  },
  {
    id: 'v2',
    name: 'Highlands Coffee - Vạn Hạnh Mall',
    owner: 'Trần Thị Thu Thảo',
    phone: '0912 345 678',
    district: 'Quận 10, TP.HCM',
    registeredAt: '14/10/2024',
    status: 'active',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=200',
    vouchersCount: 2,
  },
  {
    id: 'v3',
    name: 'The Workshop Boardgame Cafe',
    owner: 'Lê Minh Tuấn',
    phone: '0988 765 432',
    district: 'Quận 5, TP.HCM',
    registeredAt: '18/10/2024',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?w=200',
    vouchersCount: 1,
  },
  {
    id: 'v4',
    name: 'Trà Sữa KOI Thé - Nguyễn Tri Phương',
    owner: 'Phạm Hoàng Khang',
    phone: '0933 112 233',
    district: 'Quận 10, TP.HCM',
    registeredAt: '19/10/2024',
    status: 'pending',
    image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=200',
    vouchersCount: 2,
  },
  {
    id: 'v5',
    name: 'Tiệm Trà Tháng 5 (Gần ĐH Bách Khoa)',
    owner: 'Võ Quốc Bảo',
    phone: '0977 445 566',
    district: 'Quận 10, TP.HCM',
    registeredAt: '05/09/2024',
    status: 'suspended',
    image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=200',
    vouchersCount: 0,
  },
];

export default function VenueModeration() {
  const [venues, setVenues] = useState(INITIAL_VENUES);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState(null);

  React.useEffect(() => {
    const fetchVenues = async () => {
      try {
        const res = await venueApi.getAllVenuesAdmin();
        if (res?.data && res.data.length > 0) {
          const mapped = res.data.map((v) => ({
            id: v._id || v.id,
            name: v.name,
            owner: v.partnerId?.fullName || 'Đối tác',
            phone: v.partnerId?.phone || '0901 234 567',
            district: v.district || 'TP.HCM',
            registeredAt: new Date(v.createdAt).toLocaleDateString('vi-VN'),
            status: v.status === 'approved' ? 'active' : v.status,
            image: v.image,
            vouchersCount: 2,
          }));
          setVenues(mapped);
        }
      } catch (err) {
        console.log('Backend venues note:', err.message);
      }
    };
    fetchVenues();
  }, []);

  const handleAction = async (id, newStatus, venueName) => {
    // Cập nhật UI ngay lập tức
    setVenues(
      venues.map((v) => (v.id === id ? { ...v, status: newStatus } : v))
    );
    const actionText =
      newStatus === 'active'
        ? `Đã phê duyệt địa điểm "${venueName}" thành công!`
        : newStatus === 'suspended'
        ? `Đã tạm khóa địa điểm "${venueName}".`
        : `Đã từ chối hồ sơ "${venueName}".`;
    setFeedbackMsg(actionText);
    setTimeout(() => setFeedbackMsg(null), 3500);

    // Gửi request lên backend nếu có ID từ database
    try {
      const backendStatus = newStatus === 'active' ? 'approved' : newStatus === 'suspended' ? 'rejected' : 'rejected';
      await venueApi.updateVenueStatus(id, backendStatus);
    } catch (err) {
      console.log('Backend sync notice:', err.message);
    }
  };


  const filteredVenues = venues.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.owner.toLowerCase().includes(search.toLowerCase()) ||
      v.district.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || v.status === activeTab;
    return matchSearch && matchTab;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Quản lý & Duyệt Địa điểm (187 quán)
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Kiểm duyệt hồ sơ đối tác mới và giám sát các cơ sở cafe đang hiển thị trên ứng dụng UNI-MATE.
        </p>
      </div>

      {feedbackMsg && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            color: '#065F46',
            padding: '12px 18px',
            borderRadius: '12px',
            border: '1px solid #A7F3D0',
            fontSize: '14px',
            fontWeight: '700',
          }}
        >
          {feedbackMsg}
        </div>
      )}

      {/* Filter Tabs & Search */}
      <div className="portal-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {[
              { id: 'all', label: 'Tất cả (187)' },
              { id: 'pending', label: 'Chờ duyệt (12)', alert: true },
              { id: 'active', label: 'Đang hoạt động (152)' },
              { id: 'suspended', label: 'Bị tạm khóa (6)' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  backgroundColor: activeTab === tab.id ? 'var(--indigo)' : 'var(--bg-page)',
                  color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--indigo)' : 'var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{tab.label}</span>
                {tab.alert && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '3px', backgroundColor: '#EF4444' }} />
                )}
              </button>
            ))}
          </div>

          {/* Search */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-page)',
              border: '1px solid var(--border-color)',
              borderRadius: '10px',
              padding: '6px 12px',
              width: '280px',
            }}
          >
            <Search size={16} color="var(--text-muted)" style={{ marginRight: '8px' }} />
            <input
              type="text"
              placeholder="Tìm quán, chủ quán, quận..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '13px',
                width: '100%',
              }}
            />
          </div>
        </div>
      </div>

      {/* Venues Moderation Table */}
      <div className="portal-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800' }}>
                <th style={{ padding: '14px 20px' }}>ĐỊA ĐIỂM & HÌNH ẢNH</th>
                <th style={{ padding: '14px 16px' }}>CHỦ CƠ SỞ & LIÊN HỆ</th>
                <th style={{ padding: '14px 16px' }}>KHU VỰC</th>
                <th style={{ padding: '14px 16px' }}>NGÀY ĐĂNG KÝ</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>VOUCHER</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>DUYỆT & XỬ LÝ</th>
              </tr>
            </thead>
            <tbody>
              {filteredVenues.map((v) => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '14px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={v.image}
                        alt={v.name}
                        style={{ width: '48px', height: '48px', borderRadius: '10px', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>
                          {v.name}
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          ID: {v.id.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>{v.owner}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{v.phone}</div>
                  </td>

                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                    {v.district}
                  </td>

                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {v.registeredAt}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'center', fontWeight: '700' }}>
                    {v.vouchersCount}
                  </td>

                  <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                    {v.status === 'active' && <span className="badge badge-success">HOẠT ĐỘNG</span>}
                    {v.status === 'pending' && <span className="badge badge-warning">CHỜ DUYỆT</span>}
                    {v.status === 'suspended' && <span className="badge badge-danger">TẠM KHÓA</span>}
                  </td>

                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    {v.status === 'pending' ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px' }}>
                        <button
                          onClick={() => handleAction(v.id, 'active', v.name)}
                          className="btn btn-primary"
                          style={{ backgroundColor: '#10B981', padding: '6px 12px', fontSize: '12px' }}
                        >
                          <Check size={14} />
                          <span>Duyệt</span>
                        </button>
                        <button
                          onClick={() => handleAction(v.id, 'suspended', v.name)}
                          className="btn btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#EF4444' }}
                        >
                          <X size={14} />
                          <span>Từ chối</span>
                        </button>
                      </div>
                    ) : v.status === 'active' ? (
                      <button
                        onClick={() => handleAction(v.id, 'suspended', v.name)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#EF4444' }}
                      >
                        <span>Tạm khóa</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleAction(v.id, 'active', v.name)}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '12px', color: '#10B981' }}
                      >
                        <span>Mở lại</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
