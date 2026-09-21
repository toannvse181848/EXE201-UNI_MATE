import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Search,
  Filter,
  ShieldCheck,
  ShieldAlert,
  Ban,
  CheckCircle2,
  GraduationCap,
  Store,
  Shield,
  RefreshCw,
  Mail,
  Phone,
  Calendar,
} from 'lucide-react';
import { userApi } from '../../services/api';

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [total, setTotal] = useState(0);
  const [actionLoading, setActionLoading] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (search.trim()) params.search = search.trim();
      if (roleFilter) params.role = roleFilter;
      if (statusFilter) params.status = statusFilter;

      const res = await userApi.getAllUsers(params);
      setUsers(res.data || []);
      setTotal(res.total || 0);
    } catch (err) {
      console.error('Lỗi tải danh sách người dùng:', err);
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchUsers]);

  const handleToggleStatus = async (user) => {
    const newStatus = user.status === 'active' ? 'banned' : 'active';
    const confirmMsg = newStatus === 'banned'
      ? `Bạn có chắc chắn muốn KHOÁ tài khoản "${user.fullName}" (${user.email})?`
      : `Mở khoá tài khoản "${user.fullName}" (${user.email})?`;

    if (!window.confirm(confirmMsg)) return;

    try {
      setActionLoading(user._id);
      await userApi.updateUserStatus(user._id, newStatus);
      setToast({
        type: 'success',
        text: `Đã ${newStatus === 'banned' ? 'khoá' : 'kích hoạt'} tài khoản thành công!`,
      });
      fetchUsers();
    } catch (err) {
      setToast({
        type: 'error',
        text: err.response?.data?.message || 'Có lỗi xảy ra',
      });
    } finally {
      setActionLoading(null);
      setTimeout(() => setToast(null), 3000);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#FEF2F2', color: '#DC2626',
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
          }}>
            <Shield size={12} /> Quản trị viên
          </span>
        );
      case 'partner':
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#EFF6FF', color: '#2563EB',
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
          }}>
            <Store size={12} /> Đối tác Quán
          </span>
        );
      default:
        return (
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            backgroundColor: '#ECFDF5', color: '#059669',
            padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '700'
          }}>
            <GraduationCap size={12} /> Sinh viên
          </span>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Toast alert */}
      {toast && (
        <div style={{
          padding: '12px 20px',
          borderRadius: '8px',
          backgroundColor: toast.type === 'success' ? '#10B981' : '#EF4444',
          color: '#fff',
          fontWeight: '600',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <span>{toast.text}</span>
          <button
            onClick={() => setToast(null)}
            style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
            Quản trị Người dùng & Sinh viên
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
            Danh sách tất cả tài khoản thực tế đã đăng ký trong cơ sở dữ liệu hệ thống UNI-MATE.
          </p>
        </div>
        <button
          onClick={fetchUsers}
          className="portal-btn"
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)',
            cursor: 'pointer', padding: '10px 16px', borderRadius: '8px'
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
          <span>Làm mới ({total} user)</span>
        </button>
      </div>

      {/* Filters & Search Bar */}
      <div className="portal-card" style={{ padding: '16px 20px', display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
        {/* Search */}
        <div style={{ flex: '1 1 300px', position: 'relative' }}>
          <Search size={18} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Tìm theo tên, email, MSSV, trường học..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px 10px 40px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Role Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={16} color="var(--text-muted)" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <option value="">Tất cả vai trò</option>
            <option value="student">🎓 Sinh viên</option>
            <option value="partner">☕ Đối tác quán</option>
            <option value="admin">🛡️ Quản trị viên</option>
          </select>
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            cursor: 'pointer',
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="active">🟢 Đang hoạt động (Active)</option>
          <option value="banned">🔴 Bị khoá (Banned)</option>
        </select>
      </div>

      {/* Users Table */}
      <div className="portal-card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-muted)', fontSize: '12px' }}>NGƯỜI DÙNG</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-muted)', fontSize: '12px' }}>VAI TRÒ</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-muted)', fontSize: '12px' }}>THÔNG TIN TRƯỜNG / QUÁN</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-muted)', fontSize: '12px' }}>NGÀY ĐĂNG KÝ</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-muted)', fontSize: '12px' }}>TRẠNG THÁI</th>
                <th style={{ padding: '14px 20px', fontWeight: '800', color: 'var(--text-muted)', fontSize: '12px', textAlign: 'right' }}>THAO TÁC</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <RefreshCw size={24} className="spin" style={{ margin: '0 auto 8px' }} />
                    <p>Đang truy vấn cơ sở dữ liệu MongoDB...</p>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <p>Không tìm thấy tài khoản người dùng nào phù hợp với bộ lọc.</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isStudent = u.role === 'student' || u.role === 'user';
                  const isPartner = u.role === 'partner';
                  const isBanned = u.status === 'banned';

                  return (
                    <tr
                      key={u._id}
                      style={{
                        borderBottom: '1px solid var(--border-color)',
                        transition: 'background-color 0.15s',
                        backgroundColor: isBanned ? 'rgba(239, 68, 68, 0.03)' : 'transparent',
                      }}
                    >
                      {/* Avatar & Name & Email */}
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <img
                            src={
                              u.avatar ||
                              `https://ui-avatars.com/api/?name=${encodeURIComponent(u.fullName)}&background=6366F1&color=fff`
                            }
                            alt={u.fullName}
                            style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover' }}
                          />
                          <div>
                            <div style={{ fontWeight: '700', color: 'var(--text-primary)' }}>
                              {u.fullName}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Mail size={11} /> {u.email}
                            </div>
                            {u.phone && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Phone size={10} /> {u.phone}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td style={{ padding: '16px 20px' }}>
                        {getRoleBadge(u.role)}
                      </td>

                      {/* Info / Profile */}
                      <td style={{ padding: '16px 20px' }}>
                        {isStudent && (
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {u.studentProfile?.university || 'Chưa cập nhật trường'}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                              {u.studentProfile?.major || 'Chưa cập nhật ngành'}
                              {u.studentProfile?.studentId ? ` • MSSV: ${u.studentProfile.studentId}` : ''}
                            </div>
                          </div>
                        )}
                        {isPartner && (
                          <div>
                            <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                              {u.partnerProfile?.businessName || 'Chuỗi Cafe Đối Tác'}
                            </div>
                          </div>
                        )}
                        {u.role === 'admin' && (
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                            Toàn quyền quản trị hệ thống
                          </div>
                        )}
                      </td>

                      {/* Created At */}
                      <td style={{ padding: '16px 20px', color: 'var(--text-secondary)', fontSize: '13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} color="var(--text-muted)" />
                          {u.createdAt ? new Date(u.createdAt).toLocaleString('vi-VN') : 'Mới tạo'}
                        </div>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '16px 20px' }}>
                        {isBanned ? (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            backgroundColor: '#FEF2F2', color: '#DC2626',
                            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700'
                          }}>
                            <Ban size={12} /> Đã bị khoá
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex', alignItems: 'center', gap: '4px',
                            backgroundColor: '#F0FDF4', color: '#16A34A',
                            padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: '700'
                          }}>
                            <CheckCircle2 size={12} /> Hoạt động
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            disabled={actionLoading === u._id}
                            style={{
                              padding: '6px 14px',
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              border: 'none',
                              backgroundColor: isBanned ? '#10B981' : '#FEE2E2',
                              color: isBanned ? '#fff' : '#DC2626',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {isBanned ? <ShieldCheck size={14} /> : <Ban size={14} />}
                            {actionLoading === u._id
                              ? 'Đang xử lý...'
                              : isBanned
                              ? 'Mở khoá'
                              : 'Khoá tài khoản'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
