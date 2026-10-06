import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket,
  QrCode,
  Coins,
  CheckCircle2,
  X,
  Copy,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { voucherApi } from '../../services/api';

export default function UserVouchers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my_vouchers');
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // API state
  const [myVouchers, setMyVouchers] = useState([]);
  const [publicVouchers, setPublicVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [claimingId, setClaimingId] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [walletRes, publicRes] = await Promise.allSettled([
        voucherApi.getMyWallet(),
        voucherApi.getPublicVouchers({ limit: 20 }),
      ]);
      if (walletRes.status === 'fulfilled') {
        const data = walletRes.value?.data || walletRes.value || [];
        setMyVouchers(Array.isArray(data) ? data : []);
      }
      if (publicRes.status === 'fulfilled') {
        const data = publicRes.value?.data || publicRes.value || [];
        setPublicVouchers(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleClaimVoucher = async (voucherId) => {
    setClaimingId(voucherId);
    try {
      await voucherApi.claimVoucher(voucherId);
      await fetchData(); // refresh wallet
    } catch (err) {
      alert('Không thể nhận voucher: ' + err.message);
    } finally {
      setClaimingId(null);
    }
  };

  const handleOpenQR = (vch) => {
    setSelectedVoucher(vch);
    setCopiedCode(false);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Normalize voucher fields from backend response
  const normalizeVoucher = (v) => ({
    id: v._id || v.id,
    code: v.code || v.voucherCode || '',
    title: v.title || v.name || 'Voucher',
    brand: v.brand || v.venueName || v.venue?.name || '—',
    logo: v.logo || '🎟️',
    expiry: v.expiryDate
      ? new Date(v.expiryDate).toLocaleDateString('vi-VN')
      : v.expiry || '—',
    discount: v.discountValue
      ? `${v.discountValue}${v.discountType === 'percent' ? '%' : 'đ'}`
      : v.discount || '—',
    minOrder: v.minOrderAmount ? `Từ ${v.minOrderAmount.toLocaleString()}đ` : v.minOrder || 'Không giới hạn',
    description: v.description || '',
    status: v.status || 'available',
  });

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '28px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '900', color: 'var(--text-primary)' }}>
            Ví Voucher & Ưu đãi Sinh viên 🎟️✨
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Xuất trình mã QR tại quán cafe để nhân viên đối tác quét và áp dụng giảm giá trực tiếp.
          </p>
        </div>

        {/* Balance Card */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#FFFBEB',
            padding: '12px 20px',
            borderRadius: '16px',
            border: '1.5px solid #FDE68A',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              backgroundColor: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
            }}
          >
            <Coins size={22} />
          </div>
          <div>
            <div style={{ fontSize: '11px', color: '#B45309', fontWeight: '700', textTransform: 'uppercase' }}>
              Số dư UniCoin của bạn
            </div>
            <div style={{ fontSize: '20px', fontWeight: '900', color: '#92400E' }}>
              {user?.uniCoin || 450} UniCoin
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          backgroundColor: '#E2E8F0',
          padding: '4px',
          borderRadius: '12px',
          width: 'fit-content',
          marginBottom: '24px',
        }}
      >
        <button
          onClick={() => setActiveTab('my_vouchers')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: '700',
            backgroundColor: activeTab === 'my_vouchers' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'my_vouchers' ? '#E64A19' : 'var(--text-secondary)',
            boxShadow: activeTab === 'my_vouchers' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
          }}
        >
          Voucher của tôi ({myVouchers.length})
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: '700',
            backgroundColor: activeTab === 'rewards' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'rewards' ? '#E64A19' : 'var(--text-secondary)',
            boxShadow: activeTab === 'rewards' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
          }}
        >
          Đổi điểm UniCoin lấy Voucher 🪙
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 12px' }} />
          <p>Dang tai voucher...</p>
        </div>
      )}
      {!loading && error && (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <AlertCircle size={36} color="#EF4444" style={{ margin: '0 auto 12px' }} />
          <p style={{ color: '#EF4444', marginBottom: '16px' }}>Khong the tai voucher: {error}</p>
          <button onClick={fetchData} style={{ padding: '8px 16px', borderRadius: '8px', backgroundColor: '#FF5722', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Thu lai</button>
        </div>
      )}
      {/* Tab 1: My Vouchers */}
      {!loading && !error && activeTab === 'my_vouchers' && (
        myVouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <Ticket size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', fontWeight: '700' }}>Ban chua co voucher nao</p>
            <button onClick={() => setActiveTab('rewards')} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '10px', backgroundColor: '#FF5722', color: '#fff', fontWeight: '700', cursor: 'pointer' }}>Xem uu dai</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
            {myVouchers.map((raw) => {
              const vch = normalizeVoucher(raw);
              return (
            <div
              key={vch.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                border: '1.5px solid var(--border-color)',
                overflow: 'hidden',
                boxShadow: '0 4px 12px rgba(0,0,0,0.04)',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {/* Discount Tag Header */}
              <div
                style={{
                  backgroundColor: '#FFF3E0',
                  padding: '16px 20px',
                  borderBottom: '1px dashed #FFCC80',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{vch.logo}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#E64A19' }}>
                      {vch.brand}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      HSD: {vch.expiry}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#FF5722',
                    color: '#FFFFFF',
                    padding: '4px 10px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '900',
                  }}
                >
                  {vch.discount}
                </div>
              </div>

              {/* Body */}
              <div style={{ padding: '18px 20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                  {vch.title}
                </h3>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                  {vch.description}
                </p>

                <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '12px', borderTop: '1px solid var(--border-light)' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Điều kiện: <strong>{vch.minOrder}</strong>
                  </div>

                  <button
                    onClick={() => handleOpenQR(vch)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      borderRadius: '10px',
                      backgroundColor: '#FF5722',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(255, 87, 34, 0.3)',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Dùng ngay</span>
                  </button>
                </div>
              </div>
            </div>
              );
            })}
          </div>
        )
      )}

      {/* Tab 2: Public Vouchers to Claim */}
      {!loading && !error && activeTab === 'rewards' && (
        publicVouchers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
            <Ticket size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
            <p style={{ fontSize: '16px', fontWeight: '700' }}>Chưa có voucher nào để nhận</p>
            <p style={{ fontSize: '13px', marginTop: '6px' }}>Quay lại sau nhé, đối tác đang cập nhật thêm ưu đãi!</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {publicVouchers.map((raw) => {
              const vch = normalizeVoucher(raw);
              const alreadyClaimed = myVouchers.some(mv => (mv._id || mv.id) === (raw._id || raw.id));
              return (
                <div key={vch.id} style={{ backgroundColor: '#FFFFFF', borderRadius: '18px', padding: '22px', border: '1.5px solid var(--border-color)', boxShadow: '0 4px 10px rgba(0,0,0,0.03)', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                    <span style={{ fontSize: '28px' }}>{vch.logo}</span>
                    <div style={{ backgroundColor: '#FFF3E0', padding: '4px 10px', borderRadius: '20px', color: '#E64A19', fontSize: '13px', fontWeight: '800' }}>{vch.discount}</div>
                  </div>
                  <div style={{ fontSize: '12px', fontWeight: '700', color: '#E64A19', marginBottom: '4px' }}>{vch.brand}</div>
                  <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>{vch.title}</h4>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px', lineHeight: '1.5', flex: 1 }}>{vch.description}</p>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '14px' }}>Điều kiện: {vch.minOrder} · HSD: {vch.expiry}</div>
                  <button
                    onClick={() => !alreadyClaimed && handleClaimVoucher(vch.id)}
                    disabled={alreadyClaimed || claimingId === vch.id}
                    style={{ padding: '10px', borderRadius: '10px', backgroundColor: alreadyClaimed ? '#E2E8F0' : '#FF5722', color: alreadyClaimed ? 'var(--text-muted)' : '#FFFFFF', fontSize: '13px', fontWeight: '700', cursor: alreadyClaimed ? 'default' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    {claimingId === vch.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : alreadyClaimed ? <CheckCircle2 size={14} /> : null}
                    {alreadyClaimed ? 'Đã nhận' : claimingId === vch.id ? 'Đang nhận...' : 'Nhận Voucher'}
                  </button>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* QR Code Presentation Modal */}
      {selectedVoucher && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '24px',
              padding: '32px',
              maxWidth: '400px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#FF5722', textTransform: 'uppercase' }}>
                {selectedVoucher.brand}
              </span>
              <button onClick={() => setSelectedVoucher(null)} style={{ cursor: 'pointer', color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <h3 style={{ fontSize: '17px', fontWeight: '900', color: 'var(--text-primary)', marginBottom: '4px' }}>
              {selectedVoucher.title}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
              Đưa mã QR này cho thu ngân quán quét để áp dụng khuyến mãi
            </p>

            {/* Mock Dynamic QR Box */}
            <div
              style={{
                width: '200px',
                height: '200px',
                margin: '0 auto 16px auto',
                padding: '16px',
                backgroundColor: '#FFFFFF',
                borderRadius: '16px',
                border: '2px dashed #FF5722',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(0,0,0,0.06)',
              }}
            >
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(selectedVoucher.code + '|' + user?.studentId)}`}
                alt="QR Voucher"
                style={{ width: '100%', height: '100%' }}
              />
            </div>

            {/* Text Code Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px 14px',
                backgroundColor: '#F1F5F9',
                borderRadius: '10px',
                marginBottom: '16px',
              }}
            >
              <span style={{ fontSize: '14px', fontWeight: '800', letterSpacing: '1px', color: 'var(--text-primary)' }}>
                {selectedVoucher.code}
              </span>
              <button
                onClick={() => handleCopyCode(selectedVoucher.code)}
                style={{ color: '#FF5722', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Sao chép mã"
              >
                {copiedCode ? <CheckCircle2 size={16} color="#FF7043" /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Mã liên kết với MSSV: <strong>{user?.studentId || '—'}</strong> (Có hiệu lực đến {selectedVoucher.expiry})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

