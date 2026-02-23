import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthState, Trader, User } from '@/types/models';
import { authApi } from '@/services/api';
import { initializeMockData } from '@/services/mockData';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  trader: null,
  token: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isLoading: false,
  error: null,
  clearError: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>(() => {
    const saved = localStorage.getItem('mkt_auth');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { isAuthenticated: false, user: null, trader: null, token: null };
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    initializeMockData();
  }, []);

  useEffect(() => {
    localStorage.setItem('mkt_auth', JSON.stringify(state));
  }, [state]);

  const login = useCallback(async (email: string, password: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.login(email, password);
      setState({
        isAuthenticated: true,
        user: result.user,
        trader: result.trader,
        token: result.token,
      });
    } catch (e: any) {
      setError(e.message || 'Login failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (data: any) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await authApi.register({
        business_name: data.businessName || data.business_name || '',
        owner_name: data.ownerName || data.owner_name || '',
        mobile: data.mobile || '',
        email: data.email || '',
        password: data.password || '',
        address: data.address || '',
        city: data.city || '',
        state: data.state || '',
        pin_code: data.pinCode || data.pin_code || '',
        category: data.categoryName || data.category || '',
      });
      setState({
        isAuthenticated: true,
        user: result.user,
        trader: result.trader,
        token: result.token,
      });
    } catch (e: any) {
      setError(e.message || 'Registration failed');
      throw e;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setState({ isAuthenticated: false, user: null, trader: null, token: null });
    localStorage.removeItem('mkt_auth');
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, isLoading, error, clearError }}>
      {children}
    </AuthContext.Provider>
  );
};
