import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Ticket,
  Plus,
  Search,
  Loader2,
  FileSpreadsheet,
} from 'lucide-react';
import { voucherApi, venueApi } from '../../services/api';
import ImportVoucherModal from '../../components/partner/ImportVoucherModal';
import CreateVoucherModal from '../../components/partner/CreateVoucherModal';
import { describeVoucher } from '../../utils/voucher';
import VoucherStatusBadge from '../../components/VoucherStatusBadge';

// Tab lọc → các trạng thái backend thuộc tab đó
const TAB_GROUPS = {
  active: ['active'],
  pending: ['venue_pending', 'venue_rejected', 'partner_suspended'],
  paused: ['paused'],
  expired: ['expired', 'sold_out'],
};

export default function VoucherManagement() {
  const [vouchers, setVouchers] = useState([]);
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [search, setSearch] = useState('');
  // Bấm "Tạo voucher mới" ở thanh trên cùng (từ trang khác) → vào đây với ?create=1 và mở sẵn form
  const [searchParams, setSearchParams] = useSearchParams();
  // ?create=1 → voucher thường, ?create=meetup → chọn sẵn "Ưu đãi hẹn cafe"
  const [createKind, setCreateKind] = useState(() => (searchParams.get('create') === 'meetup' ? 'meetup' : 'normal'));
  const [showCreateModal, setShowCreateModal] = useState(() => Boolean(searchParams.get('create')));
  const [showImportModal, setShowImportModal] = useState(false);


  // Xoá ?create=1 khỏi địa chỉ để tải lại trang không tự mở form lần nữa
  useEffect(() => {
    if (searchParams.get('create')) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  // Modal quản lý danh sách mã riêng
  const [selectedUniqueVoucher, setSelectedUniqueVoucher] = useState(null);
  const [codesData, setCodesData] = useState([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [newCodesInput, setNewCodesInput] = useState('');
  const [addingCodes, setAddingCodes] = useState(false);

  const loadVenues = async () => {
    try {
      const res = await venueApi.getMyVenues();
      setVenues(res?.data || []);
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
        premiumOnly: Boolean(v.premiumOnly),
        meetupReward: Boolean(v.meetupReward),
        coinCost: Number(v.coinCost) || 0,
        // Nhãn giá trị do backend tính (cùng cách hiển thị với phía sinh viên)
        value: describeVoucher(v).discountLabel,
        condition: describeVoucher(v).conditionLabel,
        branch: v.venueId?.name || '',
        total: v.isUnlimited ? 'Không giới hạn' : (v.quantity || 500),
        issued: v.claimedCount || 0,
        // Lượt dùng thật tại quầy (bản ghi quét), cùng số với trang admin
        used: (v.redeemedByQr || 0) + (v.redeemedByCode || 0),
        expiry: v.validUntil ? new Date(v.validUntil).toLocaleDateString('vi-VN') : 'Không thời hạn',
        // Chờ duyệt (quán chưa được duyệt) / tạm dừng / hết hạn / đang chạy
        // Cùng trạng thái với trang admin (backend tính): chờ duyệt quán / tạm dừng / hết hạn / hết lượt / đang chạy
        status: v.status || (v.isActive ? 'active' : 'paused'),
        statusLabel: v.statusLabel,
        isActive: Boolean(v.isActive),
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
      // Trạng thái hiển thị (chờ duyệt / hết hạn...) do backend tính → tải lại cho đúng
      await fetchVouchers();
    } catch (err) {
      alert('Không thể cập nhật trạng thái voucher: ' + err.message);
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
    const matchTab = activeTab === 'all' || (TAB_GROUPS[activeTab] || []).includes(v.status);
    return matchSearch && matchTab;
  });


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
          <button onClick={() => { setCreateKind('normal'); setShowCreateModal(true); }} className="btn btn-primary">
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
              { id: 'pending', label: 'Chờ duyệt quán' },
              { id: 'paused', label: 'Tạm dừng' },
              { id: 'expired', label: 'Hết hạn / hết lượt' },
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
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>ĐÃ LƯU</th>
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
                    {item.branch && (
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>{item.branch}</div>
                    )}
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
                    {item.premiumOnly && (
                      <span
                        style={{
                          marginLeft: '6px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: '#FEF3C7',
                          color: '#B45309',
                        }}
                      >
                        Premium
                      </span>
                    )}
                    {item.meetupReward && (
                      <span
                        style={{
                          marginLeft: '6px',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: '800',
                          backgroundColor: '#FFEDD5',
                          color: '#C2410C',
                        }}
                      >
                        Hẹn cafe
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 16px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {item.value}
                    <div style={{ fontSize: '11px', fontWeight: '500', color: 'var(--text-muted)', marginTop: '2px' }}>{item.condition}</div>
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
                    <VoucherStatusBadge status={item.status} label={item.statusLabel} />
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
                          color: item.isActive ? '#DC2626' : '#059669',
                          cursor: 'pointer',
                        }}
                      >
                        {item.isActive ? 'Tạm dừng' : 'Bật chạy'}
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
          <span>Hiển thị {filteredVouchers.length} / {vouchers.length} voucher</span>
        </div>
      </div>

      {/* Modal: Tạo voucher mới */}
      {showCreateModal && (
        <CreateVoucherModal
          open={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          venues={venues}
          initialKind={createKind}
          onCreated={fetchVouchers}
        />
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

