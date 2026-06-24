import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api from './api';

interface User {
  id: number;
  email: string;
  username: string;
  full_name: string;
  role: 'technician' | 'coordinator' | 'manager';
  preferred_lang: 'en' | 'ar';
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isTechnician: boolean;
  isCoordinator: boolean;
  isManager: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (token: string, username: string, password: string, fullName: string, preferredLang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

function loadUser(): User | null {
  try {
    const stored = localStorage.getItem('pms_user');
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('pms_token'));
  const [user, setUser] = useState<User | null>(() => loadUser());

  useEffect(() => {
    if (user?.preferred_lang) {
      localStorage.setItem('pms_lang', user.preferred_lang);
      const dir = user.preferred_lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = user.preferred_lang;
    }
  }, [user]);

  const isAuthenticated = !!token && !!user;
  const isTechnician = user?.role === 'technician';
  const isCoordinator = user?.role === 'coordinator';
  const isManager = user?.role === 'manager';

  const login = useCallback(async (email: string, password: string) => {
    const data = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
    localStorage.setItem('pms_token', data.token);
    localStorage.setItem('pms_user', JSON.stringify(data.user));
    if (data.user.preferred_lang) {
      localStorage.setItem('pms_lang', data.user.preferred_lang);
    }
    setToken(data.token);
    setUser(data.user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('pms_token');
    localStorage.removeItem('pms_user');
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async (
    inviteToken: string,
    username: string,
    password: string,
    fullName: string,
    preferredLang: string
  ) => {
    const data = await api.post<{ token: string; user: User }>('/auth/register', {
      token: inviteToken,
      username,
      password,
      full_name: fullName,
      preferred_lang: preferredLang,
    });
    localStorage.setItem('pms_token', data.token);
    localStorage.setItem('pms_user', JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }, []);

  return (
    <AuthContext.Provider value={{
      token, user, isAuthenticated, isTechnician, isCoordinator, isManager,
      login, logout, register,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
