import client from './client';

// "Rủ cafe": mời bạn đã kết bạn hoặc cả nhóm chat tới một quán đối tác; chốt hẹn là những bạn đi nhận ưu đãi hẹn cafe
export const meetupApi = {
  getQuota: () => client.get('/api/meetups/quota'),
  // { matchId, venueId, scheduledAt? }
  create: (payload) => client.post('/api/meetups', payload),
  // Rủ cả nhóm: { groupId, venueId, scheduledAt? }
  createGroup: (payload) => client.post('/api/meetups/group', payload),
  // action: 'accept' | 'decline'
  respond: (meetupId, action) => client.post(`/api/meetups/${meetupId}/respond`, { action }),
  join: (meetupId) => client.post(`/api/meetups/${meetupId}/join`),
  leave: (meetupId) => client.post(`/api/meetups/${meetupId}/leave`),
  cancel: (meetupId) => client.post(`/api/meetups/${meetupId}/cancel`),
};
