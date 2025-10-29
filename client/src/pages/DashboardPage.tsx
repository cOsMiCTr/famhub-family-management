import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencies } from '../contexts/CurrencyContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ExchangeRateConfigModal from '../components/ExchangeRateConfigModal';
import { formatCurrency } from '../utils/formatters';
import { formatCurrencyWithSymbol, getCurrencyName } from '../utils/currencyHelpers';
import { 
  WalletIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserGroupIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  Squares2X2Icon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalAssets?: number;
  totalIncome?: number;
  monthlyIncome?: number;
  activeContracts?: number;
  totalMembers?: number;
  currency?: string;
}

interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at?: string;
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const activeCurrencies = useCurrencies();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [activeAssets, setActiveAssets] = useState<any[]>([]);
  
  // New state for currency conversion features
  const [showConversions, setShowConversions] = useState(false);
  const [selectedExchangeRates, setSelectedExchangeRates] = useState<string[]>(['USD', 'GBP', 'TRY']);
  const [showRateConfig, setShowRateConfig] = useState(false);
  const [tempConversionCurrency, setTempConversionCurrency] = useState<string | null>(null);
  const [lastUpdateHighlight, setLastUpdateHighlight] = useState(false);
  const [previousRates, setPreviousRates] = useState<ExchangeRate[]>([]);

  useEffect(() => {
    // Only fetch data if user is authenticated
    if (!user) {
      return;
    }
    
    // Load last sync timestamp from localStorage first
      const storedLastSync = localStorage.getItem('exchange_rates_last_sync');
      if (storedLastSync) {
        setLastUpdated(storedLastSync);
      }
    
    fetchDashboardData();
    
    // Load user preferences from localStorage
    const savedExchangeRates = localStorage.getItem('dashboard_exchange_rates');
    const savedShowConversions = localStorage.getItem('dashboard_show_conversions');
    
    if (savedExchangeRates) {
      const parsed = JSON.parse(savedExchangeRates);
      
      // Filter out the user's main currency from saved selection
      const userMainCurrency = user?.main_currency || 'USD';
      const filtered = parsed.filter((c: string) => c !== userMainCurrency);
      
      setSelectedExchangeRates(filtered);
    }
    
    if (savedShowConversions) {
      setShowConversions(JSON.parse(savedShowConversions));
    }
  }, [user]);

  const fetchActiveAssets = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assets?limit=5&status=active', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setActiveAssets(data.assets || []);
      }
    } catch (err) {
      console.error('Failed to fetch active assets:', err);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch dashboard summary from API (only reads from database, no API calls)
      const response = await apiService.get('/dashboard/summary');
      const dashboardData = response.data;
      
      setStats({
        totalAssets: dashboardData.summary?.total_assets_main_currency || 0,
        totalIncome: dashboardData.summary?.total_income_main_currency || 0,
        monthlyIncome: dashboardData.summary?.quick_stats?.monthly_income || 0,
        activeContracts: dashboardData.summary?.quick_stats?.active_contracts || 0,
        totalMembers: dashboardData.summary?.member_count || 0,
        currency: dashboardData.summary?.main_currency || 'USD'
      });
      
      // Store previous rates for comparison
      setPreviousRates(exchangeRates);
      
      setExchangeRates(dashboardData.exchange_rates || []);
      
      // Don't update lastUpdated here unless it's empty - it should only change on manual sync
      if (!lastUpdated) {
        const storedLastSync = localStorage.getItem('exchange_rates_last_sync');
        setLastUpdated(storedLastSync || dashboardData.timestamp || new Date().toISOString());
      }
      
      // Fetch active assets
      await fetchActiveAssets();
    } catch (err: any) {
      setError('Failed to load dashboard data');
      
      // Set mock data for demonstration
      setStats({
        totalAssets: 125000,
        monthlyIncome: 8500,
        activeContracts: 12,
        totalMembers: 4,
        currency: user?.main_currency || 'USD'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const syncExchangeRates = async () => {
    // Prevent double-click/double-call
    if (isSyncing) {
      return;
    }
    
    try {
      setIsSyncing(true);
      setError(null);
      
      // Trigger API call to sync rates
      const response = await apiService.syncExchangeRates();
      
      if (response.success) {
        // Store sync timestamp in localStorage
        const syncTimestamp = new Date().toISOString();
        localStorage.setItem('exchange_rates_last_sync', syncTimestamp);
        
        // Refresh dashboard data to get updated rates
        await fetchDashboardData();
        
        setLastUpdated(syncTimestamp);
        
        // Trigger highlight animation
        setLastUpdateHighlight(true);
        setTimeout(() => {
          setLastUpdateHighlight(false);
        }, 3000);
      } else {
        setError(response.message || 'Failed to sync exchange rates');
      }
    } catch (err: any) {
      setError('Failed to sync exchange rates');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper function to get converted value
  const getConvertedValue = (amount: number, fromCurrency: string, toCurrency: string): string => {
    if (fromCurrency === toCurrency) return '';
    
    // First try direct conversion
    let rate = exchangeRates.find(r => 
      r.from_currency === fromCurrency && r.to_currency === toCurrency
    );
    
    if (rate) {
      const convertedAmount = amount * rate.rate;
      return formatCurrency(convertedAmount, toCurrency);
    }
    
    // If no direct rate, try through USD as intermediate
    const toUSDRate = exchangeRates.find(r => 
      r.from_currency === fromCurrency && r.to_currency === 'USD'
    );
    const fromUSDRate = exchangeRates.find(r => 
      r.from_currency === 'USD' && r.to_currency === toCurrency
    );
    
    if (toUSDRate && fromUSDRate) {
      const usdAmount = amount * toUSDRate.rate;
      const convertedAmount = usdAmount * fromUSDRate.rate;
      return formatCurrency(convertedAmount, toCurrency);
    }
    
    return '';
  };
  
  // Helper function to get available currencies (all types: fiat, crypto, metals) excluding user's main currency
  const getAvailableCurrencies = (): string[] => {
    // Get user's main currency (user.main_currency takes priority)
    const userMainCurrency = user?.main_currency || stats?.currency || 'USD';
    
    // Get all active currencies (fiat, crypto, metals) excluding user's main currency
    const availableCurrencies = activeCurrencies
      .filter(c => c.is_active && c.code !== userMainCurrency)
      .map(c => c.code);
    
    return availableCurrencies.sort();
  };
  
  // Handle exchange rate configuration
  const handleExchangeRateConfig = (selectedCurrencies: string[]) => {
    // Filter out user's main currency before saving
    const userMainCurrency = user?.main_currency || stats?.currency || 'USD';
    const filtered = selectedCurrencies.filter(c => c !== userMainCurrency);
    
    setSelectedExchangeRates(filtered);
    localStorage.setItem('dashboard_exchange_rates', JSON.stringify(filtered));
  };
  
  // Handle conversion toggle
  const toggleConversions = () => {
    const newValue = !showConversions;
    setShowConversions(newValue);
    localStorage.setItem('dashboard_show_conversions', JSON.stringify(newValue));
    
    // Clear conversions when hiding
    if (!newValue) {
      setTempConversionCurrency(null);
    }
  };
  
  
  const statsCards = [
    {
      title: t('dashboard.totalAssets'),
      value: stats ? formatCurrency(stats.totalAssets || 0, stats.currency || 'USD') : 'Loading...',
      convertedValue: tempConversionCurrency && stats ? 
        getConvertedValue(stats.totalAssets || 0, stats.currency || 'USD', tempConversionCurrency) : '',
      icon: WalletIcon,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400',
      isFinancial: true,
      linkTo: '/assets',
      showArrow: true
    },
    {
      title: t('dashboard.netIncome'),
      value: stats ? formatCurrency(stats.totalIncome || 0, stats.currency || 'USD') : 'Loading...',
      convertedValue: tempConversionCurrency && stats ? 
        getConvertedValue(stats.totalIncome || 0, stats.currency || 'USD', tempConversionCurrency) : '',
      icon: CurrencyDollarIcon,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400',
      isFinancial: true
    },
    {
      title: t('dashboard.monthlyIncome'),
      value: stats ? formatCurrency(stats.monthlyIncome || 0, stats.currency || 'USD') : 'Loading...',
      convertedValue: tempConversionCurrency && stats ? 
        getConvertedValue(stats.monthlyIncome || 0, stats.currency || 'USD', tempConversionCurrency) : '',
      icon: ArrowTrendingUpIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      isFinancial: true,
      linkTo: '/income',
      showArrow: true
    },
    {
      title: t('dashboard.activeContracts'),
      value: stats ? (stats.activeContracts?.toString() || '0') : 'Loading...',
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      isFinancial: false,
      linkTo: '/contracts',
      showArrow: true
    },
    {
      title: t('dashboard.familyMembers'),
      value: stats ? (stats.totalMembers?.toString() || '0') : 'Loading...',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      isFinancial: false,
      linkTo: '/family-members',
      showArrow: true
    },
    {
      title: 'Active Assets',
      value: activeAssets.length.toString(),
      icon: Squares2X2Icon,
      color: 'bg-indigo-500',
      bgColor: 'bg-indigo-50 dark:bg-indigo-900/20',
      textColor: 'text-indigo-600 dark:text-indigo-400',
      isFinancial: false,
      linkTo: '/assets',
      showArrow: true
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeIn">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 dark:text-white break-words">
              {t('dashboard.title')}
            </h1>
            <p className="mt-2 text-sm sm:text-base lg:text-lg text-gray-600 dark:text-gray-300 break-words">
              Welcome to your family management dashboard
            </p>
          </div>
          
          {/* Currency Conversion Controls */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-4 w-full sm:w-auto">
            {/* Show/Hide Conversions Toggle */}
            <button
              onClick={toggleConversions}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium rounded-lg transition-colors min-h-[44px] ${
                showConversions 
                  ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20' 
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {showConversions ? (
                <>
                  <EyeSlashIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('dashboard.hideConversions')}</span>
                  <span className="sm:hidden">Hide</span>
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{t('dashboard.showConversions')}</span>
                  <span className="sm:hidden">Show</span>
                </>
              )}
            </button>
            
            {/* Temporary Currency Conversion Dropdown - Only show when conversions are active */}
            {showConversions && (
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                <label className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
                  {t('dashboard.viewIn')}:
                </label>
                <select
                  value={tempConversionCurrency || ''}
                  onChange={(e) => setTempConversionCurrency(e.target.value || null)}
                  className="w-full sm:w-auto px-3 py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent min-h-[44px]"
                >
                  <option value="">{t('dashboard.convertTo')}</option>
                  {getAvailableCurrencies().map(currency => {
                    const currencyObj = activeCurrencies.find(c => c.code === currency);
                    const displayName = currencyObj ? formatCurrencyWithSymbol(currency, currencyObj.name) : currency;
                    return (
                      <option key={currency} value={currency}>{displayName}</option>
                    );
                  })}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 sm:p-4 animate-fadeIn">
          <p className="text-red-600 dark:text-red-400 text-xs sm:text-sm break-words">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 wide:grid-cols-6">
        {statsCards.map((card, index) => (
          <Link
            key={index}
            to={card.linkTo || '#'}
            className={`card hover-lift animate-fadeIn ${card.bgColor} ${!card.linkTo ? 'cursor-default' : ''}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <card.icon className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  </div>
                </div>
                <div className="ml-2 sm:ml-4 flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      {card.title}
                    </p>
                    {card.showArrow && card.linkTo && (
                      <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center mt-1">
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold ${card.textColor} break-words leading-tight`} style={{ fontSize: 'clamp(0.75rem, 2.5vw + 0.5rem, 1.5rem)' }}>
                          {card.value}
                        </p>
                        {/* Show converted value if temporary conversion is active */}
                        {tempConversionCurrency && card.convertedValue && (
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words leading-tight">
                            ≈ {card.convertedValue} ({tempConversionCurrency})
                          </p>
                        )}
                        {/* Show conversion toggle if enabled and no temp conversion */}
                        {showConversions && !tempConversionCurrency && card.isFinancial && (
                          <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1 break-words leading-tight">
                            {t('dashboard.inYourCurrency')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <CalendarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-500 flex-shrink-0" />
              <span className="break-words">Recent Activity</span>
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">New income entry added</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">Contract updated</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-2 sm:space-x-3 p-2 sm:p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white break-words">New family member added</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Rates */}
        <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <div className="card-header">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <ChartBarIcon className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-green-500 flex-shrink-0" />
                  <span className="break-words">{t('dashboard.exchangeRates')}</span>
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-words">
                  {t('dashboard.basedOn')} {stats?.currency || 'EUR'}
                </p>
                {lastUpdated && (
                  <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 break-words ${
                    lastUpdateHighlight ? 'highlight-animation' : ''
                  }`}>
                    {t('dashboard.lastUpdated')}: {new Date(lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <button
                  onClick={() => setShowRateConfig(true)}
                  className="flex items-center justify-center space-x-1 px-2 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
                  title={t('dashboard.configureRates')}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!isSyncing) {
                        syncExchangeRates();
                      }
                    }}
                    disabled={isSyncing}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  <ArrowPathIcon className={`h-4 w-4 flex-shrink-0 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSyncing ? t('dashboard.syncing') : t('dashboard.sync')}</span>
                  <span className="sm:hidden">{isSyncing ? '...' : 'Sync'}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : exchangeRates.length > 0 ? (
              <div className={`grid gap-2 sm:gap-3 ${
                selectedExchangeRates.length === 3 ? 'grid-cols-1 sm:grid-cols-3' :
                selectedExchangeRates.length === 4 ? 'grid-cols-1 sm:grid-cols-2' :
                selectedExchangeRates.length === 5 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                selectedExchangeRates.length === 6 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' :
                'grid-cols-1 sm:grid-cols-2'
              }`}>
                {(() => {
                  // Use user.main_currency first, fallback to stats.currency if not available
                  const userMainCurrency = user?.main_currency || stats?.currency || 'USD';
                  const filteredRates = exchangeRates.filter(rate => {
                    // If activeCurrencies is empty, skip the isActive check
                    const isActive = activeCurrencies.length === 0 ? true : activeCurrencies.some(c => c.code === rate.to_currency && c.is_active);
                    const isSelected = selectedExchangeRates.includes(rate.to_currency);
                    const matchesMain = rate.from_currency === userMainCurrency;
                    
                    return isActive && isSelected && matchesMain;
                  });
                  
                  return filteredRates;
                })()
                  .map((rate, index) => {
                  const currencyInfo: { [key: string]: { symbol: string; name: string; flag: string; color: string } } = {
                    // Fiat
                    'USD': { symbol: '$', name: 'US Dollar ($)', flag: '🇺🇸', color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' },
                    'EUR': { symbol: '€', name: 'Euro (€)', flag: '🇪🇺', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' },
                    'GBP': { symbol: '£', name: 'British Pound (£)', flag: '🇬🇧', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700' },
                    'TRY': { symbol: '₺', name: 'Turkish Lira (₺)', flag: '🇹🇷', color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' },
                    'CNY': { symbol: '¥', name: 'Chinese Yuan (¥)', flag: '🇨🇳', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700' },
                    'JPY': { symbol: '¥', name: 'Japanese Yen (¥)', flag: '🇯🇵', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700' },
                    'CAD': { symbol: 'C$', name: 'Canadian Dollar (C$)', flag: '🇨🇦', color: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700' },
                    'AUD': { symbol: 'A$', name: 'Australian Dollar (A$)', flag: '🇦🇺', color: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700' },
                    'CHF': { symbol: 'CHF', name: 'Swiss Franc (CHF)', flag: '🇨🇭', color: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700' },
                    // Metals
                    'GOLD': { symbol: 'Au', name: 'Gold (Au)', flag: '🥇', color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' },
                    'SILVER': { symbol: 'Ag', name: 'Silver (Ag)', flag: '🥈', color: 'bg-slate-100 dark:bg-slate-900/30 border-slate-300 dark:border-slate-700' },
                    'PLATINUM': { symbol: 'Pt', name: 'Platinum (Pt)', flag: '💎', color: 'bg-sky-100 dark:bg-sky-900/30 border-sky-300 dark:border-sky-700' },
                    'PALLADIUM': { symbol: 'Pd', name: 'Palladium (Pd)', flag: '🔷', color: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700' },
                    // Cryptocurrencies
                    'BTC': { symbol: '₿', name: 'Bitcoin (₿)', flag: '₿', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700' },
                    'ETH': { symbol: 'Ξ', name: 'Ethereum (Ξ)', flag: 'Ξ', color: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700' },
                    'LTC': { symbol: 'Ł', name: 'Litecoin (Ł)', flag: 'Ł', color: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700' },
                    'XRP': { symbol: 'XRP', name: 'Ripple (XRP)', flag: '💧', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' },
                    'BNB': { symbol: 'BNB', name: 'Binance Coin', flag: '🔶', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700' },
                    'ADA': { symbol: '₳', name: 'Cardano (₳)', flag: '🔵', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' },
                    'SOL': { symbol: '◎', name: 'Solana (◎)', flag: '🟣', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700' },
                    'DOT': { symbol: '●', name: 'Polkadot (●)', flag: '🔴', color: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700' },
                    'MATIC': { symbol: 'POL', name: 'Polygon', flag: '🔷', color: 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700' },
                    'AVAX': { symbol: 'AVAX', name: 'Avalanche', flag: '🔴', color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' },
                    'LINK': { symbol: 'LINK', name: 'Chainlink', flag: '🔗', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' },
                    'UNI': { symbol: 'UNI', name: 'Uniswap', flag: '🌈', color: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700' }
                  };
                  
                  const toCurrency = currencyInfo[rate.to_currency] || { 
                    symbol: rate.to_currency, 
                    name: rate.to_currency, 
                    flag: '💱',
                    color: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700'
                  };
                  
                  return (
                    <div key={index} className={`border-2 ${toCurrency.color} rounded-xl p-3 sm:p-4 transition-all hover:scale-105`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white truncate">
                            {toCurrency.name}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400 uppercase truncate">
                            {rate.to_currency}
                          </div>
                        </div>
                      </div>
                      <div className="text-center mt-3">
                        <div className="text-xs sm:text-sm md:text-base lg:text-lg xl:text-xl font-bold text-gray-900 dark:text-white mb-1 break-words leading-tight" style={{ fontSize: 'clamp(0.75rem, 2vw + 0.5rem, 1.25rem)' }}>
                          <span className="break-all">{rate.rate.toFixed(4)}</span> <span className="whitespace-nowrap">{toCurrency.symbol}</span>
                          {/* Show visual indicator if rate changed */}
                          {previousRates.find(pr => pr.from_currency === rate.from_currency && pr.to_currency === rate.to_currency && Math.abs(pr.rate - rate.rate) > 0.00000001) && (
                            <span className="ml-1 sm:ml-2 text-green-500 animate-pulse inline-block">📈</span>
                          )}
                        </div>
                        <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 break-words leading-tight">
                          {t('dashboard.perUnit')} {stats?.currency || 'EUR'}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                {t('dashboard.noExchangeRates')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Coming Soon Features */}
      <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.7s' }}>
        <div className="card-header">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
            Upcoming Features
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-words">Analytics & Reports</h4>
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li className="break-words">• Income vs Expense charts</li>
                <li className="break-words">• Monthly financial reports</li>
                <li className="break-words">• Contract renewal alerts</li>
                <li className="break-words">• Multi-currency conversion tracking</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm sm:text-base font-medium text-gray-900 dark:text-white break-words">Advanced Features</h4>
              <ul className="text-xs sm:text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li className="break-words">• Automated bill reminders</li>
                <li className="break-words">• Family budget planning</li>
                <li className="break-words">• Investment tracking</li>
                <li className="break-words">• Export financial data</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      
      {/* Exchange Rate Configuration Modal */}
      <ExchangeRateConfigModal
        isOpen={showRateConfig}
        onClose={() => setShowRateConfig(false)}
        onSave={handleExchangeRateConfig}
        availableCurrencies={getAvailableCurrencies()}
        currentSelection={selectedExchangeRates}
      />
    </div>
  );
};

export default DashboardPage;
