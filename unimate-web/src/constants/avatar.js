export const DEFAULT_AVATAR = 'https://res.cloudinary.com/xzjfoa0p/image/upload/v1791901630/unimate/defaults/default_avatar.png';

export const getAvatarUrl = (url) => {
  if (!url || typeof url !== 'string') return DEFAULT_AVATAR;
  // Thay thế avatar tạm cũ (Unsplash portrait) sang avatar mặc định mới
  if (url.includes('photo-1534528741775-53994a69daeb')) return DEFAULT_AVATAR;
  return url;
};
