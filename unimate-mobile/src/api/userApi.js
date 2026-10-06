import { Platform } from 'react-native';
import client from './client';

/** Tạo FormData upload avatar từ URI ảnh chọn trong máy */
export const buildAvatarFormData = (uri) => {
  const filename = uri.split('/').pop() || 'avatar.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const type = ext === 'png' ? 'image/png' : 'image/jpeg';

  const formData = new FormData();
  formData.append('avatar', {
    uri: Platform.OS === 'android' ? uri : uri.replace('file://', ''),
    name: filename,
    type,
  });
  return formData;
};

export const userApi = {
  getSuggestedStudents: (limit = 10) =>
    client.get(`/api/users/students?limit=${limit}`),

  // Upload ảnh avatar lên Cloudinary qua backend
  updateAvatar: (formData) =>
    client.put('/api/users/me/avatar', formData, {
      timeout: 60000,
    }),

  // Cập nhật hồ sơ của chính mình (fullName, university, major, bio...)
  updateMe: (data) => client.put('/api/users/me', data),
};
