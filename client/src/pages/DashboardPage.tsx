import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { 
  WalletIcon, 
  ChartBarIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CalendarIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';

interface DashboardStats {
  totalAssets: number;
  monthlyIncome: number;
  activeContracts: number;
  totalMembers: number;
  currency: string;
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Fetch dashboard summary from API
      const response = await apiService.get('/dashboard/summary');
      setStats(response.data);
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

  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'TRY': '₺',
      'GOLD': 'Au'
    };
    
    const symbol = symbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const statsCards = [
    {
      title: t('dashboard.totalAssets'),
      value: stats ? formatCurrency(stats.totalAssets, stats.currency) : 'Loading...',
      icon: WalletIcon,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50 dark:bg-blue-900/20',
      textColor: 'text-blue-600 dark:text-blue-400'
    },
    {
      title: 'Monthly Income',
      value: stats ? formatCurrency(stats.monthlyIncome, stats.currency) : 'Loading...',
      icon: ArrowTrendingUpIcon,
      color: 'bg-green-500',
      bgColor: 'bg-green-50 dark:bg-green-900/20',
      textColor: 'text-green-600 dark:text-green-400'
    },
    {
      title: t('dashboard.activeContracts'),
      value: stats ? stats.activeContracts.toString() : 'Loading...',
      icon: DocumentTextIcon,
      color: 'bg-yellow-500',
      bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400'
    },
    {
      title: 'Family Members',
      value: stats ? stats.totalMembers.toString() : 'Loading...',
      icon: UserGroupIcon,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50 dark:bg-purple-900/20',
      textColor: 'text-purple-600 dark:text-purple-400'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('dashboard.title')}
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Welcome to your family management dashboard
        </p>
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
                      <p className={`text-2xl font-bold ${card.textColor}`}>
                        {card.value}
                      </p>
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

        {/* Quick Stats */}
        <div className="card hover-lift animate-fadeIn" style={{ animationDelay: '0.5s' }}>
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-green-500" />
              Quick Insights
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">This Month's Income</span>
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {stats ? formatCurrency(stats.monthlyIncome, stats.currency) : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Contracts</span>
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {stats ? stats.activeContracts : 'Loading...'}
                </span>
              </div>
              <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Family Members</span>
                <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                  {stats ? stats.totalMembers : 'Loading...'}
                </span>
              </div>
            </div>
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
    </div>
  );
};

export default DashboardPage;
