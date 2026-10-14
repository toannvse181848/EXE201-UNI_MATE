const XLSX = require('xlsx');

/**
 * Tiện ích xuất file Excel minh chứng (danh sách người dùng, đơn hàng).
 * Thông tin cá nhân được che bớt trước khi xuất.
 */

/** nguyenvana@fpt.edu.vn → ngu*****@fpt.edu.vn */
const maskEmail = (email = '') => {
  const [name, domain] = String(email).split('@');
  if (!domain) return '***';
  const visible = name.slice(0, Math.min(3, Math.max(1, name.length - 1)));
  return `${visible}${'*'.repeat(Math.max(3, name.length - visible.length))}@${domain}`;
};

/** Nguyễn Văn An → Nguyễn V. A. (giữ họ, viết tắt phần còn lại) */
const maskName = (fullName = '') => {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return parts[0] ? `${parts[0][0]}***` : '';
  return [parts[0], ...parts.slice(1).map((p) => `${p[0]}.`)].join(' ');
};

/** 0901234567 → 090****567 */
const maskPhone = (phone = '') => {
  const digits = String(phone || '');
  if (digits.length < 7) return digits ? '***' : '';
  return `${digits.slice(0, 3)}****${digits.slice(-3)}`;
};

const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', hour12: false });
};

/**
 * rows: mảng object theo thứ tự cột; columns: [{ header, key, width }]
 * Trả về Buffer .xlsx
 */
const buildWorkbook = (sheetName, columns, rows) => {
  const data = [
    columns.map((c) => c.header),
    ...rows.map((row) => columns.map((c) => row[c.key] ?? '')),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = columns.map((c) => ({ wch: c.width || 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

/** Gửi buffer .xlsx về client dưới dạng file tải xuống */
const sendXlsx = (res, buffer, filename) => {
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
};

/** Tên file kèm ngày xuất, VD: unimate_nguoi_dung_2026-10-15.xlsx */
const datedFilename = (prefix) => {
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Ho_Chi_Minh' });
  return `${prefix}_${today}.xlsx`;
};

module.exports = {
  maskEmail,
  maskName,
  maskPhone,
  formatDateTime,
  buildWorkbook,
  sendXlsx,
  datedFilename,
};
