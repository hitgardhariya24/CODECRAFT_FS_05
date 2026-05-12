import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import api from '../services/api';

const AuthContext = createContext(null);

const tokenKey = 'smp_token';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadMe = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
    } catch (_error) {
      localStorage.removeItem(tokenKey);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMe();
  }, []);

  const auth = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      login: async (payload) => {
        try {
          const { data } = await api.post('/auth/login', payload);
          localStorage.setItem(tokenKey, data.token);
          setUser(data.user);
          toast.success('Welcome back');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Login failed');
          throw error;
        }
      },
      register: async (formData) => {
        try {
          const { data } = await api.post('/auth/register', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
          });
          localStorage.setItem(tokenKey, data.token);
          setUser(data.user);
          toast.success('Account created');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Registration failed');
          throw error;
        }
      },
      logout: async () => {
        await api.post('/auth/logout');
        localStorage.removeItem(tokenKey);
        setUser(null);
        toast.success('Logged out');
      },
      forgotPassword: async (email) => {
        try {
          await api.post('/auth/forgot-password', { email });
          toast.success('Password reset email sent');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Could not send reset email');
          throw error;
        }
      },
      resetPassword: async (token, password) => {
        try {
          const { data } = await api.post(`/auth/reset-password/${token}`, { password });
          localStorage.setItem(tokenKey, data.token);
          setUser(data.user);
          toast.success('Password reset successfully');
        } catch (error) {
          toast.error(error.response?.data?.message || 'Password reset failed');
          throw error;
        }
      },
      updateUser: (nextUser) => setUser(nextUser),
      refreshUser: loadMe,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);