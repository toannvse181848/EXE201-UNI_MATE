import client from './client';

export const onboardingApi = {
  savePreferences: (data) => client.post('/api/onboarding/preferences', data),
  getRecommendations: (limit = 20) =>
    client.get(`/api/onboarding/recommendations?limit=${limit}`),
};
