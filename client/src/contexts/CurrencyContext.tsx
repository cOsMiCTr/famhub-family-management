import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';

interface Currency {
  id: number;
  code: string;
  name: string;
  name_de?: string;
  name_tr?: string;
  symbol: string;
  currency_type: 'fiat' | 'cryptocurrency' | 'precious_metal';
  is_active: boolean;
  display_order: number;
}

interface CurrencyContextType {
  allCurrencies: Currency[];
  activeCurrencies: Currency[];
  loading: boolean;
  refresh: () => void;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export const CurrencyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [allCurrencies, setAllCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCurrencies = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/currencies', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAllCurrencies(data);
      }
    } catch (error) {
      console.error('Failed to fetch currencies:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const refresh = () => {
    fetchCurrencies();
  };

  const activeCurrencies = allCurrencies.filter(c => c.is_active);

  return (
    <CurrencyContext.Provider value={{
      allCurrencies,
      activeCurrencies,
      loading,
      refresh
    }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrencies = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencies must be used within CurrencyProvider');
  }
  return context.activeCurrencies;
};

export const useAllCurrencies = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useAllCurrencies must be used within CurrencyProvider');
  }
  return context.allCurrencies;
};

export const useCurrencyContext = () => {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrencyContext must be used within CurrencyProvider');
  }
  return context;
};

export const useCurrenciesByType = (type: 'fiat' | 'cryptocurrency' | 'precious_metal') => {
  const activeCurrencies = useCurrencies();
  return activeCurrencies.filter(c => c.currency_type === type);
};

