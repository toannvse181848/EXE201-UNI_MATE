/**
 * Trích xuất Quận/Huyện/Khu vực từ địa chỉ tại Việt Nam.
 * Tránh hiển thị sai 'Quận 10' khi quán ở khu vực khác.
 */
export const extractDistrict = (address = '', explicitDistrict = '') => {
  if (explicitDistrict && explicitDistrict.trim() && explicitDistrict !== 'Quận 10') {
    return explicitDistrict.trim();
  }

  if (!address || typeof address !== 'string') {
    return explicitDistrict || 'Chưa cập nhật';
  }

  const lower = address.toLowerCase();

  // Kiểm tra nếu thực sự là Quận 10
  if (lower.includes('quận 10') || lower.includes('q.10') || lower.includes('q10')) {
    return 'Quận 10';
  }

  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);

  if (parts.length >= 2) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const partLower = part.toLowerCase();

      if (
        ['tp.hcm', 'tp hcm', 'thành phố hồ chí minh', 'tphcm', 'hồ chí minh', 'hà nội', 'tỉnh bình dương', 'tỉnh đồng nai'].includes(partLower)
      ) {
        continue;
      }

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
