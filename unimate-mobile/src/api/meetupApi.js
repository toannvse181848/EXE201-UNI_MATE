import client from './client';

// "Rủ cafe": mời bạn đã kết bạn tới một quán đối tác; đồng ý là cả hai nhận ưu đãi hẹn cafe
export const meetupApi = {
  getQuota: () => client.get('/api/meetups/quota'),
  // { matchId, venueId, scheduledAt? }
  create: (payload) => client.post('/api/meetups', payload),
  // action: 'accept' | 'decline'
  respond: (meetupId, action) => client.post(`/api/meetups/${meetupId}/respond`, { action }),
  cancel: (meetupId) => client.post(`/api/meetups/${meetupId}/cancel`),
};
