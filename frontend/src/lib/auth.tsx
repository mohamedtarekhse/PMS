import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

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

const MOCK_USER: User = {
  id: 1,
  email: 'mohamedtarekhse@gmail.com',
  username: 'manager',
  full_name: 'Mohamed Tarek',
  role: 'manager',
  preferred_lang: 'en',
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>('mock-token');
  const [user, setUser] = useState<User | null>(MOCK_USER);

  useEffect(() => {
    if (user?.preferred_lang) {
      const dir = user.preferred_lang === 'ar' ? 'rtl' : 'ltr';
      document.documentElement.dir = dir;
      document.documentElement.lang = user.preferred_lang;
    }
  }, [user]);

  const isAuthenticated = true;
  const isTechnician = user?.role === 'technician';
  const isCoordinator = user?.role === 'coordinator';
  const isManager = user?.role === 'manager';

  const login = useCallback(async () => {}, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const register = useCallback(async () => {}, []);

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
