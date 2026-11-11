import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, KeyRound, Lock, Unlock, Trash2, Copy, Store } from 'lucide-react';
import { cashierApi, venueApi } from '../../services/api';
import { notify, confirmDialog } from '../../utils/notify';

const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{2,29}$/;
const EMPTY_FORM = { fullName: '', username: '', password: '', venueId: '' };

const inputStyle = {
  width: '100%',
  padding: '10px 12px',
  borderRadius: '10px',
  border: '1.5px solid var(--border-color)',
  fontSize: '14px',
  backgroundColor: '#FFFFFF',
};
const labelStyle = { display: 'block', fontSize: '12.5px', fontWeight: '700', color: 'var(--text-primary)', marginBottom: '6px' };

const formatTime = (value) => (value ? new Date(value).toLocaleString('vi-VN') : 'Chưa đăng nhập');

// Thông tin chủ quán gửi cho nhân viên sau khi tạo / đặt lại mật khẩu
const loginInstructions = ({ fullName, username, password, venueName }) =>
  [
    `Tài khoản thu ngân UNI-MATE của ${fullName} (${venueName})`,
    `1. Mở ${window.location.origin}/login trên điện thoại hoặc máy tính ở quầy`,
    '2. Chọn tab "Đối tác Quán"',
    `3. Tên đăng nhập: ${username}`,
    `4. Mật khẩu: ${password}`,
  ].join('\n');

export default function CashierAccounts() {
  const [venues, setVenues] = useState([]);
  const [cashiers, setCashiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  // Thông tin đăng nhập vừa tạo / vừa đặt lại để chủ quán gửi cho nhân viên
  const [handover, setHandover] = useState(null);
  // Đang đặt lại mật khẩu cho thu ngân nào
  const [resetId, setResetId] = useState(null);
  const [resetPassword, setResetPassword] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const [venueRes, cashierRes] = await Promise.all([venueApi.getMyVenues(), cashierApi.list()]);
      const venueList = venueRes?.data || [];
      setVenues(venueList);
      setCashiers(cashierRes?.data || []);
      setForm((prev) => (prev.venueId ? prev : { ...prev, venueId: venueList[0]?._id || '' }));
    } catch (err) {
      notify.error('Không tải được danh sách thu ngân: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const venueName = (id) => venues.find((v) => v._id === id)?.name || 'chi nhánh';

  const replaceCashier = (updated) => setCashiers((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));

  const handleCreate = async (e) => {
    e.preventDefault();
    const username = form.username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(username)) {
      notify.error('Tên đăng nhập gồm 3–30 ký tự: chữ thường không dấu, số, dấu chấm, gạch ngang hoặc gạch dưới');
      return;
    }
    if (form.password.length < 6) {
      notify.error('Mật khẩu phải từ 6 ký tự');
      return;
    }
    setSaving(true);
    try {
      const res = await cashierApi.create({ ...form, username, fullName: form.fullName.trim() });
      setCashiers((prev) => [...prev, res.data]);
      setHandover({ fullName: res.data.fullName, username, password: form.password, venueName: venueName(form.venueId) });
      setForm({ ...EMPTY_FORM, venueId: form.venueId });
      notify.success(res.message);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const runUpdate = async (cashier, data) => {
    setBusyId(cashier.id);
    try {
      const res = await cashierApi.update(cashier.id, data);
      replaceCashier(res.data);
      notify.success(res.message);
      return res.data;
    } catch (err) {
      notify.error(err.message);
      return null;
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleLock = async (cashier) => {
    const locking = cashier.status !== 'suspended';
    if (locking) {
      const ok = await confirmDialog(
        `Khoá tài khoản của ${cashier.fullName}? Máy đang đăng nhập tài khoản này sẽ không quét được nữa. Lịch sử quét vẫn giữ nguyên.`,
        { title: 'Khoá tài khoản thu ngân', confirmText: 'Khoá', danger: true }
      );
      if (!ok) return;
    }
    await runUpdate(cashier, { status: locking ? 'suspended' : 'active' });
  };

  const handleChangeVenue = async (cashier, venueId) => {
    const ok = await confirmDialog(`Chuyển ${cashier.fullName} sang quét tại ${venueName(venueId)}?`, {
      title: 'Đổi chi nhánh',
      confirmText: 'Chuyển',
    });
    if (ok) await runUpdate(cashier, { venueId });
  };

  const handleResetPassword = async (cashier) => {
    if (resetPassword.length < 6) {
      notify.error('Mật khẩu phải từ 6 ký tự');
      return;
    }
    const updated = await runUpdate(cashier, { password: resetPassword });
    if (updated) {
      setHandover({ fullName: updated.fullName, username: updated.username, password: resetPassword, venueName: updated.venue?.name || '' });
      setResetId(null);
      setResetPassword('');
    }
  };

  const handleDelete = async (cashier) => {
    const ok = await confirmDialog(`Xoá hẳn tài khoản của ${cashier.fullName}?`, {
      title: 'Xoá tài khoản thu ngân',
      confirmText: 'Xoá',
      danger: true,
    });
    if (!ok) return;
    setBusyId(cashier.id);
    try {
      const res = await cashierApi.remove(cashier.id);
      setCashiers((prev) => prev.filter((c) => c.id !== cashier.id));
      notify.success(res.message);
    } catch (err) {
      notify.error(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(loginInstructions(handover));
      notify.success('Đã chép, dán vào Zalo gửi cho nhân viên');
    } catch {
      notify.error('Máy không cho chép tự động, hãy bôi đen đoạn chữ để chép');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Tài khoản thu ngân
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          Tạo tài khoản riêng cho nhân viên đứng quầy, không cần đưa mật khẩu chủ quán. Thu ngân chỉ quét voucher và xem lịch sử quét
          của đúng chi nhánh được gắn: không sửa hay xoá được voucher, không xem số liệu quán.
        </p>
      </div>

      {/* Thông tin đăng nhập vừa tạo để gửi cho nhân viên */}
      {handover && (
        <div className="portal-card" style={{ border: '1.5px solid #10B981', backgroundColor: '#ECFDF5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
            <strong style={{ fontSize: '14px', color: '#065F46' }}>Gửi thông tin này cho {handover.fullName}</strong>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="button" className="btn btn-primary" onClick={handleCopy} style={{ padding: '8px 14px', fontSize: '13px' }}>
                <Copy size={14} />
                <span>Chép</span>
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => setHandover(null)} style={{ padding: '8px 14px', fontSize: '13px' }}>
                Đóng
              </button>
            </div>
          </div>
          <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'inherit', fontSize: '13px', color: '#065F46', lineHeight: '1.7' }}>
            {loginInstructions(handover)}
          </pre>
          <p style={{ fontSize: '12px', color: '#047857', marginTop: '8px' }}>
            Mật khẩu chỉ hiện lần này. Nhân viên quên thì bấm "Đặt lại mật khẩu" ở danh sách bên dưới.
          </p>
        </div>
      )}

      {/* Tạo tài khoản mới */}
      <div className="portal-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>
          <UserPlus size={18} color="var(--primary)" />
          Tạo tài khoản thu ngân
        </h3>
        {!loading && venues.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Bạn cần thêm quán ở mục <Link to="/partner/venues" style={{ color: 'var(--primary)', fontWeight: '700' }}>Quản lý địa điểm</Link> trước,
            mỗi thu ngân được gắn với một chi nhánh.
          </p>
        ) : (
          <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'end' }}>
            <div>
              <label htmlFor="cashier-name" style={labelStyle}>Tên nhân viên</label>
              <input
                id="cashier-name"
                required
                maxLength={60}
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                placeholder="vd: Lan ca sáng"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="cashier-username" style={labelStyle}>Tên đăng nhập</label>
              <input
                id="cashier-username"
                required
                maxLength={30}
                autoCapitalize="none"
                autoComplete="off"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value.toLowerCase().replace(/\s/g, '') })}
                placeholder="vd: bechill-svh1"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="cashier-password" style={labelStyle}>Mật khẩu (từ 6 ký tự)</label>
              <input
                id="cashier-password"
                required
                minLength={6}
                maxLength={64}
                autoComplete="new-password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Mật khẩu để đưa nhân viên"
                style={inputStyle}
              />
            </div>
            <div>
              <label htmlFor="cashier-venue" style={labelStyle}>Quét tại chi nhánh</label>
              <select
                id="cashier-venue"
                required
                value={form.venueId}
                onChange={(e) => setForm({ ...form, venueId: e.target.value })}
                style={inputStyle}
              >
                {venues.map((v) => (
                  <option key={v._id} value={v._id}>{v.name}</option>
                ))}
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ padding: '11px 16px', fontSize: '14px', opacity: saving ? 0.7 : 1 }}>
              <UserPlus size={16} />
              <span>{saving ? 'Đang tạo...' : 'Tạo tài khoản'}</span>
            </button>
          </form>
        )}
      </div>

      {/* Danh sách thu ngân */}
      <div className="portal-card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
          <Users size={18} color="var(--primary)" />
          Thu ngân của quán ({cashiers.length})
        </h3>
        <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '14px' }}>
          Nhân viên nghỉ việc: bấm Khoá, máy của họ ngừng quét được ngay và lịch sử vẫn giữ tên. Chỉ xoá được tài khoản chưa quét lượt nào.
        </p>

        {loading ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Đang tải...</p>
        ) : cashiers.length === 0 ? (
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Chưa có tài khoản thu ngân nào.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {cashiers.map((c) => {
              const locked = c.status === 'suspended';
              const busy = busyId === c.id;
              return (
                <div
                  key={c.id}
                  data-cashier={c.username}
                  style={{ border: '1px solid var(--border-color)', borderRadius: '14px', padding: '14px 16px', backgroundColor: locked ? '#F8FAFC' : '#FFFFFF' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <strong style={{ fontSize: '15px', color: 'var(--text-primary)' }}>{c.fullName}</strong>
                        <span className={`badge ${locked ? 'badge-danger' : 'badge-success'}`}>{locked ? 'Đã khoá' : 'Đang dùng'}</span>
                      </div>
                      <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        Tên đăng nhập: <strong>{c.username}</strong> · Đã quét {c.redemptionCount} lượt · Hoạt động gần nhất: {formatTime(c.lastActiveAt)}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0, flex: '0 1 260px' }}>
                      <Store size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                      <select
                        aria-label={`Chi nhánh của ${c.fullName}`}
                        value={c.venue?.id || ''}
                        disabled={busy}
                        onChange={(e) => handleChangeVenue(c, e.target.value)}
                        style={{ ...inputStyle, padding: '7px 10px', fontSize: '13px' }}
                      >
                        {!c.venue && <option value="">Chưa gắn chi nhánh</option>}
                        {venues.map((v) => (
                          <option key={v._id} value={v._id}>{v.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {resetId === c.id ? (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <input
                        autoFocus
                        minLength={6}
                        maxLength={64}
                        autoComplete="new-password"
                        value={resetPassword}
                        onChange={(e) => setResetPassword(e.target.value)}
                        placeholder="Mật khẩu mới (từ 6 ký tự)"
                        style={{ ...inputStyle, flex: '1 1 200px', width: 'auto', padding: '8px 12px', fontSize: '13px' }}
                      />
                      <button type="button" disabled={busy} className="btn btn-primary" onClick={() => handleResetPassword(c)} style={{ padding: '8px 14px', fontSize: '13px' }}>
                        Lưu mật khẩu
                      </button>
                      <button type="button" className="btn btn-ghost" onClick={() => { setResetId(null); setResetPassword(''); }} style={{ padding: '8px 14px', fontSize: '13px' }}>
                        Huỷ
                      </button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                      <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => { setResetId(c.id); setResetPassword(''); }} style={{ padding: '7px 12px', fontSize: '12.5px' }}>
                        <KeyRound size={14} />
                        <span>Đặt lại mật khẩu</span>
                      </button>
                      <button type="button" disabled={busy} className="btn btn-secondary" onClick={() => handleToggleLock(c)} style={{ padding: '7px 12px', fontSize: '12.5px', color: locked ? '#059669' : '#B91C1C' }}>
                        {locked ? <Unlock size={14} /> : <Lock size={14} />}
                        <span>{locked ? 'Mở khoá' : 'Khoá'}</span>
                      </button>
                      {c.redemptionCount === 0 && (
                        <button type="button" disabled={busy} className="btn btn-ghost" onClick={() => handleDelete(c)} style={{ padding: '7px 12px', fontSize: '12.5px', color: '#B91C1C' }}>
                          <Trash2 size={14} />
                          <span>Xoá</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
