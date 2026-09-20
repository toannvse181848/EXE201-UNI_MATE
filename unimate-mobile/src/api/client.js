import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../constants/config';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Tự động đính kèm JWT token vào mỗi request
client.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi response
client.interceptors.response.use(
  (res) => res,
  (error) => {
    const message =
      error.response?.data?.message || 'Lỗi kết nối. Vui lòng thử lại.';
    return Promise.reject(new Error(message));
  }
);

export default client;
