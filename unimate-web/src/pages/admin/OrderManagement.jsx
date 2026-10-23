import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  FileSpreadsheet,
  Users,
  RefreshCw,
  Loader2,
  DollarSign,
  AlertCircle,
  TrendingUp,
  User,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';
import { orderApi, userApi } from '../../services/api';
import UnmatchedPayments from '../../components/admin/UnmatchedPayments';

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    pending: { count: 0, total: 0 },
    paid: { count: 0, total: 0 },
    cancelled: { count: 0, total: 0 },
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'pending' | 'paid' | 'cancelled'
  const [searchTerm, setSearchTerm] = useState('');
  
  // Action modals
  const [confirmingOrder, setConfirmingOrder] = useState(null); // order object
  const [confirmNote, setConfirmNote] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState(null);
  const [cancelNote, setCancelNote] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Export state
  const [exportingOrders, setExportingOrders] = useState(false);
  const [exportingUsers, setExportingUsers] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeTab !== 'all') {
        params.status = activeTab;
      }
      const res = await orderApi.getAllOrdersAdmin(params);
      setOrders(res.data || []);
      if (res.stats) {
        setStats(res.stats);
      }
    } catch (err) {
      console.error('Lỗi tải danh sách đơn hàng:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [activeTab]);

  // Duyệt đơn hàng (kích hoạt gói)
  const handleConfirmOrder = async () => {
    if (!confirmingOrder) return;
    setActionLoading(true);
    try {
      const res = await orderApi.confirmOrderAdmin(confirmingOrder.code, confirmNote);
      alert(res.message || `Đã xác nhận đơn hàng ${confirmingOrder.code} thành công!`);
      setConfirmingOrder(null);
      setConfirmNote('');
      fetchOrders();
    } catch (err) {
      alert('Không thể xác nhận đơn: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // Huỷ đơn hàng
  const handleCancelOrder = async () => {
    if (!cancellingOrder) return;
    setActionLoading(true);
    try {
      const res = await orderApi.cancelOrderAdmin(cancellingOrder.code, cancelNote);
      alert(res.message || `Đã huỷ đơn hàng ${cancellingOrder.code}!`);
      setCancellingOrder(null);
      setCancelNote('');
      fetchOrders();
    } catch (err) {
      alert('Không thể huỷ đơn: ' + (err.response?.data?.message || err.message));
    } finally {
      setActionLoading(false);
    }
  };

  // 1. Xuất Excel Đơn hàng
  const handleExportOrders = async () => {
    setExportingOrders(true);
    try {
      const statusParam = activeTab === 'all' ? 'all' : activeTab;
      const blob = await orderApi.exportOrdersAdmin(statusParam);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unimate_don_hang_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất file Excel đơn hàng: ' + err.message);
    } finally {
      setExportingOrders(false);
    }
  };

  // 2. Xuất Excel Người dùng
  const handleExportUsers = async () => {
    setExportingUsers(true);
    try {
      const blob = await userApi.exportUsersAdmin();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `unimate_danh_sach_nguoi_dung_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Lỗi xuất file Excel người dùng: ' + err.message);
    } finally {
      setExportingUsers(false);
    }
  };

  const filteredOrders = orders.filter((o) => {
    const codeMatch = (o.code || '').toLowerCase().includes(searchTerm.toLowerCase());
    const nameMatch = (o.userId?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const emailMatch = (o.userId?.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    return codeMatch || nameMatch || emailMatch;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'paid':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#DCFCE7', color: '#15803D', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
            <CheckCircle2 size={13} /> Đã thanh toán
          </span>
        );
      case 'pending':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#FEF3C7', color: '#B45309', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
            <Clock size={13} /> Chờ thanh toán
          </span>
        );
      case 'cancelled':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', backgroundColor: '#F1F5F9', color: '#64748B', padding: '4px 10px', borderRadius: '12px', fontSize: '11.5px', fontWeight: '800' }}>
            <XCircle size={13} /> Đã huỷ
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Tiền về nhưng chưa khớp đơn: chỉ hiện khi có */}
      <UnmatchedPayments onResolved={fetchOrders} />

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Quản lý Đơn hàng & Doanh thu 💳
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Xác nhận thanh toán chuyển khoản VietQR, kích hoạt gói cước và xuất file Excel minh chứng.
          </p>
        </div>

        {/* 2 NÚT XUẤT EXCEL + LÀM MỚI */}
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            disabled={exportingOrders}
            onClick={handleExportOrders}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#10B981',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '13px',
              cursor: exportingOrders ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            }}
          >
            {exportingOrders ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <FileSpreadsheet size={15} />}
            Xuất Excel Đơn hàng
          </button>

          <button
            type="button"
            disabled={exportingUsers}
            onClick={handleExportUsers}
            style={{
              padding: '10px 16px',
              borderRadius: '12px',
              border: 'none',
              backgroundColor: '#4F46E5',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '13px',
              cursor: exportingUsers ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)',
            }}
          >
            {exportingUsers ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Users size={15} />}
            Xuất Excel Người dùng
          </button>

          <button
            type="button"
            onClick={fetchOrders}
            disabled={loading}
            style={{
              padding: '10px',
              borderRadius: '12px',
              border: '1px solid #CBD5E1',
              backgroundColor: '#FFFFFF',
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Làm mới danh sách"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px' }}>
        {/* Chờ duyệt */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', border: '1.5px solid #FEF3C7', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
              Chờ thanh toán / Duyệt
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#FEF3C7', color: '#D97706', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#1E293B' }}>
            {stats.pending?.count || 0} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>đơn hàng</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#EA580C', marginTop: '4px' }}>
            {(stats.pending?.total || 0).toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Đã thanh toán */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', border: '1.5px solid #BBF7D0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#15803D', textTransform: 'uppercase' }}>
              Đã thu tiền & Kích hoạt
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#DCFCE7', color: '#16A34A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#1E293B' }}>
            {stats.paid?.count || 0} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>đơn thành công</span>
          </div>
          <div style={{ fontSize: '13px', fontWeight: '700', color: '#16A34A', marginTop: '4px' }}>
            {(stats.paid?.total || 0).toLocaleString('vi-VN')} đ
          </div>
        </div>

        {/* Đã huỷ */}
        <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '20px', border: '1.5px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: '800', color: '#64748B', textTransform: 'uppercase' }}>
              Đơn đã huỷ
            </span>
            <div style={{ width: '32px', height: '32px', borderRadius: '10px', backgroundColor: '#F1F5F9', color: '#64748B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <XCircle size={16} />
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '900', color: '#1E293B' }}>
            {stats.cancelled?.count || 0} <span style={{ fontSize: '13px', color: '#64748B', fontWeight: '600' }}>đơn</span>
          </div>
          <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '4px' }}>
            Không nhận được thanh toán
          </div>
        </div>
      </div>

      {/* Tabs and Search Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', backgroundColor: '#E2E8F0', padding: '4px', borderRadius: '12px' }}>
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pending', label: `Chờ duyệt (${stats.pending?.count || 0})` },
            { id: 'paid', label: `Đã thu (${stats.paid?.count || 0})` },
            { id: 'cancelled', label: `Đã huỷ (${stats.cancelled?.count || 0})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '8px 16px',
                borderRadius: '9px',
                border: 'none',
                fontSize: '13px',
                fontWeight: '700',
                cursor: 'pointer',
                backgroundColor: activeTab === tab.id ? '#FFFFFF' : 'transparent',
                color: activeTab === tab.id ? '#1E293B' : '#64748B',
                boxShadow: activeTab === tab.id ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input
            type="text"
            placeholder="Tìm theo mã UM, tên, email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '100%',
              padding: '9px 12px 9px 36px',
              borderRadius: '10px',
              border: '1.5px solid #CBD5E1',
              fontSize: '13px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* Orders Table Card */}
      <div style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', border: '1px solid #E2E8F0', overflow: 'hidden', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#64748B', fontSize: '11px', fontWeight: '800', letterSpacing: '0.5px' }}>
                <th style={{ padding: '14px 20px' }}>MÃ ĐƠN (NỘI DUNG CK)</th>
                <th style={{ padding: '14px 16px' }}>NGƯỜI MUA</th>
                <th style={{ padding: '14px 16px' }}>GÓI DỊCH VỤ</th>
                <th style={{ padding: '14px 16px' }}>SỐ TIỀN</th>
                <th style={{ padding: '14px 16px' }}>THỜI GIAN TẠO</th>
                <th style={{ padding: '14px 16px', textAlign: 'center' }}>TRẠNG THÁI</th>
                <th style={{ padding: '14px 16px' }}>GHI CHÚ</th>
                <th style={{ padding: '14px 20px', textAlign: 'right' }}>HÀNH ĐỘNG</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px auto' }} />
                    <p style={{ margin: 0 }}>Đang tải danh sách đơn hàng...</p>
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" style={{ textAlign: 'center', padding: '50px 20px', color: '#64748B' }}>
                    <CreditCard size={36} style={{ margin: '0 auto 10px auto', opacity: 0.3 }} />
                    <p style={{ margin: 0, fontWeight: '700' }}>Không tìm thấy đơn hàng nào</p>
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => (
                  <tr
                    key={order._id || order.code}
                    style={{ borderBottom: '1px solid #F1F5F9', transition: 'background-color 0.15s' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    {/* Code */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{ fontFamily: 'monospace', fontWeight: '900', color: '#EA580C', fontSize: '13.5px', backgroundColor: '#FFF7ED', padding: '3px 8px', borderRadius: '6px', border: '1px solid #FFEDD5' }}>
                        {order.code}
                      </span>
                    </td>

                    {/* Buyer */}
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ fontWeight: '800', color: '#1E293B' }}>
                        {order.userId?.fullName || 'Khách vãng lai'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748B' }}>
                        {order.userId?.email || '—'} · <span style={{ textTransform: 'capitalize', color: order.userId?.role === 'partner' ? '#6D28D9' : '#0284C7', fontWeight: '700' }}>{order.userId?.role === 'partner' ? 'Chủ quán' : 'Sinh viên'}</span>
                      </div>
                    </td>

                    {/* Plan */}
                    <td style={{ padding: '16px 16px' }}>
                      <div style={{ fontWeight: '700', color: '#1E293B' }}>{order.planName || order.plan}</div>
                      <div style={{ fontSize: '11px', color: '#94A3B8' }}>{order.durationDays} ngày sử dụng</div>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '16px 16px' }}>
                      <span style={{ fontWeight: '900', color: '#0F172A', fontSize: '14px' }}>
                        {order.amount?.toLocaleString('vi-VN')} đ
                      </span>
                    </td>

                    {/* CreatedAt */}
                    <td style={{ padding: '16px 16px', color: '#64748B', fontSize: '12px' }}>
                      {order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : '—'}
                    </td>

                    {/* Status */}
                    <td style={{ padding: '16px 16px', textAlign: 'center' }}>
                      {getStatusBadge(order.status)}
                    </td>

                    {/* Note */}
                    <td style={{ padding: '16px 16px', color: '#64748B', fontSize: '12px' }}>
                      {order.note || '—'}
                    </td>

                    {/* Actions */}
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      {order.status === 'pending' ? (
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmingOrder(order);
                              setConfirmNote('');
                            }}
                            style={{
                              padding: '6px 12px',
                              borderRadius: '8px',
                              border: 'none',
                              backgroundColor: '#10B981',
                              color: '#FFFFFF',
                              fontSize: '12px',
                              fontWeight: '800',
                              cursor: 'pointer',
                            }}
                          >
                            Duyệt đơn
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setCancellingOrder(order);
                              setCancelNote('');
                            }}
                            style={{
                              padding: '6px 10px',
                              borderRadius: '8px',
                              border: '1px solid #CBD5E1',
                              backgroundColor: '#FFFFFF',
                              color: '#DC2626',
                              fontSize: '12px',
                              fontWeight: '700',
                              cursor: 'pointer',
                            }}
                          >
                            Huỷ
                          </button>
                        </div>
                      ) : (
                        <span style={{ fontSize: '11.5px', color: '#94A3B8' }}>
                          {order.status === 'paid' ? 'Đã hoàn tất' : 'Đã huỷ'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL DUYỆT ĐƠN HÀNG */}
      {confirmingOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#1E293B', marginBottom: '8px' }}>
              Xác nhận thanh toán đơn {confirmingOrder.code}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px' }}>
              Sau khi xác nhận, gói dịch vụ <strong>{confirmingOrder.planName}</strong> sẽ lập tức được kích hoạt cho người dùng <strong>{confirmingOrder.userId?.fullName}</strong>.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                Mã giao dịch ngân hàng / Ghi chú (không bắt buộc):
              </label>
              <input
                type="text"
                placeholder="VD: FT2601234567"
                value={confirmNote}
                onChange={(e) => setConfirmNote(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setConfirmingOrder(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#64748B', fontWeight: '700', cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleConfirmOrder}
                style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#10B981', color: '#fff', fontWeight: '800', cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={16} />}
                Xác nhận đã nhận tiền
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HUỶ ĐƠN HÀNG */}
      {cancellingOrder && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
          <div style={{ backgroundColor: '#FFFFFF', borderRadius: '20px', maxWidth: '420px', width: '100%', padding: '24px', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: '900', color: '#DC2626', marginBottom: '8px' }}>
              Huỷ đơn hàng {cancellingOrder.code}
            </h3>
            <p style={{ fontSize: '13px', color: '#64748B', lineHeight: '1.5', marginBottom: '16px' }}>
              Bạn có chắc chắn muốn huỷ đơn này? Đơn bị huỷ sẽ không thể kích hoạt gói dịch vụ.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: '700', marginBottom: '6px', color: '#334155' }}>
                Lý do huỷ đơn:
              </label>
              <input
                type="text"
                placeholder="VD: Quá 24h không nhận được tiền, sai số tiền..."
                value={cancelNote}
                onChange={(e) => setCancelNote(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: '10px', border: '1.5px solid #CBD5E1', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setCancellingOrder(null)}
                style={{ flex: 1, padding: '10px', borderRadius: '10px', border: '1px solid #CBD5E1', backgroundColor: '#fff', color: '#64748B', fontWeight: '700', cursor: 'pointer' }}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleCancelOrder}
                style={{ flex: 2, padding: '10px', borderRadius: '10px', border: 'none', backgroundColor: '#DC2626', color: '#fff', fontWeight: '800', cursor: actionLoading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
              >
                {actionLoading ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <X size={16} />}
                Xác nhận huỷ đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
