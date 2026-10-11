/**
 * Trích xuất Quận/Huyện/Thị xã/Thành phố thông minh từ chuỗi địa chỉ tại Việt Nam.
 * Tránh trường hợp bị gán cứng 'Quận 10' khi quán ở địa phương khác.
 */
const extractDistrict = (address, explicitDistrict = '') => {
  // Nếu explicitDistrict hợp lệ và không phải giá trị gán cứng sai 'Quận 10'
  if (explicitDistrict && explicitDistrict.trim() && explicitDistrict !== 'Quận 10') {
    return explicitDistrict.trim();
  }

  if (!address || typeof address !== 'string') {
    return explicitDistrict || '';
  }

  const lower = address.toLowerCase();

  // Nếu thực sự địa chỉ có chứa Quận 10
  if (lower.includes('quận 10') || lower.includes('q.10') || lower.includes('q10')) {
    return 'Quận 10';
  }

  // Tách theo dấu phẩy
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const partLower = part.toLowerCase();

      // Bỏ qua tên tỉnh/thành phố lớn
      if (
        ['tp.hcm', 'tp hcm', 'thành phố hồ chí minh', 'tphcm', 'hồ chí minh', 'hà nội', 'tỉnh bình dương', 'tỉnh đồng nai'].includes(partLower)
      ) {
        continue;
      }

      // Khớp các đơn vị hành chính cấp quận/huyện
      if (
        /^(quận|huyện|thị xã|thành phố|tp\.|tx\.|q\.)/i.test(part) ||
        /(dĩ an|thuận an|thủ đức|bình thạnh|gò vấp|phú nhuận|tân bình|tân phú|bình tân|nhà bè|hóc môn|củ chi|cần giờ|biên hòa)/i.test(part)
      ) {
        if (i < parts.length - 1 && /bình dương/i.test(parts[i + 1])) {
          return `${part}, Bình Dương`;
        }
        return part;
      }
    }

    const secondLast = parts[parts.length - 2];
    const last = parts[parts.length - 1];
    if (/bình dương|đồng nai|long an/i.test(last)) {
      return `${secondLast}, ${last}`;
    }
    return secondLast;
  }

  return explicitDistrict || address;
};

module.exports = {
  extractDistrict,
};
