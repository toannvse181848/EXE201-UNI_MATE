import React, { useState } from 'react';
import {
  QrCode,
  Scan,
  CheckCircle2,
  AlertCircle,
  User,
  Coffee,
  Calendar,
  Clock,
  Printer,
  History,
  RotateCcw,
} from 'lucide-react';

const MOCK_CHECKINS = [
  { id: 'ck_1', code: 'VCH-2024-X9F2', student: 'Lê Phương Thảo (ĐH Bách Khoa)', discount: 'Giảm 20%', time: '10:32 Hôm nay', cashier: 'Thu ngân 01' },
  { id: 'ck_2', code: 'FREEDRINK-991', student: 'Trần Hoàng Nam (ĐH Kinh Tế)', discount: 'Tặng 1 ly trà đào', time: '09:45 Hôm nay', cashier: 'Thu ngân 01' },
  { id: 'ck_3', code: 'LUNCH20-771', student: 'Nguyễn Hà My (ĐH RMIT)', discount: 'Giảm 20%', time: 'Hôm qua, 19:20', cashier: 'Thu ngân 02' },
];

export default function QRScanner() {
  const [inputCode, setInputCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [history, setHistory] = useState(MOCK_CHECKINS);

  const handleVerifyCode = (codeToVerify) => {
    const code = codeToVerify || inputCode;
    if (!code.trim()) return;

    setScanning(true);
    setConfirmed(false);

    setTimeout(() => {
      setScanning(false);
      setScanResult({
        code: code.toUpperCase(),
        valid: true,
        title: 'Giảm 20% tổng hoá đơn đồ uống',
        studentName: 'Lê Phương Thảo',
        studentSchool: 'ĐH Bách Khoa TP.HCM (K21)',
        studentAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
        venue: 'The Coffee House - Sư Vạn Hạnh',
        expiry: 'Còn hạn đến 30/11/2024',
        meetupPartner: 'Trần Hoàng Nam',
      });
    }, 600);
  };

  const handleConfirmRedeem = () => {
    if (!scanResult) return;
    setConfirmed(true);
    const newEntry = {
      id: `ck_${Date.now()}`,
      code: scanResult.code,
      student: `${scanResult.studentName} (${scanResult.studentSchool.split(' ')[0]})`,
      discount: 'Giảm 20%',
      time: 'Vừa xong',
      cashier: 'Thu ngân 01',
    };
    setHistory([newEntry, ...history]);
  };

  const handleReset = () => {
    setInputCode('');
    setScanResult(null);
    setConfirmed(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Page Header */}
      <div>
        <h1 style={{ fontSize: '26px', fontWeight: '900', color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
          Quét QR Check-in & Đổi Voucher
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
          Quét mã QR từ điện thoại sinh viên UNI-MATE để xác thực ưu đãi giảm giá tại quán.
        </p>
      </div>

      {/* Main Grid: Scanner Viewfinder & Verification Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
        {/* Left: Viewfinder Camera Simulation */}
        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Ống kính Camera Quét
            </span>
            <span className="badge badge-success">CAMERA ONLINE</span>
          </div>

          {/* Scanner Box */}
          <div
            style={{
              width: '280px',
              height: '280px',
              backgroundColor: '#0F172A',
              borderRadius: '24px',
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)',
            }}
          >
            {/* Viewfinder Corner Brackets */}
            <div style={{ position: 'absolute', top: '24px', left: '24px', width: '28px', height: '28px', borderTop: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderTopLeftRadius: '8px' }} />
            <div style={{ position: 'absolute', top: '24px', right: '24px', width: '28px', height: '28px', borderTop: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderTopRightRadius: '8px' }} />
            <div style={{ position: 'absolute', bottom: '24px', left: '24px', width: '28px', height: '28px', borderBottom: '4px solid var(--primary)', borderLeft: '4px solid var(--primary)', borderBottomLeftRadius: '8px' }} />
            <div style={{ position: 'absolute', bottom: '24px', right: '24px', width: '28px', height: '28px', borderBottom: '4px solid var(--primary)', borderRight: '4px solid var(--primary)', borderBottomRightRadius: '8px' }} />

            {/* Laser Line */}
            <div
              style={{
                position: 'absolute',
                width: '80%',
                height: '2px',
                backgroundColor: '#FF5722',
                boxShadow: '0 0 12px 3px #FF5722',
                top: scanning ? '80%' : '20%',
                transition: 'top 1.2s ease-in-out infinite alternate',
              }}
            />

            <QrCode size={100} color="#334155" />
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '14px', textAlign: 'center' }}>
            Hướng camera về phía màn hình ứng dụng điện thoại của khách hàng
          </p>

          {/* Manual Input or Fast Simulation buttons */}
          <div style={{ width: '100%', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Nhập mã thủ công nếu camera mờ:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="VD: VCH-2024-X9F2"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', textTransform: 'uppercase' }}
              />
              <button
                type="button"
                onClick={() => handleVerifyCode()}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Kiểm tra
              </button>
            </div>

            {/* Quick Demo buttons */}
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => {
                  setInputCode('VCH-2024-X9F2');
                  handleVerifyCode('VCH-2024-X9F2');
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', flex: 1 }}
              >
                ⚡ Quét mẫu: VCH-2024-X9F2
              </button>
              <button
                type="button"
                onClick={() => {
                  setInputCode('FREEDRINK-991');
                  handleVerifyCode('FREEDRINK-991');
                }}
                className="btn btn-secondary"
                style={{ padding: '4px 10px', fontSize: '11px', flex: 1 }}
              >
                ⚡ Quét mẫu: FREEDRINK
              </button>
            </div>
          </div>
        </div>

        {/* Right: Verification & Redeem Card */}
        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Kết quả kiểm tra voucher
              </h3>
              {scanResult && (
                <button
                  onClick={handleReset}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}
                >
                  <RotateCcw size={13} />
                  <span>Quét lượt mới</span>
                </button>
              )}
            </div>

            {scanResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Status Callout */}
                <div
                  style={{
                    backgroundColor: confirmed ? '#ECFDF5' : '#FFECE6',
                    border: '1.5px solid',
                    borderColor: confirmed ? '#10B981' : 'var(--primary)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  <CheckCircle2 size={32} color={confirmed ? '#10B981' : 'var(--primary)'} />
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '900', color: confirmed ? '#065F46' : 'var(--primary)' }}>
                      {confirmed ? 'ĐÃ CHECK-IN THÀNH CÔNG 🎉' : 'VOUCHER HỢP LỆ & KHẢ DỤNG ✅'}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      MÃ: {scanResult.code}
                    </span>
                  </div>
                </div>

                {/* Offer Details */}
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>ƯU ĐÃI ÁP DỤNG</span>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {scanResult.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Áp dụng giảm trực tiếp trên tổng hóa đơn gọi món nước tại quán.
                  </p>
                </div>

                {/* Student Customer Profile */}
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>THÔNG TIN SINH VIÊN</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <img
                      src={scanResult.studentAvatar}
                      alt={scanResult.studentName}
                      style={{ width: '48px', height: '48px', borderRadius: '24px', objectFit: 'cover' }}
                    />
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                        {scanResult.studentName}
                      </h4>
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {scanResult.studentSchool}
                      </p>
                      <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: '700' }}>
                        Đi cùng bạn match: {scanResult.meetupPartner}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Scan size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Chưa có voucher nào được quét
                </h4>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>
                  Quét mã QR của khách hoặc bấm nút quét mẫu bên trái để xem thông tin
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          {scanResult && !confirmed && (
            <button
              onClick={handleConfirmRedeem}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '20px' }}
            >
              <CheckCircle2 size={18} />
              <span>Xác nhận áp dụng voucher & Trừ tiền hóa đơn</span>
            </button>
          )}
        </div>
      </div>

      {/* Check-in History Table */}
      <div className="portal-card">
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>
          Lịch sử check-in hôm nay
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>MÃ VOUCHER</th>
                <th style={{ padding: '10px 14px' }}>SINH VIÊN</th>
                <th style={{ padding: '10px 14px' }}>ƯU ĐÃI</th>
                <th style={{ padding: '10px 14px' }}>THỜI GIAN</th>
                <th style={{ padding: '10px 14px' }}>THU NGÂN</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--primary)' }}>{h.code}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)' }}>{h.student}</td>
                  <td style={{ padding: '12px 14px', color: '#059669', fontWeight: '700' }}>{h.discount}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>{h.time}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{h.cashier}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
