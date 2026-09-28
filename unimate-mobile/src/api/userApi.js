import client from './client';

export const userApi = {
  getSuggestedStudents: (limit = 10) =>
    client.get(`/api/users/students?limit=${limit}`),

  // Upload ảnh avatar lên Cloudinary qua backend
  updateAvatar: (formData) =>
    client.put('/api/users/me/avatar', formData, {
      timeout: 30000,
    }),
};
