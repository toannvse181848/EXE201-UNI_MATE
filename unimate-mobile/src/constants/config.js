import { Platform } from 'react-native';

// Khi chạy máy ảo Android, dùng 10.0.2.2 để gọi vào localhost của máy tính host
// Khi test trên điện thoại thật qua mạng Wifi, hãy thay đổi thành IP LAN (VD: 'http://192.168.1.15:3000')
const DEFAULT_HOST =
  Platform.OS === 'android' ? 'http://10.0.2.2:3000' : 'http://localhost:3000';

export const API_BASE_URL = DEFAULT_HOST;
