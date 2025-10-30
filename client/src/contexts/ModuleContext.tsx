import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import apiService from '../services/api';
import { useAuth } from './AuthContext';

interface ModuleActivation {
  id: number;
  user_id: number;
  module_key: string;
  activated_at: string;
  expires_at: string;
  activation_order: number;
  is_active: boolean;
  token_used: number;
}

interface Module {
  module_key: string;
  name: string;
  description: string | null;
  category: 'free' | 'premium';
  display_order: number;
  is_active: boolean;
  metadata: any;
}

interface TokenAccount {
  balance: number;
  totalPurchased: number;
}

interface ModuleContextType {
  userModules: string[];
  activeModules: ModuleActivation[];
  availableModules: Module[];
  tokenAccount: TokenAccount | null;
  hasModule: (moduleKey: string) => boolean;
  isLoading: boolean;
  refreshModules: () => Promise<void>;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

export const useModuleContext = () => {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error('useModuleContext must be used within a ModuleProvider');
  }
  return context;
};

interface ModuleProviderProps {
  children: ReactNode;
}

// Free modules that are always available
const FREE_MODULES = ['dashboard', 'settings', 'family_members'];

export const ModuleProvider: React.FC<ModuleProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [userModules, setUserModules] = useState<string[]>(FREE_MODULES);
  const [activeModules, setActiveModules] = useState<ModuleActivation[]>([]);
  const [availableModules, setAvailableModules] = useState<Module[]>([]);
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchModules = async () => {
    if (!isAuthenticated || !user) {
      // Reset to free modules only if not authenticated
      setUserModules(FREE_MODULES);
      setActiveModules([]);
      setAvailableModules([]);
      setTokenAccount(null);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // Fetch user's modules, active modules, and token account
      const modulesResponse = await apiService.get('/modules');
      
      if (modulesResponse.data) {
        const { modules, activeModules: active, tokenAccount: account } = modulesResponse.data;
        
        // Always include free modules
        const allModules = [...FREE_MODULES, ...(modules || [])];
        setUserModules(allModules);
        setActiveModules(active || []);
        setTokenAccount(account || null);

        // Also fetch available modules list
        try {
          const availableResponse = await apiService.get('/modules/available');
          if (availableResponse.data) {
            setAvailableModules(availableResponse.data || []);
          }
        } catch (error) {
          console.error('Error fetching available modules:', error);
        }
      }
    } catch (error: any) {
      console.error('Error fetching modules:', error);
      // On error, at least set free modules
      setUserModules(FREE_MODULES);
      setActiveModules([]);
      setTokenAccount(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && user) {
      fetchModules();
    } else {
      // Reset when user logs out
      setUserModules(FREE_MODULES);
      setActiveModules([]);
      setAvailableModules([]);
      setTokenAccount(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  const hasModule = (moduleKey: string): boolean => {
    // Free modules always return true
    if (FREE_MODULES.includes(moduleKey)) {
      return true;
    }
    return userModules.includes(moduleKey);
  };

  const refreshModules = async () => {
    await fetchModules();
  };

  return (
    <ModuleContext.Provider
      value={{
        userModules,
        activeModules,
        availableModules,
        tokenAccount,
        hasModule,
        isLoading,
        refreshModules,
      }}
    >
      {children}
    </ModuleContext.Provider>
  );
};

