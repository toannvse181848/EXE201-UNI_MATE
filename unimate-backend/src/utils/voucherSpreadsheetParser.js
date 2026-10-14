const XLSX = require('xlsx');

/**
 * Chuẩn hoá tên cột header: bỏ dấu tiếng Việt, chữ thường, bỏ ký tự đặc biệt
 */
const normalizeHeader = (header = '') => {
  return String(header)
    .trim()
    .toLowerCase()
    .replace(/[đĐ]/g, 'd')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
};

/**
 * Map các header nhận diện được sang field chuẩn của hệ thống
 */
const mapField = (normalizedHeader) => {
  if (normalizedHeader.includes('unicoin') || normalizedHeader.includes('giacoin') || normalizedHeader.includes('coincost') || normalizedHeader.includes('giadiem')) return 'coinCost';
  if (normalizedHeader.includes('loaima') || normalizedHeader.includes('kieuma') || normalizedHeader.includes('codetype')) return 'codeType';
  if (normalizedHeader.includes('mavoucher') || normalizedHeader.includes('vouchercode') || ['ma', 'code'].includes(normalizedHeader)) return 'code';
  if (normalizedHeader.includes('tieude') || normalizedHeader.includes('tenvoucher') || ['title', 'name'].includes(normalizedHeader)) return 'title';
  if (normalizedHeader.includes('mota') || normalizedHeader.includes('chitiet') || normalizedHeader.includes('description') || normalizedHeader.includes('noidung')) return 'description';
  if (normalizedHeader.includes('loaigiam') || normalizedHeader.includes('loaivoucher') || normalizedHeader.includes('discounttype')) return 'discountType';
  if (normalizedHeader.includes('mucgiam') || normalizedHeader.includes('giatrigiam') || normalizedHeader.includes('discountvalue')) return 'discountValue';
  if (normalizedHeader.includes('giampercent') || normalizedHeader.includes('giamphantram') || normalizedHeader.includes('discountpercent')) return 'discountPercent';
  if (normalizedHeader.includes('giamtien') || normalizedHeader.includes('sotiengiam') || normalizedHeader.includes('discountamount')) return 'discountAmount';
  if (normalizedHeader.includes('dontoithieu') || normalizedHeader.includes('hoadontoithieu') || normalizedHeader.includes('minbill')) return 'minBill';
  if (normalizedHeader.includes('soluong') || normalizedHeader.includes('quantity') || normalizedHeader.includes('total')) return 'quantity';
  if (normalizedHeader.includes('hansudung') || normalizedHeader.includes('ngayhethan') || normalizedHeader.includes('handung') || normalizedHeader.includes('validuntil') || normalizedHeader.includes('expiry') || normalizedHeader === 'hsd') return 'validUntil';
  if (normalizedHeader.includes('dieukhoan') || normalizedHeader.includes('dieukien') || normalizedHeader.includes('terms')) return 'terms';
  if (normalizedHeader.includes('trangthai') || normalizedHeader.includes('status') || normalizedHeader.includes('isactive') || normalizedHeader.includes('hoatdong')) return 'isActive';
  return null;
};

/** "Không giới hạn", "vô hạn", "unlimited", "∞" → không giới hạn số lượt */
const isUnlimitedText = (value) => {
  const normalized = normalizeHeader(value);
  return ['khonggioihan', 'vohan', 'unlimited', 'khonggh'].includes(normalized) || String(value).trim() === '∞';
};

/** "Riêng" / "unique" / "1 lần" → mã riêng, còn lại → mã chung */
const parseCodeType = (value) => {
  const normalized = normalizeHeader(value);
  return ['rieng', 'marieng', 'unique', '1lan', 'motlan'].includes(normalized) ? 'unique' : 'shared';
};

/**
 * Chuyển đổi giá trị ngày tháng từ Excel (string DD/MM/YYYY, YYYY-MM-DD hoặc Excel serial number)
 */
const parseDateValue = (raw) => {
  if (!raw) return null;

  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return raw;
  }

  // Số serial của Excel (ví dụ 45678)
  if (typeof raw === 'number') {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) {
      return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0));
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    // Khớp DD/MM/YYYY hoặc DD-MM-YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/);
    if (dmyMatch) {
      const day = parseInt(dmyMatch[1], 10);
      const month = parseInt(dmyMatch[2], 10) - 1;
      const year = parseInt(dmyMatch[3], 10);
      return new Date(year, month, day, 23, 59, 59);
    }
    // Khớp YYYY-MM-DD
    const ymdMatch = trimmed.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})/);
    if (ymdMatch) {
      const year = parseInt(ymdMatch[1], 10);
      const month = parseInt(ymdMatch[2], 10) - 1;
      const day = parseInt(ymdMatch[3], 10);
      return new Date(year, month, day, 23, 59, 59);
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
};

/**
 * Phân tích buffer file Excel / CSV thành danh sách voucher đã chuẩn hoá
 */
const parseSpreadsheetBuffer = (buffer) => {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    cellDates: true,
    cellText: false,
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('File tính không có trang (sheet) nào hợp lệ');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: '', header: 1 });

  if (!rawRows || rawRows.length < 2) {
    throw new Error('File không có dữ liệu (cần ít nhất 1 dòng tiêu đề và 1 dòng dữ liệu)');
  }

  // Dòng đầu tiên là Header
  const headerRow = rawRows[0];
  const fieldMapping = {};

  headerRow.forEach((colName, index) => {
    const normalized = normalizeHeader(colName);
    const field = mapField(normalized);
    if (field) {
      fieldMapping[index] = field;
    }
  });

  const parsedItems = [];
  const errors = [];

  for (let rowIndex = 1; rowIndex < rawRows.length; rowIndex++) {
    const row = rawRows[rowIndex];
    // Bỏ qua dòng hoàn toàn rỗng
    if (!row || row.every((cell) => String(cell).trim() === '')) {
      continue;
    }

    const item = {
      rowIndex: rowIndex + 1, // 1-indexed (hàng Excel)
      code: '',
      title: '',
      description: '',
      discountPercent: 0,
      discountAmount: 0,
      minBill: 0,
      quantity: 100,
      isUnlimited: false,
      codeType: 'shared',
      coinCost: 0,
      validUntil: null,
      terms: [],
      isActive: true,
      rawDiscountType: '',
      rawDiscountValue: '',
    };

    // Điền các cột theo mapping
    row.forEach((cellVal, colIndex) => {
      const field = fieldMapping[colIndex];
      if (!field) return;

      const strVal = typeof cellVal === 'string' ? cellVal.trim() : cellVal;

      if (field === 'code') item.code = String(strVal).toUpperCase().trim();
      else if (field === 'title') item.title = String(strVal).trim();
      else if (field === 'description') item.description = String(strVal).trim();
      else if (field === 'discountType') item.rawDiscountType = String(strVal).toLowerCase().trim();
      else if (field === 'discountValue') item.rawDiscountValue = strVal;
      else if (field === 'discountPercent') item.discountPercent = Number(strVal) || 0;
      else if (field === 'discountAmount') item.discountAmount = Number(strVal) || 0;
      else if (field === 'minBill') item.minBill = Math.max(0, Number(strVal) || 0);
      else if (field === 'quantity') {
        if (isUnlimitedText(strVal)) item.isUnlimited = true;
        else item.quantity = Math.max(0, parseInt(strVal, 10) || 100);
      }
      else if (field === 'codeType') item.codeType = parseCodeType(strVal);
      else if (field === 'coinCost') item.coinCost = Math.max(0, parseInt(strVal, 10) || 0);
      else if (field === 'validUntil') item.validUntil = parseDateValue(cellVal);
      else if (field === 'terms') {
        if (typeof strVal === 'string' && strVal.length > 0) {
          item.terms = strVal
            .split(/[;\n]/)
            .map((t) => t.trim())
            .filter(Boolean);
        }
      } else if (field === 'isActive') {
        const lower = String(strVal).toLowerCase();
        item.isActive = !['false', '0', 'tạm dừng', 'tam dung', 'khoá', 'inactive'].includes(lower);
      }
    });

    // Tính toán loại giảm giá & mức giảm
    if (item.rawDiscountValue !== '') {
      const numVal = Number(String(item.rawDiscountValue).replace(/[^0-9.]/g, '')) || 0;
      const isPercent =
        item.rawDiscountType.includes('%') ||
        item.rawDiscountType.includes('percent') ||
        item.rawDiscountType.includes('phan tram') ||
        String(item.rawDiscountValue).includes('%') ||
        (numVal <= 100 && !item.rawDiscountType.includes('vnd') && !item.rawDiscountType.includes('tien'));

      if (isPercent) {
        item.discountPercent = Math.min(100, Math.max(0, numVal));
        item.discountAmount = 0;
      } else {
        item.discountAmount = Math.max(0, numVal);
        item.discountPercent = 0;
      }
    }

    // Nếu không có hạn sử dụng, mặc định 6 tháng sau
    if (!item.validUntil || isNaN(item.validUntil.getTime())) {
      item.validUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000);
    }

    // Validation cơ bản từng dòng
    const rowErrors = [];
    if (!item.code) {
      rowErrors.push('Thiếu mã voucher');
    }
    if (!item.title) {
      rowErrors.push('Thiếu tiêu đề voucher');
    }
    if (!item.discountPercent && !item.discountAmount) {
      rowErrors.push('Mức giảm giá không hợp lệ (cần > 0)');
    }
    if (item.codeType === 'unique') {
      item.isUnlimited = false;
    }
    if (item.codeType === 'shared' && !item.isUnlimited && item.quantity <= 0) {
      rowErrors.push('Số lượng phát hành phải lớn hơn 0');
    }

    if (rowErrors.length > 0) {
      errors.push({
        row: item.rowIndex,
        code: item.code || `(Hàng ${item.rowIndex})`,
        reasons: rowErrors,
      });
    }

    parsedItems.push({
      ...item,
      isValid: rowErrors.length === 0,
      validationErrors: rowErrors,
    });
  }

  return {
    totalRows: parsedItems.length,
    validRows: parsedItems.filter((i) => i.isValid).length,
    invalidRows: parsedItems.filter((i) => !i.isValid).length,
    items: parsedItems,
    errors,
  };
};

/**
 * Tải dữ liệu từ URL Google Sheet (hỗ trợ link chia sẻ công khai)
 */
const fetchGoogleSheetData = async (sheetUrl) => {
  if (!sheetUrl || typeof sheetUrl !== 'string') {
    throw new Error('Vui lòng cung cấp đường link Google Sheet');
  }

  // 1. Kiểm tra an toàn URL chống tấn công SSRF (Server-Side Request Forgery)
  let parsedUrl;
  try {
    parsedUrl = new URL(sheetUrl.trim());
  } catch {
    throw new Error('Đường link không đúng định dạng URL hợp lệ');
  }

  if (parsedUrl.protocol !== 'https:') {
    throw new Error('Chỉ chấp nhận đường dẫn bảo mật HTTPS');
  }

  if (!['docs.google.com', 'drive.google.com'].includes(parsedUrl.hostname.toLowerCase())) {
    throw new Error('Chỉ chấp nhận liên kết bảng tính từ tên miền chính thức docs.google.com');
  }

  // Trích xuất Sheet ID an toàn
  const match = sheetUrl.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]{15,100})/);
  if (!match || !match[1]) {
    throw new Error('Đường link Google Sheet không hợp lệ. Vui lòng kiểm tra lại định dạng link.');
  }

  const sheetId = match[1];

  // Trích xuất gid nếu có (chỉ nhận số)
  const gidMatch = sheetUrl.match(/[?&#]gid=([0-9]+)/);
  const gid = gidMatch ? gidMatch[1] : '0';

  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gid}`;


  try {
    const res = await fetch(exportUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 UNI-MATE Voucher Importer',
      },
      redirect: 'follow',
    });

    if (!res.ok) {
      throw new Error(`Google Sheets phản hồi mã trạng thái: ${res.status}`);
    }

    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error(
        'Không thể truy cập Google Sheet. Vui lòng đảm bảo bảng tính đã được mở quyền: "Bất kỳ ai có đường liên kết đều có thể xem" (Anyone with the link can view).'
      );
    }

    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (err) {
    if (err.message.includes('quyền') || err.message.includes('Google Sheet')) {
      throw err;
    }
    throw new Error(
      `Lỗi khi đọc Google Sheet: ${err.message}. Hãy chắc chắn Google Sheet đã được mở quyền xem công khai.`
    );
  }
};

/**
 * Tạo file mẫu Excel .xlsx chuẩn cho người dùng tải về
 */
const generateVoucherTemplate = () => {
  const wb = XLSX.utils.book_new();

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
      'Áp dụng tại quán; Mỗi SV dùng 1 lần/ngày; Không cộng dồn ưu đãi khác',
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
      'Áp dụng cho hóa đơn từ 150.000đ; Áp dụng cả mang đi và tại quán',
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

  const wsData = [headers, ...sampleData];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Đặt độ rộng các cột cho đẹp mắt
  ws['!cols'] = [
    { wch: 18 }, // Mã voucher
    { wch: 20 }, // Loại mã
    { wch: 35 }, // Tiêu đề
    { wch: 45 }, // Mô tả
    { wch: 22 }, // Loại giảm
    { wch: 14 }, // Mức giảm
    { wch: 20 }, // Đơn tối thiểu
    { wch: 22 }, // Số lượng
    { wch: 24 }, // Hạn sử dụng
    { wch: 55 }, // Điều khoản
    { wch: 22 }, // Giá UniCoin
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Mau_Voucher_UNIMATE');

  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};

module.exports = {
  parseSpreadsheetBuffer,
  fetchGoogleSheetData,
  generateVoucherTemplate,
  parseDateValue,
};
