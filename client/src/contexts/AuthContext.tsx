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
  login: (email: string, password: string, twoFactorCode?: string) => Promise<any>;
  logout: () => void;
  completeRegistration: (data: any) => Promise<void>;
  updateUser: (userData: Partial<User>) => void;
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
    const sessionStartTime = sessionStorage.getItem('sessionStartTime');

    // Check if this is a new browser session (no sessionStartTime)
    if (!sessionStartTime) {
      // Clear any existing auth data on new browser session
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsLoading(false);
      return;
    }

    if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null' && storedUser.trim() !== '') {
      try {
        const userData = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(userData);
        
        // Apply saved language preference
        if (userData.preferred_language && userData.preferred_language !== i18n.language) {
          i18n.changeLanguage(userData.preferred_language);
        }
      } catch (error) {
        console.error('Error parsing stored user:', error);
        // Clear corrupted data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
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

  const login = async (email: string, password: string, twoFactorCode?: string) => {
    try {
      const response = await apiService.login(email, password, twoFactorCode);
      
      // Check if 2FA is required
      if (response.requires2FA || response.twoFactorRequired) {
        return response; // Return early, LoginPage will handle 2FA prompt
      }
      
      const { token: newToken, user: userData, must_change_password } = response;
      
      // Validate response has required data
      if (!newToken || !userData) {
        throw new Error('Invalid login response');
      }
      
      // Only set authenticated state if password change is NOT required
      // If password change is required, LoginPage will handle it with a modal
      if (!must_change_password) {
        setToken(newToken);
        setUser(userData);
        
        localStorage.setItem('token', newToken);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Set session start time for browser session tracking
        sessionStorage.setItem('sessionStartTime', Date.now().toString());
        
        // Apply user's language preference
        if (userData && userData.preferred_language && userData.preferred_language !== i18n.language) {
          i18n.changeLanguage(userData.preferred_language);
        }
      } else {
        // Store token temporarily for password change request
        // But don't set user/token in state to avoid triggering authentication
        localStorage.setItem('temp_token', newToken);
        console.log('Password change required - not setting authenticated state');
      }
      
      return response;
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
    sessionStorage.removeItem('sessionStartTime');
    
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

  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData };
      setUser(updatedUser);
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    logout,
    completeRegistration,
    updateUser,
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
