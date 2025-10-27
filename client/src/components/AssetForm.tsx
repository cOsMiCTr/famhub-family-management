import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface Asset {
  id?: number;
  amount: number;
  currency: string;
  category_id: number;
  description: string;
  date: string;
}

interface AssetFormProps {
  asset?: Asset | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  householdView?: boolean;
}

const AssetForm: React.FC<AssetFormProps> = ({ 
  asset, 
  isOpen, 
  onClose, 
  onSave, 
  householdView = false 
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [formData, setFormData] = useState<Asset>({
    amount: 0,
    currency: user?.main_currency || 'USD',
    category_id: 0,
    description: '',
    date: new Date().toISOString().split('T')[0]
  });
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadCategories();
      if (asset) {
        setFormData(asset);
      } else {
        setFormData({
          amount: 0,
          currency: user?.main_currency || 'USD',
          category_id: 0,
          description: '',
          date: new Date().toISOString().split('T')[0]
        });
      }
      setError('');
    }
  }, [isOpen, asset, user?.main_currency]);

  const loadCategories = async () => {
    try {
      const response = await apiService.getAssetCategories();
      setCategories(response.categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (asset?.id) {
        // Update existing asset
        await apiService.updateAsset(asset.id.toString(), formData);
      } else {
        // Create new asset
        const assetData = {
          ...formData,
          household_id: householdView ? user?.household_id : undefined
        };
        await apiService.createAsset(assetData);
      }
      onSave();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save asset');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' ? parseFloat(value) || 0 : value
    }));
  };

  const getCategoryName = (category: any) => {
    const lang = user?.preferred_language || 'en';
    switch (lang) {
      case 'de': return category.name_de;
      case 'tr': return category.name_tr;
      default: return category.name_en;
    }
  };

  const currencies = [
    { code: 'USD', name: 'US Dollar' },
    { code: 'EUR', name: 'Euro' },
    { code: 'GBP', name: 'British Pound' },
    { code: 'TRY', name: 'Turkish Lira' },
    { code: 'GOLD', name: 'Gold' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal panel */}
        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
          <form onSubmit={handleSubmit}>
            {/* Header */}
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {asset?.id ? 'Edit Asset' : 'Add New Asset'}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-white px-4 pb-4 sm:p-6">
              {error && (
                <div className="mb-4 bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <div className="space-y-4">
                {/* Amount */}
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                    Amount *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    id="amount"
                    name="amount"
                    value={formData.amount}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="0.00"
                  />
                </div>

                {/* Currency */}
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
                    Currency *
                  </label>
                  <select
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    {currencies.map(currency => (
                      <option key={currency.code} value={currency.code}>
                        {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Category */}
                <div>
                  <label htmlFor="category_id" className="block text-sm font-medium text-gray-700">
                    Category *
                  </label>
                  <select
                    id="category_id"
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  >
                    <option value={0}>Select a category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {getCategoryName(category)} ({category.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                    placeholder="Optional description..."
                  />
                </div>

                {/* Date */}
                <div>
                  <label htmlFor="date" className="block text-sm font-medium text-gray-700">
                    Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary-600 text-base font-medium text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : (asset?.id ? 'Update' : 'Create')}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AssetForm;