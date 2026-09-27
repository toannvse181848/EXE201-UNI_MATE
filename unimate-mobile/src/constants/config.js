import { Platform } from 'react-native';

// Ưu tiên biến môi trường EXPO_PUBLIC_API_URL, mặc định kết nối Backend Production Render
const DEFAULT_HOST = 'https://unimate-api.onrender.com';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;
