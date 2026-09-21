import client from './client';

export const venueApi = {
  getVenues: (params = {}) => client.get('/api/venues', { params }),
  getVenueById: (id) => client.get(`/api/venues/${id}`),
};
