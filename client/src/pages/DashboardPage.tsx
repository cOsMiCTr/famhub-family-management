import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Link } from 'react-router-dom';
import { 
  CurrencyDollarIcon, 
  PlusIcon, 
  DocumentTextIcon,
  ChartBarIcon,
  ArrowUpIcon,
  ArrowDownIcon
} from '@heroicons/react/24/outline';

interface DashboardData {
  summary: {
    total_assets_main_currency: number;
    main_currency: string;
    currency_breakdown: Array<{
      currency: string;
      amount: number;
      converted_amount: number;
      count: number;
    }>;
    quick_stats: {
      income_entries: number;
      expense_entries: number;
      active_contracts: number;
    };
  };
  recent_income: Array<{
    id: number;
    amount: number;
    currency: string;
    description: string;
    date: string;
    category_name_en: string;
  }>;
  upcoming_renewals: Array<{
    id: number;
    title: string;
    renewal_date: string;
    category_name_en: string;
  }>;
}

const DashboardPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiService.getDashboardSummary();
      setData(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'GOLD' ? 'USD' : currency,
      minimumFractionDigits: 2,
    });
    return formatter.format(amount) + (currency === 'GOLD' ? ' (Gold)' : '');
  };

  const getCategoryName = (category: any) => {
    const lang = user?.preferred_language || 'en';
    switch (lang) {
      case 'de': return category.category_name_de;
      case 'tr': return category.category_name_tr;
      default: return category.category_name_en;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome to your family management dashboard
          </p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
          <p className="mt-1 text-sm text-gray-600">
            Welcome to your family management dashboard
          </p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Welcome to your family management dashboard
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Assets */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-primary-500 rounded-md flex items-center justify-center">
                  <CurrencyDollarIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('dashboard.totalAssets')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data ? formatCurrency(data.summary.total_assets_main_currency, data.summary.main_currency) : 'N/A'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Income Entries */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <ArrowUpIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Income Entries
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.summary.quick_stats.income_entries || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Expense Entries */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <ArrowDownIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Expense Entries
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.summary.quick_stats.expense_entries || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Active Contracts */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                  <DocumentTextIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {t('dashboard.activeContracts')}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {data?.summary.quick_stats.active_contracts || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Currency Breakdown */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
              {t('dashboard.currencyBreakdown')}
            </h3>
            {data?.summary.currency_breakdown && data.summary.currency_breakdown.length > 0 ? (
              <div className="space-y-3">
                {data.summary.currency_breakdown.map((currency, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-primary-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-gray-900">
                        {currency.currency}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(currency.converted_amount, data.summary.main_currency)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatCurrency(currency.amount, currency.currency)} ({currency.count} entries)
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No assets found</p>
            )}
          </div>
        </div>

        {/* Recent Income */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                {t('dashboard.recentIncome')}
              </h3>
              <Link
                to="/assets"
                className="text-sm text-primary-600 hover:text-primary-500"
              >
                View all
              </Link>
            </div>
            {data?.recent_income && data.recent_income.length > 0 ? (
              <div className="space-y-3">
                {data.recent_income.slice(0, 5).map((income) => (
                  <div key={income.id} className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {income.description || 'No description'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {getCategoryName(income)} • {new Date(income.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-green-600">
                        +{formatCurrency(income.amount, income.currency)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-gray-500 text-sm mb-4">No recent income entries</p>
                <Link
                  to="/assets"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
                >
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Income
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Link
              to="/assets"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-primary-50 text-primary-700 ring-4 ring-white">
                  <CurrencyDollarIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Manage Assets
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Add, edit, and track your income and expenses
                </p>
              </div>
            </Link>

            <Link
              to="/contracts"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-yellow-50 text-yellow-700 ring-4 ring-white">
                  <DocumentTextIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Contracts
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Manage family contracts and renewals
                </p>
              </div>
            </Link>

            <Link
              to="/settings"
              className="relative group bg-white p-6 focus-within:ring-2 focus-within:ring-inset focus-within:ring-primary-500 rounded-lg border border-gray-300 hover:border-gray-400"
            >
              <div>
                <span className="rounded-lg inline-flex p-3 bg-gray-50 text-gray-700 ring-4 ring-white">
                  <ChartBarIcon className="h-6 w-6" />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-lg font-medium">
                  <span className="absolute inset-0" aria-hidden="true" />
                  Settings
                </h3>
                <p className="mt-2 text-sm text-gray-500">
                  Configure your preferences and household
                </p>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
