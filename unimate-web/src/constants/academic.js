export const UNIVERSITIES = [
  'Đại học FPT TP.HCM',
  'ĐH Bách Khoa TP.HCM (HCMUT)',
  'ĐH Kinh Tế TP.HCM (UEH)',
  'ĐH RMIT Việt Nam',
  'ĐH Quốc Gia - KHTN',
  'ĐH Ngoại Thương (FTU2)',
  'ĐH Sư Phạm Kỹ Thuật (HCMUTE)',
  'ĐH Quốc Tế (IU)',
  'ĐH Tôn Đức Thắng (TDTU)',
  'ĐH Hoa Sen (HSU)',
  'Trường Đại học khác',
];

export const MAJORS = [
  'Kỹ thuật Phần mềm',
  'Khoa học Máy tính',
  'Công nghệ Thông tin',
  'An toàn Thông tin',
  'Trí tuệ Nhân tạo (AI)',
  'Hệ thống Thông tin',
  'Thiết kế Đồ họa (Graphic Design)',
  'Thiết kế Mỹ thuật số',
  'Quản trị Kinh doanh',
  'Marketing / Digital Marketing',
  'Kinh doanh Quốc tế',
  'Tài chính - Ngân hàng',
  'Kế toán - Kiểm toán',
  'Thương mại Điện tử',
  'Truyền thông Đa phương tiện',
  'Quan hệ Công chúng (PR)',
  'Ngôn ngữ Anh',
  'Ngôn ngữ Nhật',
  'Ngôn ngữ Hàn',
  'Ngôn ngữ Trung',
  'Quản trị Khách sạn / Du lịch',
  'Logistics & Quản lý Chuỗi cung ứng',
  'Kiến trúc & Nội thất',
  'Chuyên ngành khác',
];

export const ACADEMIC_YEARS = [
  'Sinh viên năm 1',
  'Sinh viên năm 2',
  'Sinh viên năm 3',
  'Sinh viên năm 4',
  'Sinh viên năm cuối',
];

/**
 * Format student year nicely for card display:
 * Converts raw year, cohort number (e.g. 18, K18) or text to "Sinh viên năm..."
 */
export const formatStudentYear = (year) => {
  if (!year) return 'Sinh viên';
  const str = String(year).trim();

  // If already starts with "Sinh viên năm" or "Sinh viên"
  if (/^sinh\s*viên\s*năm/i.test(str)) {
    return str;
  }
  if (/^sinh\s*viên/i.test(str)) {
    return str;
  }

  // Matches "Năm 1", "Năm 2", "Năm 3", "Năm 4", "Năm cuối"
  const namMatch = str.match(/năm\s*(\d+|cuối)/i);
  if (namMatch) {
    return `Sinh viên năm ${namMatch[1]}`;
  }

  // Digit 1-5
  if (/^[1-5]$/.test(str)) {
    return `Sinh viên năm ${str}`;
  }

  // Cohort e.g. K18, 18
  const kMatch = str.match(/^k?(\d{2})$/i);
  if (kMatch) {
    const cohort = parseInt(kMatch[1], 10);
    const cohortMap = {
      21: '1',
      20: '2',
      19: '3',
      18: '3',
      17: '4',
      16: '4',
    };
    if (cohortMap[cohort]) {
      return `Sinh viên năm ${cohortMap[cohort]}`;
    }
    return `Sinh viên khóa K${cohort}`;
  }

  return `Sinh viên ${str.toLowerCase()}`;
};
