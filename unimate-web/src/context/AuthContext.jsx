import React, { createContext, useContext, useState } from 'react';
import { authApi, userApi } from '../services/api';
import { getAvatarUrl } from '../constants/avatar';
import { setAnalyticsUser, trackEvent } from '../utils/analytics';
import { getAttribution } from '../utils/attribution';

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
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed) {
          parsed.avatar = getAvatarUrl(parsed.avatar);
          return parsed;
        }
      } catch {
        return null;
      }
    }
    return null;
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
      avatar: getAvatarUrl(dbUser.avatar),
      studentId: dbUser.studentId || dbUser.studentProfile?.studentId || '',
      university: dbUser.university || dbUser.studentProfile?.university || '',
      major: dbUser.major || dbUser.studentProfile?.major || '',
      year: dbUser.year || dbUser.studentProfile?.year || '',
      businessName: dbUser.partnerProfile?.businessName || '',
      status: dbUser.status || 'active',
      uniCoin: dbUser.uniCoin || 0,
      isPremium: Boolean(dbUser.isPremium || dbUser.studentProfile?.isPremium),
      premiumPlan: dbUser.premiumPlan || dbUser.studentProfile?.premiumPlan || null,
      premiumExpiresAt: dbUser.premiumExpiresAt || dbUser.studentProfile?.premiumExpiresAt || null,
      isVerifiedStudent: Boolean(
        dbUser.isPremium ||
        dbUser.isVerifiedStudent ||
        dbUser.studentProfile?.isPremium ||
        dbUser.studentProfile?.isVerifiedStudent
      ),
      trustScore: dbUser.trustScore || 0,
      interests: dbUser.studentProfile?.interests || [],
      bio: dbUser.studentProfile?.bio || '',
    };

    setUser(authenticatedUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(authenticatedUser));
    setAnalyticsUser(authenticatedUser);
    trackEvent('login', { method: 'email', account_role: normalizedRole });
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
      // Nguồn biết đến UNI-MATE: mã UTM của link đã mở + người dùng tự chọn
      acquisition: { ...getAttribution(), heardFrom: userData.heardFrom || null },
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
      avatar: getAvatarUrl(dbUser.avatar),
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
    setAnalyticsUser(registeredUser);
    trackEvent('sign_up', { method: 'email', account_role: normalizedRole, heard_from: userData.heardFrom || 'not_set' });
    return registeredUser;
  };

  const logout = () => {
    setUser(null);
    clearSession();
  };

  // Cập nhật thông tin user sau khi onboarding / chỉnh sửa hồ sơ
  const updateUser = (newData) => {
    const formattedData = { ...newData };
    if (formattedData.avatar) {
      formattedData.avatar = getAvatarUrl(formattedData.avatar);
    }
    const merged = { ...user, ...formattedData };
    setUser(merged);
    localStorage.setItem('unimate_portal_user', JSON.stringify(merged));
  };

  // Nâng cấp tài khoản Premium để nhận tích xanh xác thực (dùng UniCoin)
  const upgradePremium = async (plan = 'monthly', paymentMethod = 'coin') => {
    const res = await userApi.buyPremium({ plan, paymentMethod });
    if (res?.data?.user) {
      updateUser(res.data.user);
    }
    return res;
  };

  // Tải lại thông tin người dùng từ máy chủ (để cập nhật isPremium, uniCoin mới nhất)
  const reloadUser = async () => {
    try {
      const res = await authApi.getMe();
      if (res?.data?.user) {
        updateUser(res.data.user);
        return res.data.user;
      }
    } catch (err) {
      console.error('Lỗi tải lại thông tin user:', err);
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, updateUser, upgradePremium, reloadUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
