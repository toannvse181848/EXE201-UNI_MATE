import React, { createContext, useContext, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

// Token expiry: 8 giờ (ms)
const TOKEN_EXPIRY_MS = 8 * 60 * 60 * 1000;

const isSessionValid = () => {
  const loginTime = localStorage.getItem('unimate_login_time');
  if (!loginTime) return false;
  const elapsed = Date.now() - parseInt(loginTime, 10);
  return elapsed < TOKEN_EXPIRY_MS;
};

const clearSession = () => {
  localStorage.removeItem('unimate_portal_user');
  localStorage.removeItem('unimate_token');
  localStorage.removeItem('unimate_login_time');
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Kiểm tra session còn hạn không trước khi load user
    if (!isSessionValid()) {
      clearSession();
      return null;
    }
    const saved = localStorage.getItem('unimate_portal_user');
    return saved ? JSON.parse(saved) : null;
  });

  const login = async (email, password, role = 'user') => {
    // Chỉ cho phép đăng nhập qua backend API thật
    const res = await authApi.login(email, password);

    if (!res?.data?.token || !res?.data?.user) {
      throw new Error('Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    }

    const { token, user: dbUser } = res.data;
    localStorage.setItem('unimate_token', token);
    localStorage.setItem('unimate_login_time', Date.now().toString());

    const normalizedRole =
      dbUser.role === 'student' || dbUser.role === 'user' ? 'user' : dbUser.role;

    const authenticatedUser = {
      id: dbUser.id || dbUser._id,
      name: dbUser.fullName,
      email: dbUser.email,
      role: normalizedRole,
      avatar: dbUser.avatar || null,
      studentId: dbUser.studentId || dbUser.studentProfile?.studentId || '',
      university: dbUser.university || dbUser.studentProfile?.university || '',
      major: dbUser.major || dbUser.studentProfile?.major || '',
      year: dbUser.year || dbUser.studentProfile?.year || '',
      businessName: dbUser.partnerProfile?.businessName || '',
      status: dbUser.status || 'active',
      uniCoin: dbUser.uniCoin || 0,
      isVerifiedStudent: dbUser.isVerifiedStudent || false,
      trustScore: dbUser.trustScore || 0,
      interests: dbUser.studentProfile?.interests || [],
      bio: dbUser.studentProfile?.bio || '',
    };

    setUser(authenticatedUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(authenticatedUser));
    return authenticatedUser;
  };

  const register = async (userData) => {
    // Chỉ đăng ký qua backend API thật
    const res = await authApi.register({
      email: userData.email,
      password: userData.password,
      fullName: userData.fullName,
      role: userData.role === 'partner' ? 'partner' : 'student',
      phone: userData.phone,
      university: userData.university,
      major: userData.major,
      studentId: userData.studentId,
      businessName: userData.businessName,
    });

    if (!res?.data?.token || !res?.data?.user) {
      throw new Error('Đăng ký thất bại. Vui lòng thử lại.');
    }

    const { token, user: dbUser } = res.data;
    localStorage.setItem('unimate_token', token);
    localStorage.setItem('unimate_login_time', Date.now().toString());

    const normalizedRole =
      dbUser.role === 'student' || dbUser.role === 'user' ? 'user' : dbUser.role;

    const registeredUser = {
      id: dbUser.id || dbUser._id,
      name: dbUser.fullName,
      email: dbUser.email,
      role: normalizedRole,
      avatar: dbUser.avatar || null,
      studentId: userData.studentId || dbUser.studentProfile?.studentId || '',
      university: userData.university || dbUser.studentProfile?.university || '',
      major: userData.major || dbUser.studentProfile?.major || '',
      businessName: userData.businessName || dbUser.partnerProfile?.businessName || '',
      status: dbUser.status || (userData.role === 'partner' ? 'pending' : 'active'),
      uniCoin: 0,
      isVerifiedStudent: false,
      trustScore: 0,
      interests: [],
      bio: '',
    };

    setUser(registeredUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(registeredUser));
    return registeredUser;
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  // Cập nhật thông tin user sau khi onboarding / chỉnh sửa hồ sơ
  const updateUser = (newData) => {
    const merged = { ...user, ...newData };
    setUser(merged);
    localStorage.setItem('unimate_portal_user', JSON.stringify(merged));
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
