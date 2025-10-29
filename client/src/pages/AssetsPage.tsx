import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon, 
  EyeIcon, 
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  PhotoIcon,
  ChartBarIcon,
  ChartPieIcon,
  CurrencyDollarIcon,
  BanknotesIcon,
  TruckIcon,
  SparklesIcon,
  CalendarIcon,
  MapIcon,
  MapPinIcon,
  UserIcon,
  TagIcon,
  DocumentTextIcon,
  CubeTransparentIcon,
  HomeIcon,
  CheckCircleIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import type { Asset, AssetCategory, HouseholdMember } from '../utils/assetUtils';
import { formatCurrency, calculateROI, getCategoryName, getStatusColor, getOwnershipColor, filterAssets } from '../utils/assetUtils';
import { formatCurrencyValue } from '../utils/currencyHelpers';
import AddEditAssetModal from '../components/AddEditAssetModal';
import ValuationHistoryModal from '../components/ValuationHistoryModal';
import PhotoUploadModal from '../components/PhotoUploadModal';
import AddEditCategoryModal from '../components/AddEditCategoryModal';

interface AssetSummary {
  total_assets: number;
  total_value_main_currency: number;
  main_currency: string;
  average_roi: number;
  assets_with_roi: number;
}

interface ExchangeRate {
  from_currency: string;
  to_currency: string;
  rate: number;
  updated_at?: string;
}

const AssetsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Helper to get icon component from icon name
  const getCategoryIcon = (iconName: string | undefined) => {
    // Comprehensive mapping for all icons
    const iconMap: {[key: string]: React.ComponentType<any>} = {
      'HomeIcon': HomeIcon,
      'CubeTransparentIcon': CubeTransparentIcon,
      'TagIcon': TagIcon,
      'DocumentTextIcon': DocumentTextIcon,
      'CurrencyDollarIcon': CurrencyDollarIcon,
      'BanknotesIcon': BanknotesIcon,
      'ChartBarIcon': ChartBarIcon,
      'ChartPieIcon': ChartPieIcon,
      'TruckIcon': TruckIcon,
      'SparklesIcon': SparklesIcon,
      'BuildingOfficeIcon': HomeIcon, // Using HomeIcon as fallback
      'BuildingOffice2Icon': HomeIcon, // Using HomeIcon as fallback
      'BriefcaseIcon': HomeIcon, // Using HomeIcon as fallback
      'ComputerDesktopIcon': HomeIcon, // Using HomeIcon as fallback
      'DevicePhoneMobileIcon': HomeIcon, // Using HomeIcon as fallback
      'CameraIcon': HomeIcon, // Using HomeIcon as fallback
      'MusicalNoteIcon': HomeIcon, // Using HomeIcon as fallback
      'BookOpenIcon': HomeIcon, // Using HomeIcon as fallback
      'AcademicCapIcon': HomeIcon, // Using HomeIcon as fallback
      'HeartIcon': HomeIcon, // Using HomeIcon as fallback
      'GiftIcon': HomeIcon, // Using HomeIcon as fallback
      'StarIcon': HomeIcon, // Using HomeIcon as fallback
      'FireIcon': HomeIcon, // Using HomeIcon as fallback
      'BoltIcon': HomeIcon, // Using HomeIcon as fallback
      'SunIcon': HomeIcon, // Using HomeIcon as fallback
      'MoonIcon': HomeIcon, // Using HomeIcon as fallback
      'GlobeAltIcon': HomeIcon, // Using HomeIcon as fallback
      'MapIcon': MapIcon,
      'ClockIcon': HomeIcon, // Using HomeIcon as fallback
      'CalendarIcon': CalendarIcon,
      'UserIcon': UserIcon,
      'UsersIcon': UserIcon, // Using UserIcon as fallback
      'ShieldCheckIcon': HomeIcon, // Using HomeIcon as fallback
      'PaintBrushIcon': HomeIcon, // Using HomeIcon as fallback
      'CreditCardIcon': HomeIcon, // Using HomeIcon as fallback
      'ReceiptPercentIcon': HomeIcon, // Using HomeIcon as fallback
      'CalculatorIcon': HomeIcon, // Using HomeIcon as fallback
      'PlusIcon': HomeIcon, // Using HomeIcon as fallback
      'MinusIcon': HomeIcon, // Using HomeIcon as fallback
      'CheckIcon': HomeIcon, // Using HomeIcon as fallback
      'XCircleIcon': HomeIcon, // Using HomeIcon as fallback
      'home': HomeIcon,
      'home-modern': HomeIcon,
    };
    
    if (!iconName) return TagIcon;
    return iconMap[iconName] || TagIcon;
  };
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRate[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedMember, setSelectedMember] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [householdView, setHouseholdView] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showValuationModal, setShowValuationModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  // Fetch data
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(selectedCategory && { category_id: selectedCategory }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedCurrency && { currency: selectedCurrency }),
        ...(householdView && { household_view: 'true' })
      });

      const response = await fetch(`/api/assets?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(t('assets.failedToFetch'));
      
      const data = await response.json();
      setAssets(data.assets || []);
      setTotalPages(data.pagination?.pages || 1);
      setTotalAssets(data.pagination?.total || 0);
    } catch (err) {
      console.error('❌ Error fetching assets:', err);
      setError(err instanceof Error ? err.message : t('assets.failedToFetch'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/assets/categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(t('assets.failedToFetchCategories'));
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/household-members', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(t('assets.failedToFetchMembers'));
      
      const data = await response.json();
      setMembers(Array.isArray(data) ? data : data.members || []);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams({
        ...(householdView && { household_view: 'true' })
      });
      
      const response = await fetch(`/api/assets/summary?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error(t('assets.failedToFetchSummary'));
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const fetchExchangeRates = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/exchange', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!response.ok) throw new Error('Failed to fetch exchange rates');
      
      const data = await response.json();
      setExchangeRates(data.rates || []);
    } catch (err) {
      console.error('Failed to fetch exchange rates:', err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, [householdView]);

  useEffect(() => {
    fetchAssets();
  }, [currentPage, selectedCategory, selectedStatus, selectedCurrency, householdView]);

  useEffect(() => {
    fetchCategories();
    fetchMembers();
    fetchSummary();
    fetchExchangeRates();
  }, []);

  // Helper function to get converted value in main currency
  const getConvertedValue = (amount: number, fromCurrency: string, toCurrency: string): number | null => {
    if (fromCurrency === toCurrency) return amount;
    
    // First try direct conversion
    let rate = exchangeRates.find(r => 
      r.from_currency === fromCurrency && r.to_currency === toCurrency
    );
    
    if (rate) {
      return amount * rate.rate;
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
      return usdAmount * fromUSDRate.rate;
    }
    
    return null;
  };

  // Format asset value: show in main currency, original currency as sub-text if different
  const formatAssetValue = (asset: Asset) => {
    const mainCurrency = user?.main_currency || summary?.main_currency || 'EUR';
    const assetValue = asset.current_value || asset.amount;
    const assetCurrency = asset.currency;
    
    // If asset currency is same as main currency, just show it
    if (assetCurrency === mainCurrency) {
      return {
        main: formatCurrency(assetValue, mainCurrency),
        sub: null
      };
    }
    
    // Convert to main currency
    const convertedValue = getConvertedValue(assetValue, assetCurrency, mainCurrency);
    
    if (convertedValue !== null) {
      return {
        main: formatCurrency(convertedValue, mainCurrency),
        sub: formatCurrency(assetValue, assetCurrency)
      };
    }
    
    // If conversion failed, show original
    return {
      main: formatCurrency(assetValue, assetCurrency),
      sub: null
    };
  };

  // Filter assets based on search term and other criteria
  const filteredAssets = filterAssets(assets, searchTerm, selectedCategory, selectedStatus, selectedMember, selectedCurrency);

  // Handle asset creation/update
  const handleSaveAsset = async (assetData: any) => {
    try {
      if (selectedAsset) {
        // Update existing asset
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/assets/${selectedAsset.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assetData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || t('assets.failedToUpdate'));
        }
      } else {
        // Create new asset
        const token = localStorage.getItem('token');
        const response = await fetch('/api/assets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(assetData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || t('assets.failedToCreate'));
        }
      }

      // Refresh assets list
      await fetchAssets();
      await fetchSummary();
    } catch (error) {
      throw error;
    }
  };

  // Handle asset deletion
  const handleDeleteAsset = async (asset: Asset) => {
    if (!window.confirm(`Are you sure you want to delete "${asset.name}"?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('assets.failedToDelete'));
      }

      // Refresh assets list
      await fetchAssets();
      await fetchSummary();
    } catch (error) {
      alert(error instanceof Error ? error.message : t('assets.failedToDelete'));
    }
  };

  // Handle status toggle
  const handleToggleStatus = async (asset: Asset) => {
    try {
      const token = localStorage.getItem('token');
      const newStatus = asset.status === 'active' ? 'inactive' : 'active';
      
      const response = await fetch(`/api/assets/${asset.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('assets.failedToUpdate'));
      }

      // Refresh assets list and summary
      await fetchAssets();
      await fetchSummary();
    } catch (error) {
      alert(error instanceof Error ? error.message : t('assets.failedToUpdate'));
    }
  };

  // Handle valuation addition
  const handleAddValuation = async (valuationData: any) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/assets/${selectedAsset?.id}/valuation`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(valuationData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || t('assets.failedToAddValuation'));
      }

      // Refresh assets list to get updated current value
      await fetchAssets();
    } catch (error) {
      throw error;
    }
  };

  // Handle photo upload
  const handlePhotoUploaded = async (photoUrl: string) => {
    // Refresh assets list to get updated photo URL
    await fetchAssets();
  };

  if (loading && assets.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('assets.title')}</h1>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setHouseholdView(!householdView)}
            className={`px-3 py-2 text-sm font-medium rounded-md ${
              householdView 
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' 
                : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            }`}
          >
            {householdView ? <EyeIcon className="h-4 w-4" /> : <EyeSlashIcon className="h-4 w-4" />}
            {householdView ? t('assets.householdView') : t('assets.personalView')}
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            {t('assets.addAsset')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Assets
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {summary.total_assets}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CurrencyDollarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Total Value
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {formatCurrency(summary.total_value_main_currency, summary.main_currency)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <ChartBarIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      Average ROI
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {summary.average_roi.toFixed(1)}%
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <TagIcon className="h-6 w-6 text-gray-400" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                      With ROI Data
                    </dt>
                    <dd className="text-lg font-medium text-gray-900 dark:text-white">
                      {summary.assets_with_roi}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder={t('assets.searchPlaceholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
            </div>
            <div className="mt-4 sm:mt-0 sm:ml-4">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <FunnelIcon className="h-4 w-4 mr-2" />
                {t('assets.filters')}
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              >
                      <option value="">{t('assets.allCategories')}</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {getCategoryName(category)}
                  </option>
                ))}
              </select>

              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              >
                      <option value="">{t('assets.allStatus')}</option>
                      <option value="active">{t('assets.active')}</option>
                      <option value="sold">{t('assets.sold')}</option>
                      <option value="transferred">{t('assets.transferred')}</option>
                      <option value="inactive">{t('assets.inactive')}</option>
              </select>

              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              >
                      <option value="">{t('assets.allMembers')}</option>
                {members.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>

              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              >
                      <option value="">{t('assets.allCurrencies')}</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="TRY">TRY</option>
                <option value="GOLD">GOLD</option>
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            Assets ({filteredAssets.length})
          </h3>
        </div>
        
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('assets.noAssetsFound')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('assets.getStarted')}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Add Asset
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Table Header */}
            <div className="hidden md:grid grid-cols-12 gap-1 px-2 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
              <div className="col-span-1 flex justify-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></span>
              </div>
              <div className="col-span-3">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Asset</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ownership</span>
              </div>
              <div className="col-span-1 text-center">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Shares</span>
              </div>
              <div className="col-span-1.5 text-right">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</span>
              </div>
              <div className="col-span-0.5 text-right">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">ROI</span>
              </div>
              <div className="col-span-3 text-right">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</span>
              </div>
            </div>

            {/* Table Body */}
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAssets.map((asset) => {
                const roi = calculateROI(asset);
                const category = categories.find(c => c.id === asset.category_id);
                
                return (
                  <li key={asset.id} className="border-b border-gray-200 dark:border-gray-700">
                    {/* Mobile View */}
                    <div className="md:hidden p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center space-x-3 flex-1">
                          {category && category.icon ? (
                            (() => {
                              const IconComponent = getCategoryIcon(category.icon);
                              return (
                                <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                                  <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                                </div>
                              );
                            })()
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center flex-shrink-0">
                              <TagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {asset.name}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {category ? getCategoryName(category) : t('assets.unknownCategory')}
                            </p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'active' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {t(`assets.${asset.status}`)}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2 mb-2">
                        <div>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Value</p>
                          {(() => {
                            const valueDisplay = formatAssetValue(asset);
                            return (
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {valueDisplay.main}
                                </p>
                                {valueDisplay.sub && (
                                  <p className="text-xs text-gray-500 dark:text-gray-400">
                                    {valueDisplay.sub}
                                  </p>
                                )}
                              </div>
                            );
                          })()}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500 dark:text-gray-400">ROI</p>
                          {roi !== null ? (
                            <p className={`text-sm font-medium ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {roi.toFixed(1)}%
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400">-</p>
                          )}
                        </div>
                      </div>

                      <div className="mb-2">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Shares</p>
                        {asset.ownership_type === 'shared' && asset.shared_ownership && asset.shared_ownership.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {[...asset.shared_ownership].sort((a, b) => b.ownership_percentage - a.ownership_percentage).map((owner, index) => {
                              const colors = [
                                'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
                                'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300',
                                'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
                                'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-300',
                                'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300',
                                'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300',
                                'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'
                              ];
                              const colorClass = colors[index % colors.length];
                              return (
                                <span key={owner.household_member_id} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${colorClass}`}>
                                  {owner.member_name}: {owner.ownership_percentage}%
                                </span>
                              );
                            })}
                          </div>
                        ) : asset.ownership_type === 'single' && asset.member_name ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {asset.member_name}: 100%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>

                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(asset)}
                          className={`p-2 rounded-lg transition-colors ${
                            asset.status === 'active' 
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                              : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          title={asset.status === 'active' ? t('assets.setInactiveTooltip') : t('assets.setActiveTooltip')}
                        >
                          {asset.status === 'active' ? (
                            <CheckCircleIcon className="h-5 w-5" />
                          ) : (
                            <XCircleIcon className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowValuationModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                          title={t('assets.addValuationTooltip')}
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowPhotoModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 transition-colors"
                          title={t('assets.uploadPhotoTooltip')}
                        >
                          <PhotoIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                          title={t('assets.editAssetTooltip')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                          title={t('assets.deleteAssetTooltip')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>

                    {/* Desktop View */}
                    <div className="hidden md:grid md:grid-cols-12 gap-2 items-center px-4 py-4">
                      {/* Icon Column */}
                      <div className="col-span-1 flex justify-center">
                        {category && category.icon ? (
                          (() => {
                            const IconComponent = getCategoryIcon(category.icon);
                            return (
                              <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                                <IconComponent className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                              </div>
                            );
                          })()
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <TagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>

                      {/* Asset Name and Details Column */}
                      <div className="col-span-3">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {asset.name}
                          </p>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          {category ? getCategoryName(category) : t('assets.unknownCategory')}
                          {asset.location && (
                            <>
                              <span className="mx-2">•</span>
                              <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              {asset.location}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Status Column */}
                      <div className="col-span-1 flex justify-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          asset.status === 'active' 
                            ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                            : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                        }`}>
                          {t(`assets.${asset.status}`)}
                        </span>
                      </div>

                      {/* Ownership Type Column */}
                      <div className="col-span-1 text-center">
                        <span className={`inline-flex items-center justify-center px-2 py-1 rounded-full text-xs font-medium ${getOwnershipColor(asset.ownership_type)}`}>
                          {t(`assets.${asset.ownership_type}`)}
                        </span>
                      </div>

                      {/* Shares Column */}
                      <div className="col-span-1">
                        {asset.ownership_type === 'shared' && asset.shared_ownership && asset.shared_ownership.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {[...asset.shared_ownership].sort((a, b) => b.ownership_percentage - a.ownership_percentage).map((owner, index) => {
                              const colors = [
                                'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300',
                                'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300',
                                'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-300',
                                'bg-pink-100 dark:bg-pink-900 text-pink-800 dark:text-pink-300',
                                'bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-300',
                                'bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-300',
                                'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-300'
                              ];
                              const colorClass = colors[index % colors.length];
                              const truncatedName = owner.member_name.length > 8 ? owner.member_name.substring(0, 8) + '.' : owner.member_name;
                              return (
                                <span key={owner.household_member_id} className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium truncate ${colorClass}`}>
                                  {truncatedName}: {owner.ownership_percentage}%
                                </span>
                              );
                            })}
                          </div>
                        ) : asset.ownership_type === 'single' && asset.member_name ? (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                            {asset.member_name.length > 10 ? asset.member_name.substring(0, 10) + '.' : asset.member_name}: 100%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </div>

                      {/* Value Column */}
                      <div className="col-span-1.5 text-right">
                        {(() => {
                          const valueDisplay = formatAssetValue(asset);
                          return (
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {valueDisplay.main}
                              </p>
                              {valueDisplay.sub && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {valueDisplay.sub}
                                </p>
                              )}
                            </div>
                          );
                        })()}
                      </div>

                      {/* ROI Column */}
                      <div className="col-span-0.5 text-right">
                        {roi !== null ? (
                          <p className={`text-sm font-medium ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {roi.toFixed(1)}%
                          </p>
                        ) : (
                          <p className="text-sm text-gray-400">-</p>
                        )}
                      </div>

                      {/* Actions Column */}
                      <div className="col-span-3 flex justify-end space-x-2">
                        <button
                          onClick={() => handleToggleStatus(asset)}
                          className={`p-2 rounded-lg transition-colors ${
                            asset.status === 'active' 
                              ? 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20' 
                              : 'text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                          title={asset.status === 'active' ? t('assets.setInactiveTooltip') : t('assets.setActiveTooltip')}
                        >
                          {asset.status === 'active' ? (
                            <CheckCircleIcon className="h-5 w-5" />
                          ) : (
                            <XCircleIcon className="h-5 w-5" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowValuationModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                          title={t('assets.addValuationTooltip')}
                        >
                          <ChartBarIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowPhotoModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 dark:hover:text-purple-400 transition-colors"
                          title={t('assets.uploadPhotoTooltip')}
                        >
                          <PhotoIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowEditModal(true);
                          }}
                          className="p-2 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 dark:hover:text-green-400 transition-colors"
                          title={t('assets.editAssetTooltip')}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAsset(asset)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors"
                          title={t('assets.deleteAssetTooltip')}
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('assets.previous')}
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {t('assets.next')}
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  {t('assets.showing')} <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> {t('assets.to')}{' '}
                  <span className="font-medium">{Math.min(currentPage * 20, totalAssets)}</span> {t('assets.of')}{' '}
                  <span className="font-medium">{totalAssets}</span> {t('assets.results')}
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                          currentPage === page
                            ? 'z-10 bg-blue-50 dark:bg-blue-900 border-blue-500 text-blue-600 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AddEditAssetModal
        isOpen={showAddModal || showEditModal}
        onClose={() => {
          setShowAddModal(false);
          setShowEditModal(false);
          setSelectedAsset(null);
        }}
        onSave={handleSaveAsset}
        asset={selectedAsset}
        categories={categories}
        members={members}
      />

      <ValuationHistoryModal
        isOpen={showValuationModal}
        onClose={() => {
          setShowValuationModal(false);
          setSelectedAsset(null);
        }}
        assetId={selectedAsset?.id || 0}
        assetName={selectedAsset?.name || ''}
        assetCurrency={selectedAsset?.currency || 'USD'}
        onAddValuation={handleAddValuation}
      />

      <PhotoUploadModal
        isOpen={showPhotoModal}
        onClose={() => {
          setShowPhotoModal(false);
          setSelectedAsset(null);
        }}
        assetId={selectedAsset?.id || 0}
        assetName={selectedAsset?.name || ''}
        currentPhotoUrl={selectedAsset?.photo_url}
        onPhotoUploaded={handlePhotoUploaded}
      />
    </div>
  );
};

export default AssetsPage;