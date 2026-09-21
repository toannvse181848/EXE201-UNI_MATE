import client from './client';

export const userApi = {
  getSuggestedStudents: (limit = 10) =>
    client.get(`/api/users/students?limit=${limit}`),
};
