import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencies } from '../contexts/CurrencyContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import ExchangeRateConfigModal from '../components/ExchangeRateConfigModal';
import { formatCurrency } from '../utils/formatters';
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
  EyeSlashIcon
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
  
  // New state for currency conversion features
  const [showConversions, setShowConversions] = useState(false);
  const [selectedExchangeRates, setSelectedExchangeRates] = useState<string[]>(['USD', 'GBP', 'TRY']);
  const [showRateConfig, setShowRateConfig] = useState(false);
  const [tempConversionCurrency, setTempConversionCurrency] = useState<string | null>(null);
  const [lastUpdateHighlight, setLastUpdateHighlight] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    
    // Load user preferences from localStorage
    const savedExchangeRates = localStorage.getItem('dashboard_exchange_rates');
    const savedShowConversions = localStorage.getItem('dashboard_show_conversions');
    
    if (savedExchangeRates) {
      setSelectedExchangeRates(JSON.parse(savedExchangeRates));
    }
    
    if (savedShowConversions) {
      setShowConversions(JSON.parse(savedShowConversions));
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch dashboard summary from API
      const response = await apiService.get('/dashboard/summary');
      const dashboardData = response.data;
      
      console.log('📊 Dashboard data received:', {
        exchangeRatesCount: dashboardData.exchange_rates?.length || 0,
        rates: dashboardData.exchange_rates?.slice(0, 3)
      });
      
      setStats({
        totalAssets: dashboardData.summary?.total_assets_main_currency || 0,
        totalIncome: dashboardData.summary?.total_income_main_currency || 0,
        monthlyIncome: dashboardData.summary?.quick_stats?.income_entries || 0,
        activeContracts: dashboardData.summary?.quick_stats?.active_contracts || 0,
        totalMembers: dashboardData.summary?.member_count || 0,
        currency: dashboardData.summary?.main_currency || 'USD'
      });
      
      setExchangeRates(dashboardData.exchange_rates || []);
      setLastUpdated(dashboardData.timestamp || new Date().toISOString());
      console.log('✅ Updated exchange rates:', dashboardData.exchange_rates?.length || 0);
    } catch (err: any) {
      console.error('Dashboard fetch error:', err);
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
    try {
      setIsSyncing(true);
      setError(null);
      
      const response = await apiService.syncExchangeRates();
      
      if (response.success) {
        console.log('✅ Sync successful, fetching updated rates...');
        // Refresh dashboard data to get updated rates
        await fetchDashboardData();
        setLastUpdated(new Date().toISOString());
        
        // Trigger highlight animation
        setLastUpdateHighlight(true);
        setTimeout(() => {
          setLastUpdateHighlight(false);
        }, 3000);
      } else {
        console.error('❌ Sync failed:', response.message);
        setError(response.message || 'Failed to sync exchange rates');
      }
    } catch (err: any) {
      console.error('Sync error:', err);
      setError('Failed to sync exchange rates');
    } finally {
      setIsSyncing(false);
    }
  };

  // Helper function to get converted value
  const getConvertedValue = (amount: number, fromCurrency: string, toCurrency: string): string => {
    if (fromCurrency === toCurrency) return '';
    
    const rate = exchangeRates.find(r => 
      r.from_currency === fromCurrency && r.to_currency === toCurrency
    );
    
    if (!rate) return '';
    
    const convertedAmount = amount * rate.rate;
    return formatCurrency(convertedAmount, toCurrency);
  };
  
  // Helper function to get available currencies from exchange rates (all active currencies)
  const getAvailableCurrencies = (): string[] => {
    // Get user's main currency
    const userMainCurrency = stats?.currency || user?.main_currency || 'USD';
    
    // Get all active currencies (including fiat, metal, and crypto) excluding user's main currency
    const activeCurrencyCodes = activeCurrencies
      .filter(c => c.is_active && c.code !== userMainCurrency)
      .map(c => c.code);
    
    // Also include currencies from exchange rates for additional coverage
    const currencies = new Set<string>(activeCurrencyCodes);
    exchangeRates.forEach(rate => {
      if (rate.to_currency && activeCurrencyCodes.includes(rate.to_currency)) {
        currencies.add(rate.to_currency);
      }
    });
    
    return Array.from(currencies).sort();
  };
  
  // Handle exchange rate configuration
  const handleExchangeRateConfig = (selectedCurrencies: string[]) => {
    setSelectedExchangeRates(selectedCurrencies);
    localStorage.setItem('dashboard_exchange_rates', JSON.stringify(selectedCurrencies));
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
      isFinancial: true
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
      isFinancial: true
    },
    {
      title: t('dashboard.activeContracts'),
      value: stats ? (stats.activeContracts?.toString() || '0') : 'Loading...',
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      isFinancial: false
    },
    {
      title: t('dashboard.familyMembers'),
      value: stats ? (stats.totalMembers?.toString() || '0') : 'Loading...',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400',
      isFinancial: false
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeIn">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {t('dashboard.title')}
            </h1>
            <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
              Welcome to your family management dashboard
            </p>
          </div>
          
          {/* Currency Conversion Controls */}
          <div className="flex items-center space-x-4">
            {/* Show/Hide Conversions Toggle */}
            <button
              onClick={toggleConversions}
              className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                showConversions 
                  ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/20' 
                  : 'text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {showConversions ? (
                <>
                  <EyeSlashIcon className="h-4 w-4" />
                  <span>{t('dashboard.hideConversions')}</span>
                </>
              ) : (
                <>
                  <EyeIcon className="h-4 w-4" />
                  <span>{t('dashboard.showConversions')}</span>
                </>
              )}
            </button>
            
            {/* Temporary Currency Conversion Dropdown - Only show when conversions are active */}
            {showConversions && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('dashboard.viewIn')}:
                </label>
                <select
                  value={tempConversionCurrency || ''}
                  onChange={(e) => setTempConversionCurrency(e.target.value || null)}
                  className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('dashboard.convertTo')}</option>
                  {getAvailableCurrencies().map(currency => (
                    <option key={currency} value={currency}>{currency}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-fadeIn">
          <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((card, index) => (
          <div 
            key={index}
            className={`card hover-lift animate-fadeIn ${card.bgColor}`}
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="card-body">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className={`w-12 h-12 ${card.color} rounded-xl flex items-center justify-center shadow-lg`}>
                    <card.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="ml-4 flex-1">
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                    {card.title}
                  </p>
                  <div className="flex items-center mt-1">
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <div>
                        <p className={`text-2xl font-bold ${card.textColor}`}>
                          {card.value}
                        </p>
                        {/* Show converted value if temporary conversion is active */}
                        {tempConversionCurrency && card.convertedValue && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            ≈ {card.convertedValue} ({tempConversionCurrency})
                          </p>
                        )}
                        {/* Show conversion toggle if enabled and no temp conversion */}
                        {showConversions && !tempConversionCurrency && card.isFinancial && (
                          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {t('dashboard.inYourCurrency')}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Activity */}
        <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.4s' }}>
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <CalendarIcon className="h-5 w-5 mr-2 text-blue-500" />
              Recent Activity
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">New income entry added</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">2 hours ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">Contract updated</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">1 day ago</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">New family member added</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">3 days ago</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Exchange Rates */}
        <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <div className="card-header">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                  <ChartBarIcon className="h-5 w-5 mr-2 text-green-500" />
                  {t('dashboard.exchangeRates')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {t('dashboard.basedOn')} {stats?.currency || 'EUR'}
                </p>
                {lastUpdated && (
                  <p className={`text-xs text-gray-400 dark:text-gray-500 mt-1 ${
                    lastUpdateHighlight ? 'highlight-animation' : ''
                  }`}>
                    {t('dashboard.lastUpdated')}: {new Date(lastUpdated).toLocaleString()}
                  </p>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowRateConfig(true)}
                  className="flex items-center space-x-1 px-2 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title={t('dashboard.configureRates')}
                >
                  <Cog6ToothIcon className="h-4 w-4" />
                </button>
                <button
                  onClick={syncExchangeRates}
                  disabled={isSyncing}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? t('dashboard.syncing') : t('dashboard.sync')}</span>
                </button>
              </div>
            </div>
          </div>
          <div className="card-body">
            {isLoading ? (
              <LoadingSpinner size="sm" />
            ) : exchangeRates.length > 0 ? (
              <div className={`grid gap-3 ${
                selectedExchangeRates.length === 3 ? 'grid-cols-3' :
                selectedExchangeRates.length === 4 ? 'grid-cols-2' :
                selectedExchangeRates.length === 5 ? 'grid-cols-3' :
                'grid-cols-2'
              }`}>
                {exchangeRates
                  .filter(rate => {
                    // Only show rates for active currencies
                    const isActive = activeCurrencies.some(c => c.code === rate.to_currency && c.is_active);
                    return isActive && selectedExchangeRates.includes(rate.to_currency);
                  })
                  .map((rate, index) => {
                  const currencyInfo: { [key: string]: { symbol: string; name: string; flag: string; color: string } } = {
                    'USD': { symbol: '$', name: 'US Dollar ($)', flag: '🇺🇸', color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' },
                    'EUR': { symbol: '€', name: 'Euro (€)', flag: '🇪🇺', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' },
                    'GBP': { symbol: '£', name: 'British Pound (£)', flag: '🇬🇧', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700' },
                    'TRY': { symbol: '₺', name: 'Turkish Lira (₺)', flag: '🇹🇷', color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' },
                    'CNY': { symbol: '¥', name: 'Chinese Yuan (¥)', flag: '🇨🇳', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700' },
                    'JPY': { symbol: '¥', name: 'Japanese Yen (¥)', flag: '🇯🇵', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700' },
                    'CAD': { symbol: 'C$', name: 'Canadian Dollar (C$)', flag: '🇨🇦', color: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700' },
                    'AUD': { symbol: 'A$', name: 'Australian Dollar (A$)', flag: '🇦🇺', color: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700' },
                    'CHF': { symbol: 'CHF', name: 'Swiss Franc (CHF)', flag: '🇨🇭', color: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700' },
                    'GOLD': { symbol: 'Au', name: 'Gold (Au)', flag: '🥇', color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' }
                  };
                  
                  const toCurrency = currencyInfo[rate.to_currency] || { 
                    symbol: rate.to_currency, 
                    name: rate.to_currency, 
                    flag: '💱',
                    color: 'bg-gray-100 dark:bg-gray-900/30 border-gray-300 dark:border-gray-700'
                  };
                  
                  return (
                    <div key={index} className={`border-2 ${toCurrency.color} rounded-xl p-4 transition-all hover:scale-105`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-2xl">{toCurrency.flag}</span>
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase">
                          {rate.to_currency}
                        </span>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                          {toCurrency.symbol} {rate.rate.toFixed(2)}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
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
      <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.6s' }}>
        <div className="card-header">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Upcoming Features
          </h3>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Analytics & Reports</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Income vs Expense charts</li>
                <li>• Monthly financial reports</li>
                <li>• Contract renewal alerts</li>
                <li>• Multi-currency conversion tracking</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium text-gray-900 dark:text-white">Advanced Features</h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Automated bill reminders</li>
                <li>• Family budget planning</li>
                <li>• Investment tracking</li>
                <li>• Export financial data</li>
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
