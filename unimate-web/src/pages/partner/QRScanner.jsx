import React, { useState, useEffect, useEffectEvent, useRef } from 'react';
import {
  QrCode,
  Scan,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Camera,
  CameraOff,
  Upload,
  Store,
} from 'lucide-react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { voucherApi, venueApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { trackEvent } from '../../utils/analytics';
import { getAvatarUrl } from '../../constants/avatar';
import { describeVoucher, formatVnd } from '../../utils/voucher';
import { notify } from '../../utils/notify';

// html5-qrcode tự vẽ video vào các div này (xoá sạch nội dung bên trong), nên React không render con vào đó
const CAMERA_READER_ID = 'partner-qr-reader';
const PHOTO_READER_ID = 'partner-qr-photo-reader';
// Chỉ đọc mã QR, bỏ qua mã vạch trên ly / hoá đơn
const READER_CONFIG = { formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE], verbose: false };

// Chủ quán nhiều chi nhánh: nhớ chi nhánh đang quét trên máy này
const SCAN_VENUE_KEY = 'unimate_scan_venue';
const readSavedVenue = () => {
  try {
    return localStorage.getItem(SCAN_VENUE_KEY) || '';
  } catch {
    return '';
  }
};
const saveVenue = (id) => {
  try {
    localStorage.setItem(SCAN_VENUE_KEY, id);
  } catch {
    // Trình duyệt chặn lưu trữ: lần sau chọn lại chi nhánh
  }
};

// Lỗi mở camera → câu hướng dẫn thu ngân tự xử lý được
const cameraErrorMessage = (err) => {
  const text = String(err?.message || err || '');
  if (!window.isSecureContext || !navigator.mediaDevices || /not supported/i.test(text)) {
    return 'Trình duyệt này không mở được camera. Mở link bằng Safari hoặc Chrome (link https://), không mở trong Zalo / Messenger.';
  }
  if (/NotAllowed|Permission|denied/i.test(text)) {
    return 'Trình duyệt đang chặn camera. iPhone: bấm "aA" trên thanh địa chỉ → Cài đặt trang web → Camera → Cho phép. Android: bấm biểu tượng ổ khoá → Quyền → Camera.';
  }
  if (/NotReadable|Could not start|in use/i.test(text)) {
    return 'Camera đang được ứng dụng khác dùng. Tắt ứng dụng đó rồi bật lại camera.';
  }
  return 'Không mở được camera trên máy này. Dùng nút chụp ảnh mã QR hoặc nhập mã bên dưới.';
};

// Kết quả kiểm tra mã từ backend → dữ liệu hiển thị trên thẻ kết quả
const toScanResult = (found, payload) => {
  const student = found?.student;
  return {
    payload,
    code: found.code,
    valid: true,
    title: found.title || `Voucher ${found.code}`,
    // Ưu đãi và điều kiện thật của voucher (nhân viên đối chiếu trước khi áp)
    discountLabel: describeVoucher(found).discountLabel,
    conditionLabel: describeVoucher(found).conditionLabel,
    minBill: Number(found.minBill) || 0,
    note: found.description || '',
    studentId: student?.id || null,
    studentName: student?.fullName || 'Khách dùng mã chung (không qua ví)',
    studentSchool: student
      ? [student.university, student.studentId && `MSSV: ${student.studentId}`].filter(Boolean).join(' · ')
      : 'Mã voucher chung của quán',
    studentAvatar: getAvatarUrl(student?.avatar),
    venue: found.venueName || 'Cửa hàng đối tác',
    expiry: found.validUntil ? new Date(found.validUntil).toLocaleDateString('vi-VN') : 'Còn hạn sử dụng',
    // Ưu đãi hẹn cafe: mỗi bạn một mã, requiresCompanion = phải quét thêm mã của bạn đi cùng rồi mới áp dụng
    fromMeetup: Boolean(found.fromMeetup),
    meetup: found.meetup || null,
  };
};

// UniCoin thực nhận của một sinh viên, nói rõ khi bị cắt vì giới hạn kiếm coin trong ngày
const coinResultText = ({ fullName, coinAwarded, coinCapped }, maxDailyEarn) => {
  if (coinAwarded <= 0) return `${fullName}: không cộng thêm UniCoin vì hôm nay đã đạt giới hạn ${maxDailyEarn} UniCoin`;
  return `${fullName}: +${coinAwarded} UniCoin${coinCapped ? ` (đã chạm giới hạn ${maxDailyEarn} UniCoin/ngày)` : ''}`;
};

export default function QRScanner() {
  const { user } = useAuth();
  // Thu ngân luôn quét tại chi nhánh được gắn, backend tự biết; chủ quán chọn chi nhánh đang đứng quét
  const isCashier = user?.role === 'cashier';
  const [venues, setVenues] = useState([]);
  const [venueId, setVenueId] = useState(readSavedVenue);
  const [inputCode, setInputCode] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  // Ưu đãi hẹn cafe: mã của các bạn đi cùng
  const [companionResults, setCompanionResults] = useState([]);
  const [companionError, setCompanionError] = useState(null);
  // Ô nhập mã của bạn tiếp theo, nằm ngay trong thẻ kết quả
  const [nextCode, setNextCode] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  // Kết quả áp dụng từ backend: buổi hẹn đã hoàn tất chưa, UniCoin từng bạn thực nhận
  const [redeemInfo, setRedeemInfo] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  // Camera thật: bật khi thu ngân bấm nút, tự tắt sau khi đọc được 1 mã
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraStarting, setCameraStarting] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [readingPhoto, setReadingPhoto] = useState(false);
  // Mã vừa kiểm tra đến từ camera thì bấm "Quét lượt mới" mở lại camera luôn (quét tiếp bạn đi cùng)
  const lastSourceRef = useRef('manual');
  // Promise của lần tắt camera gần nhất (xem effect mở camera)
  const stopCameraRef = useRef(Promise.resolve());
  const fileInputRef = useRef(null);
  const resultRef = useRef(null);
  const scannerRef = useRef(null);
  const nextCodeRef = useRef(null);

  // Ưu đãi hẹn cafe: đã có mã đầu, chưa có mã của bạn đi cùng nào thì chưa được áp dụng
  const meetupInfo = scanResult?.meetup;
  const needsCompanion = Boolean(meetupInfo?.requiresCompanion && companionResults.length === 0);
  // Buổi hẹn nhóm: đủ 2 bạn là áp dụng được, vẫn quét thêm được các bạn khác trước khi xác nhận
  const canScanMore = Boolean(meetupInfo?.requiresCompanion && companionResults.length < (meetupInfo.companions?.length || 0));
  const companionName = meetupInfo?.isGroup ? 'bạn khác trong nhóm' : meetupInfo?.companions?.[0]?.fullName || 'bạn đi cùng';
  const peopleCount = companionResults.length + 1;

  const loadHistory = async (venue = venueId) => {
    try {
      const res = await voucherApi.getPartnerRedemptions(50, isCashier ? null : venue || null);
      setHistory(res?.data || []);
    } catch (err) {
      console.log('Lỗi tải lịch sử check-in:', err.message);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (isCashier) {
      loadHistory();
      return;
    }
    venueApi
      .getMyVenues()
      .then((res) => {
        const list = res?.data || [];
        setVenues(list);
        const chosen = list.some((v) => v._id === venueId) ? venueId : list[0]?._id || '';
        setVenueId(chosen);
        loadHistory(chosen);
      })
      .catch(() => loadHistory(''));
  }, []);

  // Gửi kèm chi nhánh đang quét: voucher của chi nhánh khác sẽ bị từ chối
  const scanScope = !isCashier && venueId ? { venueId } : {};
  const currentVenueName = isCashier
    ? user?.cashierVenue?.name
    : venues.find((v) => v._id === venueId)?.name;

  // Chuyển nội dung quét/nhập thành payload gửi backend.
  // QR trong ví sinh viên có dạng UVM-xxxx, còn lại coi là mã voucher chung của quán.
  const toRedeemPayload = (rawInput) => {
    const value = rawInput.trim().toUpperCase();
    return value.startsWith('UVM-') ? { qrPayload: value } : { code: value };
  };

  const handleVerifyCode = async (codeToVerify) => {
    const rawInput = (codeToVerify || inputCode).trim();
    if (!rawInput) return;

    // Đang chờ mã của bạn đi cùng: giữ nguyên kết quả mã đầu, lỗi của mã sau không xoá mã đầu
    const firstScan = !confirmed && canScanMore ? scanResult : null;
    const fail = (message) => (firstScan ? setCompanionError(message) : setScanError(message));

    setScanning(true);
    setCompanionError(null);
    if (!firstScan) {
      setConfirmed(false);
      setRedeemInfo(null);
      setScanError(null);
      setScanResult(null);
      setCompanionResults([]);
    }

    // Quét nhầm mã QR check-in dán tại quán (mã đó để sinh viên tự quét)
    if (rawInput.toUpperCase().startsWith('UNIMATE-CHECKIN:')) {
      fail('Đây là mã QR check-in dán tại quán, không phải voucher. Hãy quét mã QR trong ví voucher trên điện thoại sinh viên.');
      setScanning(false);
      return;
    }

    const payload = toRedeemPayload(rawInput);

    try {
      const res = await voucherApi.verifyVoucher({ ...payload, ...scanScope });
      const result = toScanResult(res?.data, payload);

      if (!firstScan) {
        setScanResult(result);
        // Để trống ô nhập cho mã của bạn đi cùng
        if (result.meetup?.requiresCompanion) setInputCode('');
      } else if (result.meetup?.id !== firstScan.meetup.id) {
        fail(`Mã này không thuộc buổi hẹn của ${firstScan.studentName}. Hãy quét mã của ${companionName}.`);
      } else if ([firstScan, ...companionResults].some((scanned) => scanned.studentId === result.studentId)) {
        fail(`Đây vẫn là mã của ${result.studentName}. Hãy quét mã của ${companionName}.`);
      } else {
        setCompanionResults((prev) => [...prev, result]);
        setInputCode('');
        setNextCode('');
      }
    } catch (err) {
      fail(err.message || 'Lỗi kiểm tra voucher từ hệ thống');
    } finally {
      setScanning(false);
    }
  };

  const handleAddNextCode = (e) => {
    e.preventDefault();
    lastSourceRef.current = 'manual';
    handleVerifyCode(nextCode);
  };

  // Đang nhập tay thì đặt sẵn con trỏ vào ô mã tiếp theo
  useEffect(() => {
    if (canScanMore && lastSourceRef.current === 'manual') nextCodeRef.current?.focus();
  }, [canScanMore, companionResults]);

  // Camera đọc được mã: tắt camera rồi kiểm tra luôn (useEffectEvent để không phải mở lại camera mỗi lần render)
  const onCameraDecoded = useEffectEvent((decodedText) => {
    lastSourceRef.current = 'camera';
    setCameraOn(false);
    setInputCode(decodedText);
    handleVerifyCode(decodedText);
  });

  const onCameraFailed = useEffectEvent((err) => {
    console.warn('Không mở được camera:', err);
    setCameraError(cameraErrorMessage(err));
    setCameraOn(false);
  });

  // Mở camera sau: html5-qrcode chạy được trên Safari iPhone khi trang mở bằng https
  useEffect(() => {
    if (!cameraOn) return undefined;

    // Camera trả về nhiều khung hình liên tiếp: chỉ lấy mã đầu tiên rồi tắt camera
    let done = false;
    let scanner = null;

    // Lần tắt camera trước phải xong hẳn mới mở lại, không thì lệnh dọn khung cũ xoá mất video mới
    const started = stopCameraRef.current
      .then(() => {
        if (done) return null;
        scanner = new Html5Qrcode(CAMERA_READER_ID, READER_CONFIG);
        return scanner.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            // Khung nhận mã bằng 70% cạnh ngắn của video
            qrbox: (width, height) => {
              const size = Math.floor(Math.min(width, height) * 0.7);
              return { width: size, height: size };
            },
          },
          (decodedText) => {
            if (done) return;
            done = true;
            onCameraDecoded(decodedText);
          },
          () => {
            // Khung hình chưa thấy mã QR, quét tiếp
          }
        );
      })
      .catch((err) => {
        if (done) return;
        done = true;
        onCameraFailed(err);
      })
      .finally(() => setCameraStarting(false));

    return () => {
      done = true;
      // Chờ camera mở xong mới tắt được, tắt xong thì dọn video trong khung
      stopCameraRef.current = started
        .then(() => scanner?.stop())
        .catch(() => {})
        .then(() => scanner?.clear())
        .catch(() => {});
    };
  }, [cameraOn]);

  // Điện thoại xếp kết quả dưới camera: cuộn xuống để thu ngân thấy kết quả và nút xác nhận
  useEffect(() => {
    if (scanResult || scanError) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [scanResult, scanError, companionResults, companionError]);

  const handleStartCamera = () => {
    if (cameraOn) return;
    setCameraError(null);
    setCameraStarting(true);
    setCameraOn(true);
  };

  // Mở lại camera cho mã của bạn đi cùng (điện thoại: camera nằm trên thẻ kết quả nên cuộn lên)
  const handleScanCompanion = () => {
    setCompanionError(null);
    handleStartCamera();
    scannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Dự phòng khi trình duyệt không mở được camera trực tiếp: chụp hoặc chọn ảnh có mã QR
  const handlePhotoScan = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraOn(false);
    setReadingPhoto(true);
    const reader = new Html5Qrcode(PHOTO_READER_ID, READER_CONFIG);
    try {
      const decodedText = await reader.scanFile(file, false);
      lastSourceRef.current = 'photo';
      setInputCode(decodedText);
      await handleVerifyCode(decodedText);
    } catch {
      setScanResult(null);
      setScanError('Không đọc được mã QR trong ảnh. Chụp gần hơn, rõ nét, không bị loá màn hình rồi thử lại.');
    } finally {
      setReadingPhoto(false);
      try {
        reader.clear();
      } catch {
        // Ảnh đã đọc xong, không còn gì để dọn
      }
      e.target.value = '';
    }
  };

  const handleConfirmRedeem = async () => {
    if (!scanResult || redeeming || needsCompanion) return;
    setRedeeming(true);
    try {
      const res = await voucherApi.redeemVoucher({
        ...scanResult.payload,
        ...(companionResults.length > 0 ? { companions: companionResults.map((r) => r.payload) } : {}),
        ...scanScope,
      });
      // Quán quét QR áp voucher = sinh viên thực sự ra quán (mỗi voucher tính 1 lượt)
      for (let i = 0; i < peopleCount; i += 1) trackEvent('voucher_redeem');
      setRedeemInfo(res?.data || null);
      setConfirmed(true);
      loadHistory();
    } catch (err) {
      notify.error('Không thể áp dụng voucher: ' + err.message);
    } finally {
      setRedeeming(false);
    }
  };


  const clearScan = () => {
    setInputCode('');
    setScanResult(null);
    setScanError(null);
    setCompanionResults([]);
    setCompanionError(null);
    setNextCode('');
    setConfirmed(false);
    setRedeemInfo(null);
  };

  const handleReset = () => {
    clearScan();
    if (lastSourceRef.current === 'camera') handleStartCamera();
  };

  // Đổi chi nhánh: bỏ kết quả đang dở (đã kiểm tra theo chi nhánh cũ) và tải lịch sử của chi nhánh mới
  const handleChangeVenue = (id) => {
    setVenueId(id);
    saveVenue(id);
    clearScan();
    setHistoryLoading(true);
    loadHistory(id);
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

      {/* Chi nhánh đang quét: voucher của chi nhánh khác sẽ bị từ chối */}
      {(isCashier || venues.length > 1) && (
        <div
          className="portal-card"
          style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', padding: '14px 18px' }}
        >
          <Store size={20} color="var(--primary)" style={{ flexShrink: 0 }} />
          <label htmlFor="scan-venue" style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
            Đang quét tại chi nhánh:
          </label>
          {isCashier ? (
            <strong id="scan-venue" style={{ fontSize: '14px', color: 'var(--primary)' }}>
              {currentVenueName || 'Chi nhánh được chủ quán gắn'}
            </strong>
          ) : (
            <select
              id="scan-venue"
              value={venueId}
              onChange={(e) => handleChangeVenue(e.target.value)}
              style={{ flex: '1 1 220px', minWidth: 0, padding: '8px 12px', borderRadius: '8px', border: '1.5px solid var(--primary)', fontSize: '14px', fontWeight: '700', backgroundColor: '#FFFFFF' }}
            >
              {venues.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                </option>
              ))}
            </select>
          )}
          <span style={{ flexBasis: '100%', fontSize: '12px', color: 'var(--text-muted)' }}>
            Chỉ nhận voucher phát hành cho chi nhánh này. Voucher của chi nhánh khác sẽ báo lỗi.
          </span>
        </div>
      )}

      {/* Main Grid: Scanner Viewfinder & Verification Card (điện thoại: xếp 1 cột) */}
      <div className="grid-scanner-main">
        {/* Left: Camera quét thật + dự phòng chụp ảnh / nhập tay */}
        <div className="portal-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-primary)' }}>
              Ống kính Camera Quét
            </span>
            {cameraOn ? (
              <span className="badge badge-success">{cameraStarting ? 'ĐANG MỞ CAMERA...' : 'ĐANG QUÉT'}</span>
            ) : (
              <span className="badge badge-info">CAMERA TẮT</span>
            )}
          </div>

          {/* Scanner Box */}
          <div
            ref={scannerRef}
            style={{
              width: '100%',
              maxWidth: '360px',
              minHeight: '280px',
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
            <div id={CAMERA_READER_ID} style={{ width: '100%' }} />

            {!cameraOn && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '14px',
                  padding: '20px',
                  textAlign: 'center',
                }}
              >
                {cameraError ? (
                  <>
                    <CameraOff size={40} color="#94A3B8" />
                    <p style={{ fontSize: '12.5px', color: '#CBD5E1', lineHeight: '1.5' }}>{cameraError}</p>
                  </>
                ) : (
                  <QrCode size={88} color="#334155" />
                )}
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="btn btn-primary"
                  style={{ padding: '10px 18px', fontSize: '14px' }}
                >
                  <Camera size={16} />
                  <span>{cameraError ? 'Thử bật lại camera' : 'Bật camera quét'}</span>
                </button>
              </div>
            )}

            {cameraOn && cameraStarting && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#CBD5E1', fontSize: '13px', fontWeight: '700', padding: '20px', textAlign: 'center' }}>
                Đang mở camera... Nếu máy hỏi quyền, chọn "Cho phép".
              </div>
            )}
          </div>

          {cameraOn ? (
            <button
              type="button"
              onClick={() => setCameraOn(false)}
              className="btn btn-ghost"
              style={{ padding: '6px 12px', fontSize: '12px', marginTop: '10px' }}
            >
              <CameraOff size={14} />
              <span>Tắt camera</span>
            </button>
          ) : null}

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '10px', textAlign: 'center' }}>
            {cameraOn
              ? 'Đưa mã QR trong ví sinh viên vào giữa khung, máy tự nhận mã.'
              : 'Hướng camera về phía màn hình ứng dụng điện thoại của khách hàng'}
          </p>

          {/* Dự phòng: chụp / chọn ảnh có mã QR (khi trình duyệt chặn camera trực tiếp) */}
          <input type="file" accept="image/*" ref={fileInputRef} onChange={handlePhotoScan} style={{ display: 'none' }} />
          <div id={PHOTO_READER_ID} style={{ display: 'none' }} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={readingPhoto}
            className="btn btn-secondary"
            style={{ width: '100%', marginTop: '12px', padding: '9px 14px', fontSize: '13px', opacity: readingPhoto ? 0.7 : 1 }}
          >
            <Upload size={15} />
            <span>{readingPhoto ? 'Đang đọc mã trong ảnh...' : 'Chụp / chọn ảnh mã QR'}</span>
          </button>

          {/* Manual Input */}
          <div style={{ width: '100%', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px', color: 'var(--text-primary)' }}>
              Nhập mã thủ công nếu camera mờ:
            </label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                type="text"
                placeholder="VD: UVM-1A2B3C4D5E6F7A8B hoặc mã voucher"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    lastSourceRef.current = 'manual';
                    handleVerifyCode();
                  }
                }}
                style={{ flex: 1, minWidth: 0, padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', textTransform: 'uppercase' }}
              />
              <button
                type="button"
                onClick={() => {
                  lastSourceRef.current = 'manual';
                  handleVerifyCode();
                }}
                disabled={scanning}
                className="btn btn-primary"
                style={{ padding: '8px 16px', fontSize: '13px' }}
              >
                Kiểm tra
              </button>
            </div>

            <p style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '16px' }}>
              Nhập mã <strong>UVM-...</strong> (hoặc mã riêng) in dưới QR trong ví sinh viên để trừ đúng voucher của bạn ấy.
              Mã voucher chung của quán chỉ dành cho khách không dùng ví UNI-MATE, và không dùng được cho voucher Premium, voucher đổi UniCoin, ưu đãi hẹn cafe.
            </p>
          </div>
        </div>

        {/* Right: Verification & Redeem Card */}
        <div ref={resultRef} className="portal-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Kết quả kiểm tra voucher
              </h3>
              {(scanResult || scanError) && (
                <button
                  onClick={handleReset}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-secondary)' }}
                >
                  <RotateCcw size={13} />
                  <span>Quét lượt mới</span>
                </button>
              )}
            </div>

            {scanning && !scanResult && !scanError ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Scan size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Đang kiểm tra mã...
                </h4>
              </div>
            ) : scanResult ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Status Callout */}
                <div
                  style={{
                    backgroundColor: confirmed ? '#ECFDF5' : needsCompanion ? '#FFFBEB' : '#FFECE6',
                    border: '1.5px solid',
                    borderColor: confirmed ? '#10B981' : needsCompanion ? '#F59E0B' : 'var(--primary)',
                    borderRadius: '16px',
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '14px',
                  }}
                >
                  {needsCompanion ? (
                    <Scan size={32} color="#B45309" style={{ flexShrink: 0 }} />
                  ) : (
                    <CheckCircle2 size={32} color={confirmed ? '#10B981' : 'var(--primary)'} style={{ flexShrink: 0 }} />
                  )}
                  <div>
                    <h4 style={{ fontSize: '16px', fontWeight: '900', color: confirmed ? '#065F46' : needsCompanion ? '#B45309' : 'var(--primary)' }}>
                      {confirmed
                        ? 'ĐÃ CHECK-IN THÀNH CÔNG 🎉'
                        : needsCompanion
                          ? 'BƯỚC 1/2: CẦN QUÉT THÊM MÃ THỨ HAI'
                          : companionResults.length > 0
                            ? `ĐỦ ${peopleCount} BẠN, SẴN SÀNG ÁP DỤNG ✅`
                            : 'VOUCHER HỢP LỆ & KHẢ DỤNG ✅'}
                    </h4>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontWeight: '600' }}>
                      MÃ: {scanResult.code}
                    </span>
                    {needsCompanion && (
                      <div style={{ fontSize: '12.5px', color: '#92400E', fontWeight: '700', marginTop: '4px' }}>
                        🤝 Ưu đãi hẹn cafe phải có mặt từ 2 bạn trở lên. Thêm mã trong ví của {companionName} rồi mới áp dụng được.
                        {meetupInfo?.isGroup && (
                          <div style={{ fontWeight: '600', marginTop: '2px' }}>
                            Các bạn cùng buổi hẹn: {meetupInfo.companions.map((c) => c.fullName).join(', ')}
                          </div>
                        )}
                      </div>
                    )}
                    {confirmed && redeemInfo?.meetupCompleted && (
                      <div style={{ fontSize: '12.5px', color: '#1D4ED8', fontWeight: '700', marginTop: '4px' }}>
                        🤝 Đã đủ người, buổi hẹn được ghi nhận!
                      </div>
                    )}
                    {confirmed && (redeemInfo?.students || []).map((s) => (
                      <div key={s.id} style={{ fontSize: '12.5px', color: '#065F46', fontWeight: '700', marginTop: '4px' }}>
                        {coinResultText(s, redeemInfo.maxDailyEarn)}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Thêm mã ngay tại đây, thu ngân không phải tìm lại ô nhập ở cột bên kia */}
                {!confirmed && canScanMore && (
                  <form
                    onSubmit={handleAddNextCode}
                    style={{ padding: '12px 14px', backgroundColor: '#FFFFFF', border: `1.5px solid ${needsCompanion ? '#F59E0B' : 'var(--border-color)'}`, borderRadius: '12px' }}
                  >
                    <label htmlFor="partner-next-code" style={{ display: 'block', fontSize: '12.5px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '6px' }}>
                      {needsCompanion ? `Nhập mã của ${companionName}` : 'Thêm bạn khác trong nhóm (không bắt buộc)'}
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        id="partner-next-code"
                        ref={nextCodeRef}
                        type="text"
                        placeholder="Mã UVM-... hoặc mã riêng"
                        value={nextCode}
                        onChange={(e) => setNextCode(e.target.value)}
                        style={{ flex: 1, minWidth: 0, padding: '9px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', fontSize: '13px', textTransform: 'uppercase' }}
                      />
                      <button
                        type="submit"
                        disabled={scanning || !nextCode.trim()}
                        className="btn btn-primary"
                        style={{ padding: '9px 16px', fontSize: '13px', flexShrink: 0, opacity: scanning || !nextCode.trim() ? 0.6 : 1 }}
                      >
                        {scanning ? 'Đang kiểm tra...' : 'Thêm mã'}
                      </button>
                    </div>
                  </form>
                )}

                {companionError && (
                  <div style={{ padding: '12px 14px', backgroundColor: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '12px', fontSize: '13px', fontWeight: '600', color: '#B91C1C' }}>
                    {companionError}
                  </div>
                )}

                {/* Điều kiện chỉ thu ngân kiểm tra được: hệ thống không biết số tiền hoá đơn, không đọc được ghi chú */}
                {!confirmed && (scanResult.minBill > 0 || scanResult.note) && (
                  <div style={{ padding: '12px 14px', backgroundColor: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '12px', fontSize: '12.5px', color: '#92400E', lineHeight: '1.5' }}>
                    <strong>Thu ngân tự kiểm tra trước khi áp dụng</strong> (hệ thống không tự chặn được):
                    {scanResult.minBill > 0 && <div>• Hoá đơn từ {formatVnd(scanResult.minBill)}</div>}
                    {scanResult.note && <div>• {scanResult.note}</div>}
                  </div>
                )}

                {/* Offer Details */}
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>
                    {scanResult.fromMeetup ? 'ƯU ĐÃI HẸN CAFE (MỖI BẠN 1 MÃ)' : 'ƯU ĐÃI ÁP DỤNG'}
                  </span>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)', marginTop: '2px' }}>
                    {scanResult.title}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    {scanResult.discountLabel} · {scanResult.conditionLabel}
                    <br />
                    Áp dụng tại: <strong>{scanResult.venue}</strong> · HSD: {scanResult.expiry}
                  </p>
                </div>

                {/* Student Customer Profile */}
                <div style={{ padding: '16px', backgroundColor: 'var(--bg-page)', borderRadius: '14px', border: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)' }}>THÔNG TIN SINH VIÊN</span>
                  {[scanResult, ...companionResults].map((result) => (
                    <div key={result.code + result.studentName} style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                      <img
                        src={result.studentAvatar}
                        alt={result.studentName}
                        style={{ width: '48px', height: '48px', borderRadius: '24px', objectFit: 'cover' }}
                      />
                      <div>
                        <h4 style={{ fontSize: '15px', fontWeight: '800', color: 'var(--text-primary)' }}>
                          {result.studentName}
                        </h4>
                        <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {result.studentSchool}
                        </p>
                      </div>
                    </div>
                  ))}
                  {needsCompanion && (
                    <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '10px', border: '1.5px dashed #F59E0B', fontSize: '13px', fontWeight: '700', color: '#B45309' }}>
                      {scanning ? 'Đang kiểm tra mã...' : `Chờ quét mã của ${companionName}`}
                    </div>
                  )}
                  {!confirmed && !needsCompanion && canScanMore && (
                    <div style={{ marginTop: '10px', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                      {scanning ? 'Đang kiểm tra mã...' : 'Còn bạn nào trong nhóm đang ở quầy thì quét thêm trước khi xác nhận. Bạn đến sau vẫn quét riêng được.'}
                    </div>
                  )}
                </div>
              </div>
            ) : scanError ? (
              <div style={{ textAlign: 'center', padding: '40px 20px' }}>
                <AlertCircle size={48} style={{ margin: '0 auto 12px', color: '#EF4444' }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: '#EF4444' }}>
                  Không áp dụng được voucher
                </h4>
                <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-secondary)' }}>
                  {scanError}
                </p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
                <Scan size={48} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
                <h4 style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-secondary)' }}>
                  Chưa có voucher nào được quét
                </h4>
                <p style={{ fontSize: '13px', marginTop: '4px' }}>
                  Quét mã QR của khách hoặc nhập mã bên trái để xem thông tin
                </p>
              </div>
            )}
          </div>

          {/* Action Button */}
          {scanResult && !confirmed && needsCompanion && (
            <button
              onClick={handleScanCompanion}
              disabled={scanning}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '20px' }}
            >
              <Camera size={16} />
              <span>Quét mã của {companionName} bằng camera</span>
            </button>
          )}
          {scanResult && !confirmed && !needsCompanion && canScanMore && (
            <button
              onClick={handleScanCompanion}
              disabled={scanning || redeeming}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '12px', fontSize: '14px', marginTop: '20px' }}
            >
              <Camera size={16} />
              <span>Quét thêm bạn trong nhóm</span>
            </button>
          )}
          {scanResult && !confirmed && !needsCompanion && (
            <button
              onClick={handleConfirmRedeem}
              disabled={redeeming}
              className="btn btn-primary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: canScanMore ? '10px' : '20px', opacity: redeeming ? 0.7 : 1 }}
            >
              <CheckCircle2 size={18} />
              <span>
                {redeeming
                  ? 'Đang áp dụng...'
                  : companionResults.length > 0
                    ? `Xác nhận áp dụng cho cả ${peopleCount} bạn & Trừ tiền hóa đơn`
                    : 'Xác nhận áp dụng voucher & Trừ tiền hóa đơn'}
              </span>
            </button>
          )}
          {/* Áp xong: nút to để quét khách / bạn đi cùng tiếp theo */}
          {scanResult && confirmed && (
            <button
              onClick={handleReset}
              className="btn btn-secondary"
              style={{ width: '100%', padding: '14px', fontSize: '15px', marginTop: '20px' }}
            >
              <RotateCcw size={18} />
              <span>Quét lượt mới</span>
            </button>
          )}
        </div>
      </div>

      {/* Check-in History Table */}
      <div className="portal-card">
        <h3 style={{ fontSize: '16px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '14px' }}>
          Lịch sử check-in gần đây{(isCashier || venues.length > 1) && currentVenueName ? ` · ${currentVenueName}` : ''}
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-muted)', fontSize: '11px', textAlign: 'left' }}>
                <th style={{ padding: '10px 14px' }}>MÃ VOUCHER</th>
                <th style={{ padding: '10px 14px' }}>SINH VIÊN</th>
                <th style={{ padding: '10px 14px' }}>ƯU ĐÃI</th>
                <th style={{ padding: '10px 14px' }}>THỜI GIAN</th>
                <th style={{ padding: '10px 14px' }}>NGƯỜI XÁC NHẬN</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h._id} style={{ borderBottom: '1px solid var(--border-light)' }}>
                  <td style={{ padding: '12px 14px', fontWeight: '800', color: 'var(--primary)' }}>{h.voucherId?.code || '—'}</td>
                  <td style={{ padding: '12px 14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    {h.userId?.fullName || 'Khách dùng mã chung'}
                  </td>
                  <td style={{ padding: '12px 14px', color: '#059669', fontWeight: '700' }}>{h.voucherId?.title || 'Voucher'}</td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                    {new Date(h.createdAt).toLocaleString('vi-VN')}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-muted)' }}>{h.redeemedBy?.fullName || 'Quầy thu ngân'}</td>
                </tr>
              ))}
              {!historyLoading && history.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Chưa có lượt check-in nào
                  </td>
                </tr>
              )}
              {historyLoading && (
                <tr>
                  <td colSpan={5} style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    Đang tải lịch sử...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
