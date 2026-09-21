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
    let authenticatedUser = null;

    // 1. Ưu tiên gọi backend API xác thực từ Database
    try {
      const res = await authApi.login(email, password);
      if (res?.data?.token && res?.data?.user) {
        localStorage.setItem('unimate_token', res.data.token);
        const dbUser = res.data.user;
        const normalizedRole =
          dbUser.role === 'student' || dbUser.role === 'user' ? 'user' : dbUser.role;

        authenticatedUser = {
          id: dbUser.id || dbUser._id,
          name: dbUser.fullName,
          email: dbUser.email,
          role: normalizedRole,
          avatar:
            dbUser.avatar ||
            (normalizedRole === 'partner'
              ? MOCK_ACCOUNTS.partner.avatar
              : MOCK_ACCOUNTS.user.avatar),
          university: dbUser.studentProfile?.university || 'Đại học FPT TP.HCM',
          major: dbUser.studentProfile?.major || 'Kỹ thuật Phần mềm',
          businessName: dbUser.partnerProfile?.businessName || '',
          status: dbUser.status || 'active',
          uniCoin: 250,
          isVerifiedStudent: true,
          trustScore: 95,
          interests: dbUser.studentProfile?.interests || [
            'Kết nối bạn học',
            'Cà phê học bài',
            'Boardgame',
          ],
          bio: dbUser.studentProfile?.bio || 'Thành viên UNI-MATE 🚀',
        };
      }
    } catch (err) {
      console.log('Backend auth login notice:', err.message);
      // Nếu server trả về lỗi sai thông tin đăng nhập, ném lỗi ra để giao diện hiển thị cho người dùng
      if (
        err.message &&
        !err.message.includes('Network Error') &&
        !err.message.includes('kết nối')
      ) {
        throw err;
      }
    }

    // 2. Fallback cho tài khoản Demo nếu backend offline
    if (!authenticatedUser) {
      if (role === 'admin' || (email && email.includes('admin'))) {
        authenticatedUser = {
          ...MOCK_ACCOUNTS.admin,
          email: email || MOCK_ACCOUNTS.admin.email,
        };
      } else if (role === 'partner' || (email && email.includes('partner'))) {
        authenticatedUser = {
          ...MOCK_ACCOUNTS.partner,
          email: email || MOCK_ACCOUNTS.partner.email,
          status: email && email.includes('pending') ? 'pending' : 'active',
        };
      } else {
        authenticatedUser = {
          ...MOCK_ACCOUNTS.user,
          email: email || MOCK_ACCOUNTS.user.email,
        };
      }
    }

    setUser(authenticatedUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(authenticatedUser));
    return authenticatedUser;
  };

  const register = async (userData) => {
    let registeredUser = null;

    // 1. Gửi thông tin đăng ký lưu trực tiếp vào Database qua Backend
    try {
      const res = await authApi.register({
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role === 'partner' ? 'partner' : 'student',
        phone: userData.phone,
        university: userData.university,
        major: userData.major,
        businessName: userData.businessName,
      });

      if (res?.data?.token && res?.data?.user) {
        localStorage.setItem('unimate_token', res.data.token);
        const dbUser = res.data.user;
        const normalizedRole =
          dbUser.role === 'student' || dbUser.role === 'user' ? 'user' : dbUser.role;

        registeredUser = {
          id: dbUser.id || dbUser._id,
          name: dbUser.fullName,
          email: dbUser.email,
          role: normalizedRole,
          avatar:
            dbUser.avatar ||
            (normalizedRole === 'partner'
              ? 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200'
              : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200'),
          university:
            userData.university ||
            dbUser.studentProfile?.university ||
            'Đại học FPT TP.HCM',
          major:
            userData.major ||
            dbUser.studentProfile?.major ||
            'Kỹ thuật Phần mềm',
          businessName:
            userData.businessName ||
            dbUser.partnerProfile?.businessName ||
            '',
          status:
            dbUser.status ||
            (userData.role === 'partner' ? 'pending' : 'active'),
          uniCoin: 100,
          isVerifiedStudent: true,
          trustScore: 90,
          interests: ['Kết nối bạn học', 'Học tập', 'Cà phê'],
          bio: 'Thành viên mới của cộng đồng sinh viên UNI-MATE ✨',
        };
      }
    } catch (err) {
      console.log('Backend auth register notice:', err.message);
      // Ném lỗi ra nếu trùng email hoặc lỗi ràng buộc để người dùng biết
      if (
        err.message &&
        !err.message.includes('Network Error') &&
        !err.message.includes('kết nối')
      ) {
        throw err;
      }
    }

    // 2. Fallback nếu không kết nối được máy chủ backend
    if (!registeredUser) {
      registeredUser = {
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
    }

    setUser(registeredUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(registeredUser));
    return registeredUser;
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
