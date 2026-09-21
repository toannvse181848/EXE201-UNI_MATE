import client from './client';

export const matchApi = {
  getDiscoverDeck: () => client.get('/api/matches/discover'),
  swipe: (targetUserId, action) =>
    client.post('/api/matches/swipe', { targetUserId, action }),
  getMyMatches: () => client.get('/api/matches/my-matches'),
  proposeVenue: (matchId, venueId) =>
    client.post('/api/matches/propose-venue', { matchId, venueId }),
  getSentLikes: () => client.get('/api/matches/sent-likes'),
  getReceivedLikes: () => client.get('/api/matches/received-likes'),
};
