import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { BuildingOfficeIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface Asset {
  id: number;
  name: string;
  location?: string;
  amount: number;
  currency: string;
}

interface ExpenseAssetSelectorProps {
  value?: number;
  onChange: (assetId: number | null) => void;
  required?: boolean;
  error?: string;
}

const ExpenseAssetSelector: React.FC<ExpenseAssetSelectorProps> = ({
  value,
  onChange,
  required = false,
  error
}) => {
  const { t } = useTranslation();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const response = await apiService.get('/expenses/linkable-assets');
        setAssets(response);
        setErrorMessage(null);
      } catch (err: any) {
        console.error('Error fetching linkable assets:', err);
        setErrorMessage(err.response?.data?.error || t('expenses.errorFetchingAssets'));
      } finally {
        setLoading(false);
      }
    };

    fetchAssets();
  }, [t]);

  const selectedAsset = assets.find(a => a.id === value);

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {t('expenses.selectProperty')}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      
      {loading ? (
        <div className="text-sm text-gray-500">{t('common.loading')}</div>
      ) : errorMessage ? (
        <div className="text-sm text-red-500">{errorMessage}</div>
      ) : assets.length === 0 ? (
        <div className="text-sm text-gray-500">{t('expenses.noPropertiesAvailable')}</div>
      ) : (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : null)}
          className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm ${
            error || errorMessage ? 'border-red-300' : ''
          }`}
          required={required}
        >
          <option value="">{t('expenses.selectProperty')}</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.name} {asset.location ? `(${asset.location})` : ''}
            </option>
          ))}
        </select>
      )}

      {selectedAsset && (
        <div className="mt-1 flex items-center text-sm text-gray-600">
          <BuildingOfficeIcon className="h-4 w-4 mr-1" />
          <span>{selectedAsset.name}</span>
          {selectedAsset.location && (
            <span className="ml-2 text-gray-500">({selectedAsset.location})</span>
          )}
        </div>
      )}

      {(error || errorMessage) && (
        <p className="mt-1 text-sm text-red-600">{error || errorMessage}</p>
      )}
    </div>
  );
};

export default ExpenseAssetSelector;

