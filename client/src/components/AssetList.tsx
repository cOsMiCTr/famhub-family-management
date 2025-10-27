import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  PencilIcon, 
  TrashIcon, 
  PlusIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon
} from '@heroicons/react/24/outline';

interface Asset {
  id: number;
  amount: number;
  currency: string;
  description: string;
  date: string;
  category_name_en: string;
  category_name_de: string;
  category_name_tr: string;
  category_type: string;
  user_email: string;
  created_at: string;
  updated_at: string;
}

interface AssetListProps {
  onEdit: (asset: Asset) => void;
  onAdd: () => void;
  householdView?: boolean;
}

const AssetList: React.FC<AssetListProps> = ({ onEdit, onAdd, householdView = false }) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  useEffect(() => {
    loadAssets();
    loadCategories();
  }, [pagination.page, selectedCategory, selectedCurrency, householdView]);

  const loadAssets = async () => {
    try {
      setLoading(true);
      const params: any = {
        page: pagination.page,
        limit: pagination.limit,
        household_view: householdView
      };

      if (selectedCategory) params.category_id = selectedCategory;
      if (selectedCurrency) params.currency = selectedCurrency;

      const response = householdView 
        ? await apiService.getHouseholdAssets(user?.household_id?.toString() || '', params)
        : await apiService.getAssets(params);

      setAssets(response.assets);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load assets');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await apiService.getAssetCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this asset?')) return;

    try {
      await apiService.deleteAsset(id.toString());
      loadAssets(); // Reload the list
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete asset');
    }
  };

  const filteredAssets = assets.filter(asset => 
    asset.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    asset.category_name_en.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCategoryName = (asset: Asset) => {
    const lang = user?.preferred_language || 'en';
    switch (lang) {
      case 'de': return asset.category_name_de;
      case 'tr': return asset.category_name_tr;
      default: return asset.category_name_en;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">
          {householdView ? 'Household Assets' : 'My Assets'}
        </h2>
        <button
          onClick={onAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          Add Asset
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500 w-full"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {getCategoryName({ category_name_en: category.name_en, category_name_de: category.name_de, category_name_tr: category.name_tr } as any)}
              </option>
            ))}
          </select>

          {/* Currency Filter */}
          <select
            value={selectedCurrency}
            onChange={(e) => setSelectedCurrency(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="">All Currencies</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
            <option value="GBP">GBP</option>
            <option value="TRY">TRY</option>
            <option value="GOLD">GOLD</option>
          </select>

          {/* Clear Filters */}
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategory('');
              setSelectedCurrency('');
            }}
            className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Assets Table */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        {filteredAssets.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assets found</h3>
            <p className="text-gray-500 mb-4">
              {searchTerm || selectedCategory || selectedCurrency 
                ? 'Try adjusting your filters or search terms.'
                : 'Get started by adding your first asset.'
              }
            </p>
            <button
              onClick={onAdd}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700"
            >
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Asset
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {filteredAssets.map((asset) => (
              <li key={asset.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          asset.category_type === 'income' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {asset.category_type === 'income' ? '+' : '-'}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {asset.description || 'No description'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {getCategoryName(asset)} • {new Date(asset.date).toLocaleDateString()}
                          {householdView && ` • ${asset.user_email}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {formatCurrency(asset.amount, asset.currency)}
                      </p>
                      <p className="text-xs text-gray-500">{asset.currency}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => onEdit(asset)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(asset.id)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssetList;