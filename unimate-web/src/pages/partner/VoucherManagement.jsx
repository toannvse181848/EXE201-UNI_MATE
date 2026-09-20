import React, { useState } from 'react';
import {
  Ticket,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  PauseCircle,
  XCircle,
  Eye,
  Edit2,
  Trash2,
  Calendar,
  Layers,
} from 'lucide-react';

const INITIAL_VOUCHERS = [
  {
    id: 'vch_01',
    name: 'Giảm 20% Hóa Đơn Trưa',
    code: 'LUNCH20',
    type: 'Phần trăm (%)',
    value: '20% (Tối đa 50k)',
    total: 1000,
    issued: 450,
    used: 320,
    expiry: '30/11/2024',
    status: 'active', // 'active' | 'pending' | 'paused' | 'expired'
  },
  {
    id: 'vch_02',
    name: 'Tặng Nước Ngọt Tự Chọn',
    code: 'FREEDRINK',
    type: 'Quà tặng',
    value: '1 Nước ngọt',
    total: 500,
    issued: 120,
    used: 85,
    expiry: '15/12/2024',
    status: 'active',
  },
  {
    id: 'vch_03',
    name: 'Giảm 50K Hóa Đơn > 300K',
    code: 'MIN50K',
    type: 'Tiền mặt (VNĐ)',
    value: '50,000đ',
    total: 2000,
    issued: 1890,
    used: 1500,
    expiry: '31/10/2024',
    status: 'paused',
  },
  {
    id: 'vch_04',
    name: 'Miễn phí Giờ học Boardgame',
    code: 'BGSTUDY',
    type: 'Quà tặng',
    value: 'Tặng 2 giờ máy',
    total: 300,
    issued: 300,
    used: 300,
    expiry: '01/10/2024',
    status: 'expired',
  },
];

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState(INITIAL_VOUCHERS);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // New Voucher Form State
  const [newVoucher, setNewVoucher] = useState({
    name: '',
    code: '',
    type: 'Phần trăm (%)',
    value: '',
    total: 500,
    expiry: '31/12/2024',
  });

  const handleToggleStatus = (id) => {
    setVouchers(
      vouchers.map((v) => {
        if (v.id === id) {
          return {
            ...v,
            status: v.status === 'active' ? 'paused' : 'active',
          };
        }
        return v;
      })
    );
  };

  const handleCreateVoucher = (e) => {
    e.preventDefault();
    if (!newVoucher.name || !newVoucher.code) {
      alert('Vui lòng điền đủ tên và mã voucher');
      return;
    }

    const created = {
      id: `vch_${Date.now()}`,
      name: newVoucher.name,
      code: newVoucher.code.toUpperCase(),
      type: newVoucher.type,
      value: newVoucher.value || 'Giảm 20%',
      total: Number(newVoucher.total) || 500,
      issued: 0,
      used: 0,
      expiry: newVoucher.expiry,
      status: 'active',
    };

    setVouchers([created, ...vouchers]);
    setShowCreateModal(false);
    setNewVoucher({
      name: '',
      code: '',
      type: 'Phần trăm (%)',
      value: '',
      total: 500,
      expiry: '31/12/2024',
    });
  };

  const filteredVouchers = vouchers.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.code.toLowerCase().includes(search.toLowerCase());
    const matchTab = activeTab === 'all' || v.status === activeTab;
    return matchSearch && matchTab;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <span className="badge badge-success">ĐANG CHẠY</span>;
      case 'pending':
        return <span className="badge badge-warning">CHỜ DUYỆT</span>;
      case 'paused':
        return <span className="badge badge-danger">TẠM DỪNG</span>;
      case 'expired':
        return <span className="badge" style={{ backgroundColor: '#E2E8F0', color: '#64748B' }}>HẾT HẠN</span>;
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Quản lý voucher
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Theo dõi và quản lý các chương trình ưu đãi dành riêng cho sinh viên UNI-MATE.
          </p>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Tạo voucher mới</span>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="portal-card" style={{ padding: '16px 20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'active', label: 'Đang chạy' },
              { id: 'pending', label: 'Chờ duyệt' },
              { id: 'paused', label: 'Tạm dừng' },
              { id: 'expired', label: 'Hết hạn' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  backgroundColor: activeTab === tab.id ? 'var(--primary)' : 'var(--bg-page)',
                  color: activeTab === tab.id ? '#FFFFFF' : 'var(--text-secondary)',
                  border: '1px solid',
                  borderColor: activeTab === tab.id ? 'var(--primary)' : 'var(--border-color)',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
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
              placeholder="Tìm kiếm voucher hoặc mã..."
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

      {/* Vouchers Table */}
      <div className="portal-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px' }}>TÊN VOUCHER</th>
                <th style={{ padding: '14px 16px' }}>LOẠI ƯU ĐÃI</th>
                <th style={{ padding: '14px 16px' }}>GIÁ TRỊ</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>SỐ LƯỢNG</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ĐÃ PHÁT</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ĐÃ DÙNG</th>
                <th style={{ padding: '14px 16px' }}>HẠN DÙNG</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {filteredVouchers.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: '1px solid var(--border-light)',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '14px' }}>
                      {item.name}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--primary)', letterSpacing: '0.5px' }}>
                      MÃ: {item.code}
                    </span>
                  </td>
                  <td style={{ padding: '16px 16px', color: 'var(--text-secondary)' }}>
                    {item.type}
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {item.value}
                  </td>
                  <td style={{ padding: '16px 16px', textAlign: 'center', fontWeight: '600' }}>
                    {item.total.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 16px', textAlign: 'center', fontWeight: '600', color: '#8B5CF6' }}>
                    {item.issued.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 16px', textAlign: 'center', fontWeight: '700', color: '#10B981' }}>
                    {item.used.toLocaleString()}
                  </td>
                  <td style={{ padding: '16px 16px', color: 'var(--text-secondary)', fontSize: '12px' }}>
                    {item.expiry}
                  </td>
                  <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                    {getStatusBadge(item.status)}
                  </td>
                  <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleToggleStatus(item.id)}
                      style={{
                        padding: '5px 10px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700',
                        border: '1px solid var(--border-color)',
                        backgroundColor: '#FFFFFF',
                        color: item.status === 'active' ? '#DC2626' : '#059669',
                      }}
                    >
                      {item.status === 'active' ? 'Tạm dừng' : 'Bật chạy'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Table Footer / Pagination */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '12px',
            color: 'var(--text-secondary)',
          }}
        >
          <span>Hiển thị 1 - {filteredVouchers.length} trong số {vouchers.length} voucher</span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>&lt;</button>
            <button className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px' }}>1</button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>2</button>
            <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>&gt;</button>
          </div>
        </div>
      </div>

      {/* Modal: Tạo voucher mới */}
      {showCreateModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: '520px',
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              padding: '28px',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '900', color: 'var(--text-primary)' }}>
                Tạo voucher ưu đãi mới
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{ fontSize: '20px', fontWeight: '700', color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateVoucher} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                  Tên chương trình voucher *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm 20% cho cặp đôi sinh viên"
                  value={newVoucher.name}
                  onChange={(e) => setNewVoucher({ ...newVoucher, name: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Mã code (Viết hoa) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="VD: UNI20"
                    value={newVoucher.code}
                    onChange={(e) => setNewVoucher({ ...newVoucher, code: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', textTransform: 'uppercase' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Loại ưu đãi
                  </label>
                  <select
                    value={newVoucher.type}
                    onChange={(e) => setNewVoucher({ ...newVoucher, type: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option>Phần trăm (%)</option>
                    <option>Tiền mặt (VNĐ)</option>
                    <option>Quà tặng</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Giá trị ưu đãi
                  </label>
                  <input
                    type="text"
                    placeholder="20% tối đa 50k"
                    value={newVoucher.value}
                    onChange={(e) => setNewVoucher({ ...newVoucher, value: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Số lượng phát hành
                  </label>
                  <input
                    type="number"
                    value={newVoucher.total}
                    onChange={(e) => setNewVoucher({ ...newVoucher, total: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                  Hạn sử dụng
                </label>
                <input
                  type="text"
                  value={newVoucher.expiry}
                  onChange={(e) => setNewVoucher({ ...newVoucher, expiry: e.target.value })}
                  placeholder="31/12/2024"
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn btn-secondary">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  Phát hành voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
