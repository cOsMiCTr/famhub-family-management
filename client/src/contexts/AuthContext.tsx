import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import apiService from '../services/api';
import i18n from '../i18n';

interface User {
  id: number;
  email: string;
  role: string;
  household_id?: number;
  household_name?: string;
  preferred_language: string;
  main_currency: string;
  created_at: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  completeRegistration: (data: any) => Promise<void>;
  isLoading: boolean;
  isAuthenticated: boolean;
  resetInactivityTimer: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const inactivityTimerRef = useRef<number | null>(null);
  const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes in milliseconds

  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    if (user && token) {
      inactivityTimerRef.current = setTimeout(() => {
        console.log('User automatically logged out due to inactivity');
        logout();
      }, INACTIVITY_TIMEOUT);
    }
  };

  const setupActivityListeners = () => {
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const resetTimer = () => {
      resetInactivityTimer();
    };

    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  };

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      const userData = JSON.parse(storedUser);
      setToken(storedToken);
      setUser(userData);
      
      // Apply saved language preference
      if (userData.preferred_language && userData.preferred_language !== i18n.language) {
        i18n.changeLanguage(userData.preferred_language);
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (user && token) {
      resetInactivityTimer();
      const cleanup = setupActivityListeners();
      
      return () => {
        cleanup();
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
      };
    }
  }, [user, token]);

  const login = async (email: string, password: string) => {
    try {
      const response = await apiService.login(email, password);
      
      const { token: newToken, user: userData } = response;
      
      setToken(newToken);
      setUser(userData);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Apply user's language preference
      if (userData.preferred_language && userData.preferred_language !== i18n.language) {
        i18n.changeLanguage(userData.preferred_language);
      }
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    
    apiService.logout().catch(console.error);
  };

  const completeRegistration = async (data: any) => {
    try {
      const response = await apiService.completeRegistration(data);
      
      const { token: newToken, user: userData } = response;
      
      setToken(newToken);
      setUser(userData);
      
      localStorage.setItem('token', newToken);
      localStorage.setItem('user', JSON.stringify(userData));
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    completeRegistration,
    isLoading,
    isAuthenticated: !!user && !!token,
    resetInactivityTimer,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
