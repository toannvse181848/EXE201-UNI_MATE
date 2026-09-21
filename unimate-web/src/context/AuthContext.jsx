import React, { createContext, useContext, useState } from 'react';
import { authApi } from '../services/api';

const AuthContext = createContext();

export const MOCK_ACCOUNTS = {
  user: {
    id: 'student_01',
    name: 'Nguyễn Văn Toàn',
    email: 'toan.nguyen@fpt.edu.vn',
    role: 'user', // 'user' | 'partner' | 'admin'
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
    university: 'Đại học FPT TP.HCM',
    studentId: 'SE181848',
    major: 'Kỹ thuật Phần mềm',
    year: 'Năm 3',
    uniCoin: 450,
    isVerifiedStudent: true,
    trustScore: 98,
    interests: ['Lập trình React', 'Cà phê học bài', 'Boardgame', 'Nhiếp ảnh', 'Guitar'],
    bio: 'Tìm bạn cùng cày deadline & khám phá các quán cafe yên tĩnh khu Công nghệ cao 🚀',
  },
  partner: {
    id: 'partner_01',
    name: 'The Coffee House - Sư Vạn Hạnh',
    email: 'partner@thecoffeehouse.vn',
    role: 'partner',
    avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200',
    venueId: 'v1',
    status: 'active', // 'active' | 'pending'
    address: 'Vạn Hạnh Mall, Q.10, TP.HCM',
  },
  admin: {
    id: 'admin_01',
    name: 'Quản Trị Viên (Admin)',
    email: 'admin@unimate.vn',
    role: 'admin',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
    permissions: ['all'],
  },
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('unimate_portal_user');
    return saved ? JSON.parse(saved) : MOCK_ACCOUNTS.user;
  });

  const login = async (email, password, role = 'user') => {
    // Thử gọi backend nếu có
    try {
      const res = await authApi.login(email, password);
      if (res?.data?.token) {
        localStorage.setItem('unimate_token', res.data.token);
      }
    } catch (err) {
      console.log('Backend auth login notice:', err.message);
    }

    let mockUser = null;
    if (role === 'admin' || (email && email.includes('admin'))) {
      mockUser = { ...MOCK_ACCOUNTS.admin, email: email || MOCK_ACCOUNTS.admin.email };
    } else if (role === 'partner' || (email && email.includes('partner'))) {
      mockUser = {
        ...MOCK_ACCOUNTS.partner,
        email: email || MOCK_ACCOUNTS.partner.email,
        status: email && email.includes('pending') ? 'pending' : 'active',
      };
    } else {
      mockUser = {
        ...MOCK_ACCOUNTS.user,
        email: email || MOCK_ACCOUNTS.user.email,
      };
    }
    setUser(mockUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const register = async (userData) => {
    // Thử gửi dữ liệu lên backend
    try {
      const res = await authApi.register({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role === 'partner' ? 'partner' : 'student',
        phone: userData.phone,
        studentProfile:
          userData.role === 'user'
            ? {
                university: userData.university,
                major: userData.major,
              }
            : undefined,
        partnerProfile:
          userData.role === 'partner'
            ? {
                businessName: userData.businessName,
              }
            : undefined,
      });
      if (res?.data?.token) {
        localStorage.setItem('unimate_token', res.data.token);
      }
    } catch (err) {
      console.log('Backend auth register notice:', err.message);
    }

    // Tạo phiên người dùng đăng nhập ngay sau khi đăng ký
    const newUser = {
      id: `user_${Date.now()}`,
      name: userData.fullName,
      email: userData.email,
      role: userData.role || 'user',
      avatar:
        userData.role === 'partner'
          ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200'
          : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200',
      university: userData.university || 'Đại học FPT TP.HCM',
      major: userData.major || 'Kỹ thuật Phần mềm',
      businessName: userData.businessName || '',
      status: userData.role === 'partner' ? 'pending' : 'active',
      uniCoin: 100,
      isVerifiedStudent: true,
      trustScore: 90,
      interests: ['Kết nối bạn học', 'Cà phê', 'Học tập'],
      bio: 'Thành viên mới của cộng đồng sinh viên UNI-MATE ✨',
    };

    setUser(newUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(newUser));
    return newUser;
  };

  const switchRole = (targetRole) => {
    if (MOCK_ACCOUNTS[targetRole]) {
      const newUser = MOCK_ACCOUNTS[targetRole];
      setUser(newUser);
      localStorage.setItem('unimate_portal_user', JSON.stringify(newUser));
      return newUser;
    }
    return user;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unimate_portal_user');
    localStorage.removeItem('unimate_token');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, setUser, switchRole, MOCK_ACCOUNTS }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
