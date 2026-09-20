import client from './client';

export const authApi = {
  registerStudent: (data) => client.post('/api/auth/register/student', data),
  registerPartner: (data) => client.post('/api/auth/register/partner', data),
  login: (data) => client.post('/api/auth/login', data),
  getMe: () => client.get('/api/auth/me'),
  changePassword: (data) => client.post('/api/auth/change-password', data),
};
