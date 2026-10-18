import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Upload,
  Loader2,
  X,
  Sparkles,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { coinApi } from '../../services/api';
import { trackEvent } from '../../utils/analytics';

export default function QRCheckinModal({ isOpen, onClose, onSuccess }) {
  const [activeTab, setActiveTab] = useState('camera'); // 'camera' | 'file' | 'manual'
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [geoStatus, setGeoStatus] = useState('pending'); // 'pending' | 'success' | 'denied' | 'error'
  const [geoError, setGeoError] = useState('');
  
  const [manualQr, setManualQr] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorNotice, setErrorNotice] = useState(null);
  const [successResult, setSuccessResult] = useState(null);
  const [cameraError, setCameraError] = useState(null);

  const scannerRef = useRef(null);
  const fileInputRef = useRef(null);
  const isScanningRef = useRef(false);

  // 1. Xin quyền vị trí GPS khi mở modal
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoStatus('error');
      setGeoError('Trình duyệt của bạn không hỗ trợ định vị GPS');
      return;
    }
    setGeoStatus('pending');
    setGeoError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        setGeoStatus('success');
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setGeoStatus('denied');
        if (err.code === 1) {
          setGeoError('Bạn đã từ chối quyền vị trí. Vui lòng bật định vị trên trình duyệt để check-in.');
        } else {
          setGeoError('Không thể lấy toạ độ GPS. Hãy bật định vị và thử lại.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      requestLocation();
      setErrorNotice(null);
      setSuccessResult(null);
      setManualQr('');
    }
  }, [isOpen]);

  // 2. Quản lý camera scanner với html5-qrcode
  useEffect(() => {
    if (!isOpen || activeTab !== 'camera' || successResult) {
      stopScanner();
      return;
    }

    let isMounted = true;
    const scannerId = 'checkin-qr-reader';

    const startCamera = async () => {
      try {
        setCameraError(null);
        // Chờ DOM node render
        await new Promise((r) => setTimeout(r, 150));
        if (!isMounted) return;

        const html5QrCode = new Html5Qrcode(scannerId);
        scannerRef.current = html5QrCode;

        const config = {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => {
            if (isScanningRef.current) return;
            isScanningRef.current = true;
            handleCheckinWithQr(decodedText);
          },
          () => {
            // Callback quét từng frame, không cần log
          }
        );
      } catch (err) {
        console.warn('Camera start error:', err);
        if (isMounted) {
          setCameraError(
            'Không thể truy cập camera. Vui lòng cho phép quyền Camera hoặc dùng chế độ "Tải ảnh" / "Dán mã".'
          );
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [isOpen, activeTab, successResult]);

  const stopScanner = () => {
    if (scannerRef.current) {
      try {
        scannerRef.current.stop().then(() => {
          scannerRef.current?.clear();
          scannerRef.current = null;
        }).catch(() => {
          scannerRef.current = null;
        });
      } catch (e) {
        scannerRef.current = null;
      }
    }
    isScanningRef.current = false;
  };

  // 3. Xử lý gửi check-in lên backend
  const handleCheckinWithQr = async (qrContent) => {
    if (!qrContent || submitting) return;
    const cleanQr = qrContent.trim();
    if (!cleanQr) return;

    setSubmitting(true);
    setErrorNotice(null);

    try {
      const payload = {
        qrContent: cleanQr,
        ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
      };

      const res = await coinApi.venueCheckin(payload);
      if (res?.success) {
        trackEvent('venue_checkin');
        setSuccessResult(res);
        stopScanner();
        if (onSuccess) {
          onSuccess(res);
        }
      } else {
        throw new Error(res?.message || 'Check-in thất bại');
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Mã QR không hợp lệ hoặc vị trí không phù hợp';
      setErrorNotice(msg);
      isScanningRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  // 4. Quét qua file ảnh
  const handleFileScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSubmitting(true);
    setErrorNotice(null);

    try {
      const html5QrCode = new Html5Qrcode('qr-file-detector-temp');
      const decodedText = await html5QrCode.scanFile(file, true);
      html5QrCode.clear();
      await handleCheckinWithQr(decodedText);
    } catch (err) {
      setErrorNotice('Không tìm thấy mã QR hợp lệ trong ảnh này. Vui lòng thử ảnh khác!');
    } finally {
      setSubmitting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.7)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out',
      }}
    >
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderRadius: '24px',
          maxWidth: '460px',
          width: '100%',
          padding: '28px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Nút đóng */}
        <button
          onClick={() => {
            stopScanner();
            onClose();
          }}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#94A3B8',
            padding: '4px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          aria-label="Đóng"
        >
          <X size={20} />
        </button>

        {/* Thành công */}
        {successResult ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div
              style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: '#DCFCE7',
                color: '#16A34A',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <CheckCircle2 size={42} />
            </div>

            <h3 style={{ fontSize: '20px', fontWeight: '900', color: '#1E293B', marginBottom: '8px' }}>
              Check-in Thành Công! 🎉
            </h3>
            <p style={{ fontSize: '14px', color: '#64748B', lineHeight: '1.5', marginBottom: '20px' }}>
              {successResult.message || 'Bạn đã nhận được điểm thưởng UniCoin từ quán cafe đối tác.'}
            </p>

            <div
              style={{
                backgroundColor: '#FFFBEB',
                border: '1.5px solid #FDE68A',
                borderRadius: '16px',
                padding: '16px',
                marginBottom: '24px',
              }}
            >
              <div style={{ fontSize: '12px', fontWeight: '800', color: '#B45309', textTransform: 'uppercase' }}>
                Phần thưởng đã cộng vào ví
              </div>
              <div style={{ fontSize: '28px', fontWeight: '900', color: '#D97706', marginTop: '4px' }}>
                +{successResult.data?.coinEarned ?? 20} <span style={{ fontSize: '16px' }}>UniCoin</span>
              </div>
              {successResult.data?.newStreak > 1 && (
                <div style={{ fontSize: '12px', color: '#92400E', marginTop: '4px', fontWeight: '700' }}>
                  🔥 Chuỗi liên tiếp: {successResult.data.newStreak} ngày!
                </div>
              )}
            </div>

            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '14px',
                border: 'none',
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                fontSize: '15px',
                fontWeight: '800',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
              }}
            >
              Tuyệt vời, Đóng
            </button>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div style={{ textAlign: 'center', marginBottom: '18px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '18px',
                  backgroundColor: '#EFF6FF',
                  color: '#2563EB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px auto',
                }}
              >
                <QrCode size={28} />
              </div>
              <h3 style={{ fontSize: '19px', fontWeight: '900', color: '#0F172A', margin: '0 0 6px 0' }}>
                Quét mã QR Check-in Quán ☕
              </h3>
              <p style={{ fontSize: '13px', color: '#64748B', margin: 0, lineHeight: '1.4' }}>
                Quét mã QR dán trên bàn hoặc quầy thu ngân tại quán đối tác để nhận ngay +20 UniCoin.
              </p>
            </div>

            {/* Trạng thái vị trí GPS */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: geoStatus === 'success' ? '#F0FDF4' : geoStatus === 'denied' ? '#FEF2F2' : '#F8FAFC',
                border: `1px solid ${geoStatus === 'success' ? '#BBF7D0' : geoStatus === 'denied' ? '#FECACA' : '#E2E8F0'}`,
                marginBottom: '16px',
                fontSize: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Navigation
                  size={15}
                  color={geoStatus === 'success' ? '#16A34A' : geoStatus === 'denied' ? '#DC2626' : '#64748B'}
                />
                <span style={{ color: geoStatus === 'success' ? '#15803D' : geoStatus === 'denied' ? '#B91C1C' : '#475569', fontWeight: '700' }}>
                  {geoStatus === 'success'
                    ? `Đã xác thực GPS (${coords?.lat.toFixed(4)}, ${coords?.lng.toFixed(4)})`
                    : geoStatus === 'pending'
                    ? 'Đang kiểm tra vị trí GPS...'
                    : 'Chưa có vị trí GPS'}
                </span>
              </div>
              {geoStatus !== 'success' && (
                <button
                  type="button"
                  onClick={requestLocation}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: '#2563EB',
                    fontSize: '11.5px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                  }}
                >
                  Thử lại
                </button>
              )}
            </div>

            {geoError && (
              <div style={{ fontSize: '11.5px', color: '#DC2626', marginBottom: '12px', padding: '0 4px' }}>
                ⚠️ {geoError}
              </div>
            )}

            {/* Tabs chuyển đổi: Camera / Tải ảnh / Dán mã */}
            <div
              style={{
                display: 'flex',
                backgroundColor: '#F1F5F9',
                borderRadius: '12px',
                padding: '3px',
                marginBottom: '16px',
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab('camera')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'camera' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'camera' ? '#2563EB' : '#64748B',
                  boxShadow: activeTab === 'camera' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Camera size={14} /> Camera
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('file')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'file' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'file' ? '#2563EB' : '#64748B',
                  boxShadow: activeTab === 'file' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <Upload size={14} /> Tải ảnh
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  borderRadius: '10px',
                  border: 'none',
                  fontSize: '12.5px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  backgroundColor: activeTab === 'manual' ? '#FFFFFF' : 'transparent',
                  color: activeTab === 'manual' ? '#2563EB' : '#64748B',
                  boxShadow: activeTab === 'manual' ? '0 2px 4px rgba(0,0,0,0.06)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
              >
                <QrCode size={14} /> Dán mã
              </button>
            </div>

            {/* Error Message */}
            {errorNotice && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#B91C1C',
                  fontSize: '12.5px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '8px',
                  marginBottom: '16px',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorNotice}</span>
              </div>
            )}

            {/* TAB 1: Camera Scanner */}
            {activeTab === 'camera' && (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    minHeight: '260px',
                    borderRadius: '18px',
                    overflow: 'hidden',
                    backgroundColor: '#0F172A',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '14px',
                  }}
                >
                  <div id="checkin-qr-reader" style={{ width: '100%', height: '100%' }}></div>
                  {cameraError && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.9)', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <Camera size={36} color="#94A3B8" style={{ marginBottom: '10px' }} />
                      <p style={{ fontSize: '12.5px', color: '#CBD5E1', marginBottom: '12px', lineHeight: '1.5' }}>
                        {cameraError}
                      </p>
                      <button
                        type="button"
                        onClick={() => setActiveTab('file')}
                        style={{ padding: '8px 16px', borderRadius: '10px', backgroundColor: '#2563EB', color: '#fff', border: 'none', fontWeight: '800', fontSize: '12px', cursor: 'pointer' }}
                      >
                        Chọn ảnh QR từ máy
                      </button>
                    </div>
                  )}
                  {submitting && (
                    <div style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(15, 23, 42, 0.8)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                      <Loader2 size={36} style={{ animation: 'spin 1s linear infinite', marginBottom: '10px' }} />
                      <span style={{ fontSize: '13px', fontWeight: '700' }}>Đang xác thực check-in...</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: '11.5px', color: '#94A3B8', margin: 0 }}>
                  Di chuyển camera sao cho mã QR dán tại quán nằm trọn trong khung ngắm.
                </p>
              </div>
            )}

            {/* TAB 2: File Upload */}
            {activeTab === 'file' && (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleFileScan}
                  style={{ display: 'none' }}
                />
                <div id="qr-file-detector-temp" style={{ display: 'none' }}></div>

                <div
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed #93C5FD',
                    borderRadius: '18px',
                    padding: '36px 20px',
                    cursor: 'pointer',
                    backgroundColor: '#F8FAFC',
                    transition: 'all 0.2s',
                    marginBottom: '14px',
                  }}
                >
                  <Upload size={36} color="#2563EB" style={{ margin: '0 auto 10px auto' }} />
                  <div style={{ fontSize: '14px', fontWeight: '800', color: '#1E293B', marginBottom: '4px' }}>
                    Nhấn để chọn ảnh chứa mã QR
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>
                    Hỗ trợ file PNG, JPG, JPEG chụp lại tại quán
                  </div>
                </div>

                {submitting && (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', color: '#2563EB', fontSize: '13px', fontWeight: '700' }}>
                    <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Đang đọc mã QR từ ảnh...
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: Dán chuỗi QR trực tiếp (Tiện kiểm thử & Nhập tay) */}
            {activeTab === 'manual' && (
              <div>
                <p style={{ fontSize: '12.5px', color: '#64748B', marginBottom: '12px' }}>
                  Nhập hoặc dán nội dung mã QR check-in (dạng <code>UNIMATE-CHECKIN:...</code>):
                </p>
                <textarea
                  rows={3}
                  value={manualQr}
                  onChange={(e) => setManualQr(e.target.value)}
                  placeholder="UNIMATE-CHECKIN:6aa658b41a3d653dc83dd2df:secretKey123..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: '1.5px solid #CBD5E1',
                    fontSize: '12.5px',
                    fontFamily: 'monospace',
                    marginBottom: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                <button
                  type="button"
                  disabled={!manualQr.trim() || submitting}
                  onClick={() => handleCheckinWithQr(manualQr)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '12px',
                    border: 'none',
                    backgroundColor: '#2563EB',
                    color: '#FFFFFF',
                    fontSize: '14px',
                    fontWeight: '800',
                    cursor: !manualQr.trim() || submitting ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                  }}
                >
                  {submitting ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : 'Gửi Check-in Ngay'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        #checkin-qr-reader video {
          border-radius: 18px !important;
          object-fit: cover !important;
        }
      `}</style>
    </div>
  );
}
