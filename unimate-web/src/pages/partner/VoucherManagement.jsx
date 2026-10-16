import React, { useState, useEffect } from 'react';
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
  Loader2,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';
import { voucherApi, venueApi } from '../../services/api';
import ImportVoucherModal from '../../components/partner/ImportVoucherModal';

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [selectedVenueId, setSelectedVenueId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);


  // New Voucher Form State
  const [newVoucher, setNewVoucher] = useState({
    name: '',
    code: '',
    codeType: 'shared', // 'shared' | 'unique'
    isUnlimited: false,
    coinCost: 0,
    type: 'Phần trăm (%)',
    value: '',
    total: 500,
    expiry: '2026-12-31',
  });

  // Modal quản lý danh sách mã riêng
  const [selectedUniqueVoucher, setSelectedUniqueVoucher] = useState(null);
  const [codesData, setCodesData] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [newCodesInput, setNewCodesInput] = useState('');
  const [addingCodes, setAddingCodes] = useState(false);

  const loadVenues = async () => {
    try {
      const res = await venueApi.getMyVenues();
      const vList = res?.data || [];
      setVenues(vList);
      if (vList.length > 0) {
        setSelectedVenueId(vList[0]._id || vList[0].id);
      }
    } catch (err) {
      console.log('Load venues note:', err.message);
    }
  };

  const fetchVouchers = async () => {
    setLoading(true);
    try {
      const res = await voucherApi.getMyPartnerVouchers();
      const raw = res?.data || [];
      const formatted = raw.map((v) => ({
        id: v._id || v.id,
        name: v.title,
        code: v.code,
        codeType: v.codeType || 'shared',
        isUnlimited: Boolean(v.isUnlimited),
        coinCost: Number(v.coinCost) || 0,
        type: v.discountPercent ? 'Phần trăm (%)' : (v.discountAmount ? 'Tiền mặt (VNĐ)' : 'Quà tặng'),
        value: v.discountPercent ? `${v.discountPercent}%` : (v.discountAmount ? `${v.discountAmount.toLocaleString()}đ` : v.title),
        total: v.isUnlimited ? 'Không giới hạn' : (v.quantity || 500),
        issued: v.claimedCount || 0,
        used: v.usedCount || 0,
        expiry: v.validUntil ? new Date(v.validUntil).toLocaleDateString('vi-VN') : 'Không thời hạn',
        status: v.isActive ? 'active' : 'paused',
      }));
      setVouchers(formatted);
    } catch (err) {
      console.error('Lỗi tải voucher partner:', err.message);
      setVouchers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVouchers();
    loadVenues();
  }, []);

  const handleToggleStatus = async (id) => {
    try {
      await voucherApi.toggleVoucher(id);
      setVouchers((prev) =>
        prev.map((v) => (v.id === id ? { ...v, status: v.status === 'active' ? 'paused' : 'active' } : v))
      );
    } catch (err) {
      alert('Không thể cập nhật trạng thái voucher: ' + err.message);
    }
  };

  const handleCreateVoucher = async (e) => {
    e.preventDefault();
    if (!newVoucher.name || !newVoucher.code) {
      alert('Vui lòng điền đủ tên và mã voucher');
      return;
    }

    setSubmitting(true);
    try {
      const valNum = parseInt(newVoucher.value) || 0;
      const effectiveVenueId = selectedVenueId || (venues.length > 0 ? (venues[0]._id || venues[0].id) : undefined);

      let parsedDate = null;
      if (newVoucher.expiry) {
        if (newVoucher.expiry.includes('/')) {
          const parts = newVoucher.expiry.split('/');
          if (parts.length === 3) {
            parsedDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        } else {
          parsedDate = new Date(newVoucher.expiry);
        }
      }
      if (!parsedDate || isNaN(parsedDate.getTime())) {
        parsedDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
      }

      const payload = {
        venueId: effectiveVenueId,
        title: newVoucher.name,
        code: newVoucher.code.toUpperCase().trim(),
        codeType: newVoucher.codeType,
        isUnlimited: Boolean(newVoucher.isUnlimited),
        coinCost: Number(newVoucher.coinCost) || 0,
        quantity: newVoucher.isUnlimited ? null : (Number(newVoucher.total) || 500),
        validUntil: parsedDate.toISOString(),
        ...(newVoucher.type === 'Phần trăm (%)' ? { discountPercent: valNum || 20 } : {}),
        ...(newVoucher.type === 'Tiền mặt (VNĐ)' ? { discountAmount: valNum || 50000 } : {}),
      };

      await voucherApi.createVoucher(payload);
      setShowCreateModal(false);
      setNewVoucher({
        name: '',
        code: '',
        codeType: 'shared',
        isUnlimited: false,
        coinCost: 0,
        type: 'Phần trăm (%)',
        value: '',
        total: 500,
        expiry: '2026-12-31',
      });
      await fetchVouchers();
    } catch (err) {
      alert('Lỗi tạo voucher: ' + (err.response?.data?.message || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCodesModal = async (v) => {
    setSelectedUniqueVoucher(v);
    setCodesLoading(true);
    setNewCodesInput('');
    try {
      const res = await voucherApi.getVoucherCodes(v.id);
      setCodesData(res.data || []);
    } catch (err) {
      alert('Lỗi tải danh sách mã: ' + err.message);
    } finally {
      setCodesLoading(false);
    }
  };

  const handleAddCodes = async (e) => {
    e.preventDefault();
    if (!newCodesInput.trim() || !selectedUniqueVoucher) return;
    const codes = newCodesInput
      .split('\n')
      .map((c) => c.trim())
      .filter(Boolean);
    if (codes.length === 0) return;
    setAddingCodes(true);
    try {
      const res = await voucherApi.addVoucherCodes(selectedUniqueVoucher.id, { codes });
      alert(res.message || `Đã nạp ${res.data?.addedCount || codes.length} mã thành công!`);
      setNewCodesInput('');
      const updated = await voucherApi.getVoucherCodes(selectedUniqueVoucher.id);
      setCodesData(updated.data || []);
      fetchVouchers();
    } catch (err) {
      alert('Lỗi nạp mã: ' + (err.response?.data?.message || err.message));
    } finally {
      setAddingCodes(false);
    }
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowImportModal(true)}
            className="btn btn-secondary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: '700',
              backgroundColor: '#FFFFFF',
              borderColor: 'var(--border-color)',
            }}
          >
            <FileSpreadsheet size={16} color="#10B981" />
            <span>Nhập Excel / Sheet</span>
          </button>
          <button onClick={() => setShowCreateModal(true)} className="btn btn-primary">
            <Plus size={16} />
            <span>Tạo voucher mới</span>
          </button>
        </div>
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
                <th style={{ padding: '14px 16px' }}>LOẠI MÃ</th>
                <th style={{ padding: '14px 16px' }}>GIÁ TRỊ</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>GIÁ UNICOIN</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>SỐ LƯỢNG</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ĐÃ PHÁT</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ĐÃ DÙNG</th>
                <th style={{ padding: '14px 16px' }}>HẠN DÙNG</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 12px', color: 'var(--primary)' }} />
                    <p style={{ fontSize: '14px', fontWeight: '600' }}>Đang tải danh sách voucher...</p>
                  </td>
                </tr>
              ) : filteredVouchers.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <Ticket size={36} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                    <p style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>Chưa có voucher nào</p>
                    <p style={{ fontSize: '13px', marginTop: '4px' }}>Nhấn nút "Tạo voucher mới" phía trên để phát hành ưu đãi đầu tiên</p>
                  </td>
                </tr>
              ) : (
                filteredVouchers.map((item) => (
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
                  <td style={{ padding: '16px 16px' }}>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '11px',
                        fontWeight: '800',
                        backgroundColor: item.codeType === 'unique' ? '#EDE9FE' : '#F1F5F9',
                        color: item.codeType === 'unique' ? '#6D28D9' : '#475569',
                      }}
                    >
                      {item.codeType === 'unique' ? 'Mã riêng' : 'Mã chung'}
                    </span>
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {item.value}
                  </td>
                  <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                    {item.coinCost > 0 ? (
                      <span style={{ fontSize: '12px', fontWeight: '800', color: '#B45309', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: '6px' }}>
                        {item.coinCost} Coin
                      </span>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#10B981', fontWeight: '700' }}>Miễn phí</span>
                    )}
                  </td>
                  <td style={{ padding: '16px 16px', textAlign: 'center', fontWeight: '600' }}>
                    {typeof item.total === 'number' ? item.total.toLocaleString() : item.total}
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
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {item.codeType === 'unique' && (
                        <button
                          type="button"
                          onClick={() => handleOpenCodesModal(item)}
                          style={{
                            padding: '5px 10px',
                            borderRadius: '6px',
                            fontSize: '11.5px',
                            fontWeight: '700',
                            border: '1px solid #C4B5FD',
                            backgroundColor: '#F5F3FF',
                            color: '#6D28D9',
                            cursor: 'pointer',
                          }}
                        >
                          Nạp mã
                        </button>
                      )}
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
                          cursor: 'pointer',
                        }}
                      >
                        {item.status === 'active' ? 'Tạm dừng' : 'Bật chạy'}
                      </button>
                    </div>
                  </td>
                </tr>
              )))}
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
                  Cơ sở / Quán áp dụng voucher *
                </label>
                {venues.length > 0 ? (
                  <select
                    value={selectedVenueId}
                    onChange={(e) => setSelectedVenueId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: '#fff',
                      fontSize: '13px',
                      outline: 'none',
                    }}
                  >
                    {venues.map((v) => (
                      <option key={v._id || v.id} value={v._id || v.id}>
                        {v.name} — {v.address}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      backgroundColor: '#FFF7ED',
                      border: '1px solid #FFEDD5',
                      color: '#C2410C',
                      fontSize: '12px',
                      lineHeight: '18px',
                    }}
                  >
                    💡 Hệ thống sẽ tự động liên kết cơ sở của bạn hoặc bạn có thể vào mục <strong>"Quản lý Địa điểm"</strong> để tuỳ chỉnh cơ sở trước.
                  </div>
                )}
              </div>

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
                    Cơ chế loại mã *
                  </label>
                  <select
                    value={newVoucher.codeType}
                    onChange={(e) => setNewVoucher({ ...newVoucher, codeType: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: '#fff' }}
                  >
                    <option value="shared">Mã chung (1 mã dùng nhiều lượt)</option>
                    <option value="unique">Mã riêng (danh sách mã, mỗi bạn 1 mã)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                    Giá UniCoin đổi voucher
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 = Miễn phí"
                    value={newVoucher.coinCost}
                    onChange={(e) => setNewVoucher({ ...newVoucher, coinCost: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)' }}
                  />
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
                    disabled={newVoucher.isUnlimited}
                    value={newVoucher.isUnlimited ? '' : newVoucher.total}
                    onChange={(e) => setNewVoucher({ ...newVoucher, total: e.target.value })}
                    placeholder={newVoucher.isUnlimited ? 'Không giới hạn' : '500'}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', backgroundColor: newVoucher.isUnlimited ? '#F1F5F9' : '#fff' }}
                  />
                  {newVoucher.codeType === 'shared' && (
                    <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', marginTop: '6px', color: '#475569', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={newVoucher.isUnlimited}
                        onChange={(e) => setNewVoucher({ ...newVoucher, isUnlimited: e.target.checked })}
                      />
                      <span>Không giới hạn số lượng (áp dụng cho quán của thầy)</span>
                    </label>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px' }}>
                  Hạn sử dụng *
                </label>
                <input
                  type="date"
                  required
                  value={newVoucher.expiry}
                  onChange={(e) => setNewVoucher({ ...newVoucher, expiry: e.target.value })}
                  min={new Date().toISOString().split('T')[0]}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    backgroundColor: '#fff',
                    fontSize: '13px',
                    outline: 'none',
                  }}
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

      {/* Import Voucher Modal từ Excel / Sheet */}
      <ImportVoucherModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        venues={venues}
        onSuccess={() => {
          fetchVouchers();
        }}
      />

      {/* Modal Quản lý / Nạp danh sách mã riêng */}
      {selectedUniqueVoucher && (
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
              maxWidth: '560px',
              width: '100%',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#6D28D9', textTransform: 'uppercase' }}>
                  Voucher Mã Riêng
                </span>
                <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#0F172A', marginTop: '2px' }}>
                  {selectedUniqueVoucher.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUniqueVoucher(null)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#94A3B8' }}
              >
                ✕
              </button>
            </div>

            {/* Form nạp thêm mã */}
            <form onSubmit={handleAddCodes} style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                Nạp thêm danh sách mã riêng (mỗi mã 1 dòng)
              </label>
              <textarea
                rows={3}
                placeholder="VD:&#10;BT-001&#10;BT-002&#10;BT-003"
                value={newCodesInput}
                onChange={(e) => setNewCodesInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '10px',
                  border: '1.5px solid #CBD5E1',
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  marginBottom: '10px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="submit"
                disabled={addingCodes || !newCodesInput.trim()}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: '#6D28D9',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: addingCodes || !newCodesInput.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {addingCodes ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
                Nạp mã vào kho
              </button>
            </form>

            {/* Danh sách mã hiện có */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '800', color: '#334155' }}>
                  Tình trạng mã trong kho ({codesData.length} mã)
                </span>
                <span style={{ fontSize: '12px', color: '#64748B' }}>
                  Khả dụng: <strong>{codesData.filter((c) => c.status === 'available').length}</strong> · Đã phát: <strong>{codesData.filter((c) => c.status === 'assigned').length}</strong> · Đã dùng: <strong>{codesData.filter((c) => c.status === 'used').length}</strong>
                </span>
              </div>

              {codesLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: '#64748B' }}>
                  <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 8px auto' }} />
                  Đang tải danh sách mã...
                </div>
              ) : codesData.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '12px', color: '#64748B', fontSize: '13px' }}>
                  Chưa có mã riêng nào. Hãy nạp danh sách mã ở ô phía trên!
                </div>
              ) : (
                <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '12px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
                    <thead style={{ backgroundColor: '#F1F5F9', position: 'sticky', top: 0 }}>
                      <tr>
                        <th style={{ padding: '8px 12px' }}>Mã riêng</th>
                        <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                        <th style={{ padding: '8px 12px' }}>Sinh viên nhận</th>
                      </tr>
                    </thead>
                    <tbody>
                      {codesData.map((item, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontWeight: '700' }}>
                            {item.code}
                          </td>
                          <td style={{ padding: '8px 12px' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '11px',
                                fontWeight: '800',
                                backgroundColor: item.status === 'available' ? '#DCFCE7' : item.status === 'assigned' ? '#FEF3C7' : '#F1F5F9',
                                color: item.status === 'available' ? '#15803D' : item.status === 'assigned' ? '#B45309' : '#64748B',
                              }}
                            >
                              {item.status === 'available' ? 'Sẵn sàng' : item.status === 'assigned' ? 'Đã cấp' : 'Đã dùng'}
                            </span>
                          </td>
                          <td style={{ padding: '8px 12px', color: '#475569' }}>
                            {item.userId?.fullName || '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

