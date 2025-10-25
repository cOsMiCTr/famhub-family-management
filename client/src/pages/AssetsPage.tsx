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
  CurrencyDollarIcon,
  CalendarIcon,
  MapPinIcon,
  UserIcon,
  TagIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface Asset {
  id: number;
  name: string;
  amount: number;
  currency: string;
  category_id: number;
  description?: string;
  date: string;
  household_member_id?: number;
  purchase_date?: string;
  purchase_price?: number;
  purchase_currency?: string;
  current_value?: number;
  last_valuation_date?: string;
  valuation_method?: string;
  ownership_type: string;
  ownership_percentage: number;
  status: string;
  location?: string;
  notes?: string;
  photo_url?: string;
  category_name_en: string;
  category_name_de: string;
  category_name_tr: string;
  category_type: string;
  icon?: string;
  member_name?: string;
  user_email: string;
}

interface AssetCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  category_type: string;
  icon?: string;
  requires_ticker: boolean;
  depreciation_enabled: boolean;
  is_default: boolean;
  asset_count: number;
}

interface HouseholdMember {
  id: number;
  name: string;
  relationship: string;
}

interface AssetSummary {
  total_assets: number;
  total_value_main_currency: number;
  main_currency: string;
  average_roi: number;
  assets_with_roi: number;
}

const AssetsPage: React.FC = () => {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [summary, setSummary] = useState<AssetSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
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
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '20',
        ...(selectedCategory && { category_id: selectedCategory }),
        ...(selectedStatus && { status: selectedStatus }),
        ...(selectedCurrency && { currency: selectedCurrency }),
        ...(householdView && { household_view: 'true' })
      });

      const response = await fetch(`/api/assets?${params}`);
      if (!response.ok) throw new Error('Failed to fetch assets');
      
      const data = await response.json();
      setAssets(data.assets);
      setTotalPages(data.pagination.pages);
      setTotalAssets(data.pagination.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch assets');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/assets/categories');
      if (!response.ok) throw new Error('Failed to fetch categories');
      
      const data = await response.json();
      setCategories(data);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await fetch('/api/household-members');
      if (!response.ok) throw new Error('Failed to fetch members');
      
      const data = await response.json();
      setMembers(data.members);
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch('/api/assets/summary');
      if (!response.ok) throw new Error('Failed to fetch summary');
      
      const data = await response.json();
      setSummary(data.summary);
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  useEffect(() => {
    fetchAssets();
  }, [currentPage, selectedCategory, selectedStatus, selectedCurrency, householdView]);

  useEffect(() => {
    fetchCategories();
    fetchMembers();
    fetchSummary();
  }, []);

  // Filter assets based on search term
  const filteredAssets = assets.filter(asset => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      asset.name.toLowerCase().includes(searchLower) ||
      asset.description?.toLowerCase().includes(searchLower) ||
      asset.category_name_en.toLowerCase().includes(searchLower) ||
      asset.member_name?.toLowerCase().includes(searchLower) ||
      asset.location?.toLowerCase().includes(searchLower)
    );
  });

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    const symbols: { [key: string]: string } = {
      'USD': '$',
      'EUR': '€',
      'GBP': '£',
      'TRY': '₺',
      'GOLD': 'Au'
    };
    
    const symbol = symbols[currency] || currency;
    return `${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;
  };

  // Calculate ROI
  const calculateROI = (asset: Asset) => {
    if (!asset.purchase_price || asset.purchase_price <= 0) return null;
    
    const purchasePrice = asset.purchase_price;
    const currentValue = asset.current_value || asset.amount;
    const roi = ((currentValue - purchasePrice) / purchasePrice) * 100;
    
    return roi;
  };

  // Get category name based on language
  const getCategoryName = (category: AssetCategory) => {
    const lang = localStorage.getItem('i18nextLng') || 'en';
    switch (lang) {
      case 'de': return category.name_de;
      case 'tr': return category.name_tr;
      default: return category.name_en;
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'sold': return 'bg-blue-100 text-blue-800';
      case 'transferred': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Get ownership type color
  const getOwnershipColor = (type: string) => {
    switch (type) {
      case 'single': return 'bg-blue-100 text-blue-800';
      case 'shared': return 'bg-purple-100 text-purple-800';
      case 'household': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {summary ? `${summary.total_assets} ${t('assets.title').toLowerCase()}, ${formatCurrency(summary.total_value_main_currency, summary.main_currency)} total value` : 'Manage your family assets'}
          </p>
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
            {householdView ? 'Household View' : 'Personal View'}
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
                  placeholder="Search assets..."
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
                Filters
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
                <option value="">All Categories</option>
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
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="sold">Sold</option>
                <option value="transferred">Transferred</option>
                <option value="inactive">Inactive</option>
              </select>

              <select
                value={selectedMember}
                onChange={(e) => setSelectedMember(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm dark:bg-gray-700 dark:text-white"
              >
                <option value="">All Members</option>
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
                <option value="">All Currencies</option>
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
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No assets found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by adding your first asset.
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
          <ul className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredAssets.map((asset) => {
              const roi = calculateROI(asset);
              const category = categories.find(c => c.id === asset.category_id);
              
              return (
                <li key={asset.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        {asset.photo_url ? (
                          <img
                            className="h-10 w-10 rounded-full object-cover"
                            src={asset.photo_url}
                            alt={asset.name}
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            <TagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="ml-4">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {asset.name}
                          </p>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                            {t(`assets.${asset.status}`)}
                          </span>
                          <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getOwnershipColor(asset.ownership_type)}`}>
                            {t(`assets.${asset.ownership_type}`)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center text-sm text-gray-500 dark:text-gray-400">
                          <TagIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                          {category ? getCategoryName(category) : 'Unknown Category'}
                          {asset.member_name && (
                            <>
                              <span className="mx-2">•</span>
                              <UserIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              {asset.member_name}
                            </>
                          )}
                          {asset.location && (
                            <>
                              <span className="mx-2">•</span>
                              <MapPinIcon className="flex-shrink-0 mr-1.5 h-4 w-4" />
                              {asset.location}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {formatCurrency(asset.current_value || asset.amount, asset.currency)}
                        </p>
                        {roi !== null && (
                          <p className={`text-xs ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            ROI: {roi.toFixed(1)}%
                          </p>
                        )}
                        {asset.purchase_price && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Cost: {formatCurrency(asset.purchase_price, asset.purchase_currency || asset.currency)}
                          </p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowValuationModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Add Valuation"
                        >
                          <ChartBarIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowPhotoModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Upload Photo"
                        >
                          <PhotoIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedAsset(asset);
                            setShowEditModal(true);
                          }}
                          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                          title="Edit Asset"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this asset?')) {
                              // TODO: Implement delete
                            }
                          }}
                          className="text-gray-400 hover:text-red-600"
                          title="Delete Asset"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
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
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Showing <span className="font-medium">{(currentPage - 1) * 20 + 1}</span> to{' '}
                  <span className="font-medium">{Math.min(currentPage * 20, totalAssets)}</span> of{' '}
                  <span className="font-medium">{totalAssets}</span> results
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

      {/* TODO: Add modals for Add/Edit Asset, Valuation, Photo Upload */}
      {/* These will be implemented in the next step */}
    </div>
  );
};

export default AssetsPage;