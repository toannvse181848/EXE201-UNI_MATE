import { Platform } from 'react-native';

// Ưu tiên biến môi trường, đặt trong file .env ở thư mục unimate-mobile:
//   EXPO_PUBLIC_API_URL=https://unimate-api.onrender.com
// Không đặt thì quay về backend chạy ở máy:
//   máy ảo Android dùng 10.0.2.2 để gọi vào localhost của máy tính host,
//   điện thoại thật thì phải thay bằng IP LAN (VD: http://192.168.1.15:3000)
const DEFAULT_HOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_HOST;
