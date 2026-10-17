import client from './client';

export const venueApi = {
  /** Lấy danh sách quán công khai */
  getVenues: (params = {}) => client.get('/api/venues', { params }),

  /** Chi tiết 1 quán cafe */
  getVenueById: (id) => client.get(`/api/venues/${id}`),

  /** Quán cafe của đối tác hiện tại */
  getMyVenues: () => client.get('/api/venues/my/list'),

  /** Tạo quán cafe mới (Partner) */
  createVenue: (data) => client.post('/api/venues', data),

  /** Cập nhật thông tin quán cafe */
  updateVenue: (id, data) => client.put(`/api/venues/${id}`, data),

  /** Lấy mã QR check-in dán tại quán */
  getCheckinQr: (id) => client.get(`/api/venues/${id}/checkin-qr`),

  /** Tạo lại mã QR check-in */
  regenerateCheckinQr: (id) => client.post(`/api/venues/${id}/checkin-qr/regenerate`),
};
