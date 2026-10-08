import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authApi } from '../api/auth';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Khôi phục session khi app khởi động
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const savedToken = await AsyncStorage.getItem('token');
        if (savedToken) {
          setToken(savedToken);
          const res = await authApi.getMe();
          setUser(res.data.data.user);
        }
      } catch {
        await AsyncStorage.removeItem('token');
      } finally {
        setLoading(false);
      }
    };
    restoreSession();
  }, []);

  const saveSession = async (token, user) => {
    await AsyncStorage.setItem('token', token);
    setToken(token);
    setUser(user);
  };

  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { token, user } = res.data.data;
    await saveSession(token, user);
    return user;
  };

  const registerStudent = async (data) => {
    const res = await authApi.registerStudent(data);
    const { token, user } = res.data.data;
    await saveSession(token, user);
    return user;
  };

  const registerPartner = async (data) => {
    const res = await authApi.registerPartner(data);
    const { token, user } = res.data.data;
    await saveSession(token, user);
    return user;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const changePassword = async (currentPassword, newPassword) => {
    await authApi.changePassword({ currentPassword, newPassword });
  };

  const forgotPassword = async (email) => {
    const res = await authApi.forgotPassword(email);
    return res.data;
  };

  const resetPassword = async (token, newPassword) => {
    const res = await authApi.resetPassword(token, newPassword);
    return res.data;
  };

  const updateUser = (updatedUser) => {
    setUser((prev) => ({ ...prev, ...updatedUser }));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        registerStudent,
        registerPartner,
        logout,
        changePassword,
        forgotPassword,
        resetPassword,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
