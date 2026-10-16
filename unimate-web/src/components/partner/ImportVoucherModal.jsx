import React, { useState, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  UploadCloud,
  Link as LinkIcon,
  Download,
  AlertCircle,
  CheckCircle2,
  Info,
  Loader2,
  AlertTriangle,
  ChevronRight,
  RefreshCw,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { voucherApi } from '../../services/api';

export default function ImportVoucherModal({ isOpen, onClose, venues = [], onSuccess }) {
  const [sourceType, setSourceType] = useState('file'); // 'file' | 'sheet'
  const [file, setFile] = useState(null);
  const [sheetUrl, setSheetUrl] = useState('');
  const [selectedVenueId, setSelectedVenueId] = useState(
    venues.length > 0 ? (venues[0]._id || venues[0].id) : ''
  );
  const [duplicateMode, setDuplicateMode] = useState('skip'); // 'skip' | 'update'

  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  // Xử lý kéo thả file
  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      validateAndSetFile(selected);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (f) => {
    const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      setErrorMsg('Vui lòng chọn file bảng tính định dạng .xlsx, .xls hoặc .csv');
      return;
    }
    setErrorMsg('');
    setFile(f);
    setPreviewData(null);
    setImportResult(null);
  };

  // Tải file mẫu trực tiếp (chứa cột Loại mã, Giá UniCoin, Số lượng Không giới hạn)
  const handleDownloadTemplate = async () => {
    try {
      const blob = await voucherApi.downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'mau_nhap_voucher_unimate.xlsx');
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      // Fallback tạo file cục bộ bằng xlsx nếu API không khả dụng
      try {
        const headers = [
          'Mã voucher (*)',
          'Loại mã (Chung / Riêng)',
          'Tiêu đề voucher (*)',
          'Mô tả chi tiết',
          'Loại giảm (% hoặc VNĐ)',
          'Mức giảm (*)',
          'Đơn tối thiểu (VNĐ)',
          'Số lượng phát hành (số hoặc "Không giới hạn")',
          'Hạn sử dụng (DD/MM/YYYY)',
          'Điều khoản sử dụng (phân cách bằng ;)',
          'Giá UniCoin (0 = miễn phí)',
        ];

        const sampleData = [
          [
            'UNIKHAIXUAN',
            'Chung',
            'Giảm 25% tổng hóa đơn mừng năm mới',
            'Áp dụng cho tất cả sinh viên xuất trình thẻ sinh viên hoặc app UNI-MATE',
            '%',
            25,
            50000,
            200,
            '31/12/2026',
            'Áp dụng tại quán; Mỗi SV 1 lần/ngày; Không áp dụng lễ Tết',
            0,
          ],
          [
            'UNIFRESH50K',
            'Chung',
            'Giảm 50.000đ cho đơn từ 150k',
            'Ưu đãi đặc quyền cho sinh viên các trường ĐHQG TP.HCM',
            'VNĐ',
            50000,
            150000,
            100,
            '30/06/2026',
            'Áp dụng cho đơn từ 150.000đ; Áp dụng cả mang đi và tại quán',
            50,
          ],
          [
            'MILKTEA20',
            'Chung',
            'Giảm 20% nhóm thức uống Trà Sữa',
            'Giảm ngay 20% khi order bất kỳ món nào trong menu trà sữa',
            '%',
            20,
            0,
            'Không giới hạn',
            '15/11/2026',
            'Áp dụng vào khung giờ 13h - 18h mỗi ngày',
            0,
          ],
          [
            'TRASUA-RIENG',
            'Riêng',
            'Giảm 10% (mỗi bạn 1 mã riêng)',
            'Mã riêng: nạp danh sách mã sau khi nhập file',
            '%',
            10,
            0,
            '',
            '31/12/2026',
            'Mỗi mã chỉ dùng 1 lần',
            100,
          ],
        ];

        const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
        ws['!cols'] = [
          { wch: 18 },
          { wch: 22 },
          { wch: 36 },
          { wch: 45 },
          { wch: 22 },
          { wch: 14 },
          { wch: 20 },
          { wch: 28 },
          { wch: 24 },
          { wch: 55 },
          { wch: 24 },
        ];

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Mau_Voucher_UNIMATE');
        XLSX.writeFile(wb, 'mau_nhap_voucher_unimate.xlsx');
      } catch (e) {
        window.open('/api/vouchers/partner/template', '_blank');
      }
    }
  };

  // Preview dữ liệu
  const handlePreview = async () => {
    setErrorMsg('');
    if (sourceType === 'file' && !file) {
      setErrorMsg('Vui lòng chọn hoặc kéo thả file Excel trước');
      return;
    }
    if (sourceType === 'sheet' && !sheetUrl.trim()) {
      setErrorMsg('Vui lòng dán đường dẫn Google Sheet');
      return;
    }

    setLoadingPreview(true);
    try {
      let res;
      if (sourceType === 'file') {
        const formData = new FormData();
        formData.append('file', file);
        res = await voucherApi.previewImport(formData);
      } else {
        res = await voucherApi.previewImport({ sheetUrl: sheetUrl.trim() });
      }

      setPreviewData(res?.data || null);
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Không thể đọc dữ liệu từ nguồn đã chọn'
      );
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Tiến hành Import vào hệ thống
  const handleImport = async () => {
    if (!previewData || !previewData.items || previewData.items.length === 0) {
      setErrorMsg('Chưa có dữ liệu hợp lệ để nhập vào hệ thống');
      return;
    }

    setImporting(true);
    setErrorMsg('');
    try {
      const payload = {
        venueId: selectedVenueId || undefined,
        duplicateMode,
        items: previewData.items.filter((i) => i.isValid),
      };

      const res = await voucherApi.importSpreadsheet(payload);
      setImportResult(res?.data || null);
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setErrorMsg(
        err.response?.data?.message || err.message || 'Lỗi khi nhập voucher vào hệ thống'
      );
    } finally {
      setImporting(false);
    }
  };

  const resetAll = () => {
    setFile(null);
    setSheetUrl('');
    setPreviewData(null);
    setImportResult(null);
    setErrorMsg('');
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !importing) onClose();
      }}
    >
      <div
        className="portal-card"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '0',
          overflow: 'hidden',
          boxShadow: 'var(--shadow-xl)',
          borderRadius: '16px',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            backgroundColor: '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: '#10B981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--text-primary)' }}>
                Nhập voucher từ Excel hoặc Google Sheet
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Nhập danh sách mã khuyến mãi hàng loạt nhanh chóng, tự động phát hiện lỗi và mã trùng
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={importing}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '8px',
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div
          style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            backgroundColor: '#FAFAFA',
          }}
        >
          {/* Thông báo kết quả sau khi import thành công */}
          {importResult && (
            <div
              style={{
                padding: '16px 20px',
                borderRadius: '12px',
                backgroundColor: '#ECFDF5',
                border: '1px solid #A7F3D0',
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#065F46' }}>
                <CheckCircle2 size={22} color="#10B981" />
                <span style={{ fontWeight: '800', fontSize: '15px' }}>
                  Nhập dữ liệu thành công!
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#047857', lineHeight: '1.6' }}>
                • Thêm mới thành công: <strong>{importResult.importedCount}</strong> voucher<br />
                {importResult.updatedCount > 0 && (
                  <>• Đã cập nhật: <strong>{importResult.updatedCount}</strong> voucher<br /></>
                )}
                {importResult.skippedCount > 0 && (
                  <>• Bỏ qua: <strong>{importResult.skippedCount}</strong> voucher (do trùng lặp)</>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  onClick={resetAll}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  <RefreshCw size={14} /> Nhập thêm file khác
                </button>
                <button
                  onClick={onClose}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', padding: '6px 14px' }}
                >
                  Hoàn tất & Đóng
                </button>
              </div>
            </div>
          )}

          {!importResult && (
            <>
              {/* Top Banner: Tải template mẫu */}
              <div
                style={{
                  padding: '14px 18px',
                  backgroundColor: '#EFF6FF',
                  border: '1px solid #BFDBFE',
                  borderRadius: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <Info size={18} color="#2563EB" />
                  <span style={{ fontSize: '13px', color: '#1E40AF' }}>
                    Chưa có file mẫu chuẩn? Tải về file mẫu Excel để điền đúng định dạng cột quy định.
                  </span>
                </div>
                <button
                  onClick={handleDownloadTemplate}
                  type="button"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 14px',
                    borderRadius: '8px',
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #93C5FD',
                    color: '#2563EB',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <Download size={14} /> Tải file mẫu (.xlsx)
                </button>
              </div>

              {/* Lựa chọn phương thức nhập liệu */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('file');
                    setErrorMsg('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: sourceType === 'file' ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: sourceType === 'file' ? 'var(--primary-light)' : '#FFFFFF',
                    color: sourceType === 'file' ? 'var(--primary-dark)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <UploadCloud size={18} />
                  <span>Tải lên file Excel (.xlsx / .csv)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setSourceType('sheet');
                    setErrorMsg('');
                  }}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    border: '2px solid',
                    borderColor: sourceType === 'sheet' ? 'var(--primary)' : 'var(--border-color)',
                    backgroundColor: sourceType === 'sheet' ? 'var(--primary-light)' : '#FFFFFF',
                    color: sourceType === 'sheet' ? 'var(--primary-dark)' : 'var(--text-secondary)',
                    fontWeight: '700',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <LinkIcon size={18} />
                  <span>Liên kết Google Sheet</span>
                </button>
              </div>

              {/* Vùng chọn file hoặc dán link */}
              {sourceType === 'file' ? (
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: '2px dashed',
                    borderColor: file ? '#10B981' : 'var(--border-color)',
                    borderRadius: '12px',
                    padding: '36px 20px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    backgroundColor: file ? 'rgba(16, 185, 129, 0.04)' : '#FFFFFF',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    style={{ display: 'none' }}
                    onChange={handleFileChange}
                  />
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '50%',
                      backgroundColor: file ? 'rgba(16, 185, 129, 0.15)' : '#F1F5F9',
                      color: file ? '#10B981' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: '0 auto 12px',
                    }}
                  >
                    {file ? <FileSpreadsheet size={24} /> : <UploadCloud size={24} />}
                  </div>
                  {file ? (
                    <div>
                      <p style={{ fontSize: '15px', fontWeight: '800', color: '#065F46' }}>
                        {file.name}
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        {(file.size / 1024).toFixed(1)} KB • Nhấn để chọn file khác
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                        Kéo thả file vào đây hoặc <span style={{ color: 'var(--primary)' }}>chọn từ máy tính</span>
                      </p>
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                        Hỗ trợ các định dạng .xlsx, .xls, .csv (tối đa 15MB)
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <label style={{ fontSize: '13px', fontWeight: '700', color: 'var(--text-primary)' }}>
                    Đường liên kết Google Sheet (bảng tính):
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5.../edit"
                      value={sheetUrl}
                      onChange={(e) => {
                        setSheetUrl(e.target.value);
                        setPreviewData(null);
                      }}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border-color)',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.5',
                      backgroundColor: '#F8FAFC',
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-light)',
                    }}
                  >
                    <strong>* Lưu ý quan trọng:</strong> Bảng tính Google Sheet cần được mở quyền:{' '}
                    <em>"Bất kỳ ai có đường liên kết đều có thể xem"</em> (Share → Anyone with the link can view) để hệ thống có thể đọc dữ liệu.
                  </div>
                </div>
              )}

              {/* Lựa chọn cơ sở và chế độ trùng mã */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: venues.length > 1 ? '1fr 1fr' : '1fr',
                  gap: '16px',
                  backgroundColor: '#FFFFFF',
                  padding: '16px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-color)',
                }}
              >
                {venues.length > 1 && (
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                      Cơ sở / Địa điểm áp dụng
                    </label>
                    <select
                      value={selectedVenueId}
                      onChange={(e) => setSelectedVenueId(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        fontSize: '13px',
                        backgroundColor: '#FFFFFF',
                      }}
                    >
                      {venues.map((v) => (
                        <option key={v._id || v.id} value={v._id || v.id}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', marginBottom: '6px' }}>
                    Xử lý khi trùng mã voucher
                  </label>
                  <select
                    value={duplicateMode}
                    onChange={(e) => setDuplicateMode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border-color)',
                      fontSize: '13px',
                      backgroundColor: '#FFFFFF',
                    }}
                  >
                    <option value="skip">Bỏ qua mã đã tồn tại (Khuyên dùng)</option>
                    <option value="update">Cập nhật/Ghi đè thông tin voucher đã có</option>
                  </select>
                </div>
              </div>

              {/* Nút Xem trước */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={handlePreview}
                  disabled={loadingPreview || (sourceType === 'file' ? !file : !sheetUrl.trim())}
                  className="btn btn-secondary"
                  style={{
                    padding: '9px 24px',
                    fontWeight: '800',
                    fontSize: '13px',
                    borderRadius: '10px',
                  }}
                >
                  {loadingPreview ? (
                    <>
                      <Loader2 size={16} className="animate-spin" /> Đang đọc và kiểm tra dữ liệu...
                    </>
                  ) : (
                    <>
                      <Eye size={16} /> Kiểm tra & Xem trước dữ liệu
                    </>
                  )}
                </button>
              </div>

              {/* Thông báo lỗi nếu có */}
              {errorMsg && (
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '10px',
                    backgroundColor: '#FEF2F2',
                    border: '1px solid #FECACA',
                    color: '#DC2626',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <AlertCircle size={18} style={{ flexShrink: 0 }} />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Khu vực Bảng Xem trước (Preview) */}
              {previewData && (
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Thanh thống kê */}
                  <div
                    style={{
                      padding: '12px 18px',
                      backgroundColor: '#F8FAFC',
                      borderBottom: '1px solid var(--border-color)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '13px', fontWeight: '800', color: 'var(--text-primary)' }}>
                      Kết quả kiểm tra dữ liệu:
                    </span>
                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px', fontWeight: '700' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>
                        Tổng: <strong>{previewData.totalRows}</strong> dòng
                      </span>
                      <span style={{ color: '#10B981' }}>
                        Hợp lệ: <strong>{previewData.validRows}</strong>
                      </span>
                      {previewData.invalidRows > 0 && (
                        <span style={{ color: '#EF4444' }}>
                          Lỗi: <strong>{previewData.invalidRows}</strong>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bảng dữ liệu preview */}
                  <div style={{ maxHeight: '240px', overflowY: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                      <thead>
                        <tr
                          style={{
                            backgroundColor: '#F1F5F9',
                            color: 'var(--text-secondary)',
                            textAlign: 'left',
                            position: 'sticky',
                            top: 0,
                            zIndex: 1,
                          }}
                        >
                          <th style={{ padding: '8px 12px', width: '50px' }}>Dòng</th>
                          <th style={{ padding: '8px 12px' }}>Mã</th>
                          <th style={{ padding: '8px 12px' }}>Tiêu đề</th>
                          <th style={{ padding: '8px 12px' }}>Ưu đãi</th>
                          <th style={{ padding: '8px 12px', textAlign: 'center' }}>SL</th>
                          <th style={{ padding: '8px 12px' }}>Hạn dùng</th>
                          <th style={{ padding: '8px 12px' }}>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewData.items.map((it, idx) => (
                          <tr
                            key={idx}
                            style={{
                              borderBottom: '1px solid var(--border-light)',
                              backgroundColor: !it.isValid
                                ? 'rgba(239, 68, 68, 0.05)'
                                : it.isExistingInDb
                                ? 'rgba(245, 158, 11, 0.05)'
                                : 'transparent',
                            }}
                          >
                            <td style={{ padding: '8px 12px', color: 'var(--text-muted)' }}>
                              #{it.rowIndex}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '800' }}>
                              {it.code || <span style={{ color: '#EF4444' }}>[Trống]</span>}
                            </td>
                            <td style={{ padding: '8px 12px', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {it.title || <span style={{ color: '#EF4444' }}>[Trống]</span>}
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: '700', color: 'var(--primary)' }}>
                              {it.discountPercent
                                ? `${it.discountPercent}%`
                                : it.discountAmount
                                ? `${it.discountAmount.toLocaleString()}đ`
                                : '0'}
                            </td>
                            <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                              {it.quantity}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              {it.validUntil ? new Date(it.validUntil).toLocaleDateString('vi-VN') : '-'}
                            </td>
                            <td style={{ padding: '8px 12px' }}>
                              {!it.isValid ? (
                                <span
                                  style={{
                                    color: '#DC2626',
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    backgroundColor: '#FEE2E2',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                  }}
                                  title={it.validationErrors?.join(', ')}
                                >
                                  {it.validationErrors?.[0] || 'Lỗi'}
                                </span>
                              ) : it.isExistingInDb ? (
                                <span
                                  style={{
                                    color: '#D97706',
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    backgroundColor: '#FEF3C7',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                  }}
                                >
                                  {duplicateMode === 'skip' ? 'Trùng (sẽ bỏ qua)' : 'Đã có (sẽ cập nhật)'}
                                </span>
                              ) : (
                                <span
                                  style={{
                                    color: '#059669',
                                    fontWeight: '700',
                                    fontSize: '11px',
                                    backgroundColor: '#D1FAE5',
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                  }}
                                >
                                  Hợp lệ
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: '12px',
            backgroundColor: '#FFFFFF',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={importing}
            className="btn btn-secondary"
            style={{ fontSize: '13px' }}
          >
            Đóng
          </button>

          {!importResult && (
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !previewData || previewData.validRows === 0}
              className="btn btn-primary"
              style={{
                fontSize: '13px',
                padding: '8px 20px',
                fontWeight: '800',
              }}
            >
              {importing ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Đang lưu vào hệ thống...
                </>
              ) : (
                <>
                  Xác nhận nhập{' '}
                  {previewData?.validRows ? `(${previewData.validRows} voucher)` : ''}
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
