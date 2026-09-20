import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('unimate_portal_user');
    return saved
      ? JSON.parse(saved)
      : {
          id: 'partner_01',
          name: 'The Coffee House - Sư Vạn Hạnh',
          email: 'partner@thecoffeehouse.vn',
          role: 'partner', // 'partner' | 'admin'
          avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200',
          venueId: 'v1',
          status: 'active', // 'active' | 'pending'
        };
  });

  const login = async (email, password, role = 'partner') => {
    // TODO: Connect with backend API /api/auth/login
    let mockUser = null;
    if (role === 'admin' || email.includes('admin')) {
      mockUser = {
        id: 'admin_01',
        name: 'Quản Trị Viên (Admin)',
        email: email || 'admin@unimate.vn',
        role: 'admin',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
      };
    } else {
      mockUser = {
        id: 'partner_01',
        name: 'The Coffee House - Sư Vạn Hạnh',
        email: email || 'partner@thecoffeehouse.vn',
        role: 'partner',
        avatar: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=200',
        venueId: 'v1',
        status: email.includes('pending') ? 'pending' : 'active',
      };
    }
    setUser(mockUser);
    localStorage.setItem('unimate_portal_user', JSON.stringify(mockUser));
    return mockUser;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('unimate_portal_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
