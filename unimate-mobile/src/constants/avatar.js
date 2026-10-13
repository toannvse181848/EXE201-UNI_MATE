// URL Cloudinary đã được upload lên server, dùng làm avatar mặc định
export const DEFAULT_AVATAR = 'https://res.cloudinary.com/xzjfoa0p/image/upload/v1791901630/unimate/defaults/default_avatar.png';

/**
 * Trả về URL avatar hợp lệ, thay thế avatar tạm cũ bằng avatar mặc định mới.
 * @param {string|null|undefined} url
 * @returns {string}
 */
export const getAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return DEFAULT_AVATAR;
  // Thay thế avatar tạm cũ (Unsplash portrait) sang avatar mặc định mới
  if (url.includes('photo-1534528741775-53994a69daeb')) return DEFAULT_AVATAR;
  return url;
};
