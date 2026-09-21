import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  Ticket,
  QrCode,
  Coins,
  Clock,
  CheckCircle2,
  X,
  AlertCircle,
  Copy,
  Sparkles,
} from 'lucide-react';

const MY_VOUCHERS = [
  {
    id: 'vch_01',
    code: 'UNI-TCH-25',
    title: 'Giảm 25% Tổng bill thức uống',
    brand: 'The Coffee House',
    logo: '☕',
    expiry: '30/10/2026',
    discount: '25%',
    minOrder: 'Không giới hạn',
    description: 'Áp dụng cho mọi sinh viên xuất trình mã QR và thẻ SV hợp lệ.',
    status: 'available',
  },
  {
    id: 'vch_02',
    code: 'CHEESE-UNI-BOGO',
    title: 'Mua 1 Tặng 1 Trà Sữa Cam Sả',
    brand: 'Cheese Coffee',
    logo: '🧀',
    expiry: '15/10/2026',
    discount: 'BOGO',
    minOrder: 'Hóa đơn từ 45k',
    description: 'Mua 1 ly size L tặng 1 ly size M cùng loại vào các ngày trong tuần.',
    status: 'available',
  },
  {
    id: 'vch_03',
    code: 'CUDEM-NIGHT-39',
    title: 'Combo Cày Đêm: Cà phê + Bánh chỉ 39k',
    brand: 'Cú Đêm Study Hub 24/7',
    logo: '🦉',
    expiry: '20/11/2026',
    discount: '39K COMBO',
    minOrder: 'Sau 22:00 đêm',
    description: 'Tiếp sức mùa thi, ngồi bao lâu tùy thích không tính thêm phụ phí.',
    status: 'available',
  },
  {
    id: 'vch_04',
    code: 'PL-WELCOME-15K',
    title: 'Giảm 15.000đ cho đơn đầu tiên',
    brand: 'Phúc Long Tea',
    logo: '🍃',
    expiry: '05/10/2026',
    discount: '15.000đ',
    minOrder: 'Từ 50.000đ',
    description: 'Dành riêng cho tân sinh viên năm nhất xác thực thành công.',
    status: 'available',
  },
];

const UNICOIN_REWARDS = [
  {
    id: 'r1',
    title: 'Voucher Highlands Coffee 30k',
    coins: 150,
    desc: 'Đổi lấy mã giảm giá 30k cho mọi dòng Freeze và Trà sen vàng.',
  },
  {
    id: 'r2',
    title: 'Miễn phí 1 buổi Co-working Space 4 tiếng',
    coins: 300,
    desc: 'Không gian học nhóm riêng tư máy lạnh, free trà nước.',
  },
  {
    id: 'r3',
    title: 'Voucher Starbucks 50.000đ',
    coins: 400,
    desc: 'Áp dụng tại tất cả cửa hàng Starbucks trên toàn quốc.',
  },
];

export default function UserVouchers() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('my_vouchers'); // 'my_vouchers' | 'rewards'
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleOpenQR = (vch) => {
    setSelectedVoucher(vch);
    setCopiedCode(false);
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

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
            color: activeTab === 'my_vouchers' ? '#0F766E' : 'var(--text-secondary)',
            boxShadow: activeTab === 'my_vouchers' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
          }}
        >
          Voucher của tôi ({MY_VOUCHERS.length})
        </button>

        <button
          onClick={() => setActiveTab('rewards')}
          style={{
            padding: '8px 20px',
            borderRadius: '10px',
            fontSize: '13.5px',
            fontWeight: '700',
            backgroundColor: activeTab === 'rewards' ? '#FFFFFF' : 'transparent',
            color: activeTab === 'rewards' ? '#0F766E' : 'var(--text-secondary)',
            boxShadow: activeTab === 'rewards' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
            cursor: 'pointer',
          }}
        >
          Đổi điểm UniCoin lấy Voucher 🪙
        </button>
      </div>

      {/* Tab 1: My Vouchers */}
      {activeTab === 'my_vouchers' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {MY_VOUCHERS.map((vch) => (
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
                  backgroundColor: '#F0FDFA',
                  padding: '16px 20px',
                  borderBottom: '1px dashed #99F6E4',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '26px' }}>{vch.logo}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '800', color: '#0F766E' }}>
                      {vch.brand}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      HSD: {vch.expiry}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    backgroundColor: '#0D9488',
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
                      backgroundColor: '#0D9488',
                      color: '#FFFFFF',
                      fontSize: '12.5px',
                      fontWeight: '800',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(13, 148, 136, 0.3)',
                    }}
                  >
                    <QrCode size={16} />
                    <span>Dùng ngay</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: UniCoin Rewards */}
      {activeTab === 'rewards' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {UNICOIN_REWARDS.map((reward) => (
            <div
              key={reward.id}
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '18px',
                padding: '22px',
                border: '1.5px solid var(--border-color)',
                boxShadow: '0 4px 10px rgba(0,0,0,0.03)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                <span style={{ fontSize: '28px' }}>🎁</span>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    backgroundColor: '#FEF3C7',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    color: '#B45309',
                    fontSize: '13px',
                    fontWeight: '800',
                  }}
                >
                  <Coins size={14} />
                  <span>{reward.coins} UniCoin</span>
                </div>
              </div>

              <h4 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                {reward.title}
              </h4>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '18px', lineHeight: '1.5' }}>
                {reward.desc}
              </p>

              <button
                onClick={() => alert(`🎉 Chúc mừng! Bạn đã đổi thành công [${reward.title}]. Mã ưu đãi đã được chuyển vào Ví Voucher của bạn.`)}
                style={{
                  marginTop: 'auto',
                  padding: '10px',
                  borderRadius: '10px',
                  backgroundColor: '#F59E0B',
                  color: '#FFFFFF',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: 'none',
                }}
              >
                Đổi quà ngay ({reward.coins} coin)
              </button>
            </div>
          ))}
        </div>
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
              <span style={{ fontSize: '12px', fontWeight: '800', color: '#0D9488', textTransform: 'uppercase' }}>
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
                border: '2px dashed #0D9488',
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
                style={{ color: '#0D9488', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Sao chép mã"
              >
                {copiedCode ? <CheckCircle2 size={16} color="#10B981" /> : <Copy size={16} />}
              </button>
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              Mã liên kết với MSSV: <strong>{user?.studentId || 'SE181848'}</strong> (Có hiệu lực đến {selectedVoucher.expiry})
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
