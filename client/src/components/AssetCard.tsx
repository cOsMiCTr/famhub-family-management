import React from 'react';
import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import type { Asset } from '../utils/assetUtils';
import { formatCurrency, calculateROI } from '../utils/assetUtils';

interface AssetCardProps {
  asset: Asset;
  onClick: (asset: Asset) => void;
  className?: string;
}

const AssetCard: React.FC<AssetCardProps> = ({ asset, onClick, className = '' }) => {
  const roi = calculateROI(asset) || 0;
  const hasPositiveROI = roi > 0;
  
  // Determine status color
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'sold':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      case 'transferred':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 cursor-pointer ${className}`}
      onClick={() => onClick(asset)}
    >
      <div className="p-6">
        {/* Header with Photo and Category */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            {/* Photo thumbnail or placeholder */}
            {asset.photo_url ? (
              <img
                src={asset.photo_url}
                alt={asset.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 rounded-lg bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                <PhotoIcon className="w-8 h-8 text-gray-400" />
              </div>
            )}
            
            {/* Category Icon if available */}
            {asset.icon && (
              <div className="w-6 h-6 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                <span className="text-xs text-gray-500 dark:text-gray-400">{asset.category_name_en?.[0]}</span>
              </div>
            )}
          </div>

          {/* ROI Badge */}
          {asset.purchase_price && asset.purchase_price > 0 && (
            <div className={`flex items-center space-x-1 px-3 py-1 rounded-full ${
              hasPositiveROI
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {hasPositiveROI ? (
                <ArrowTrendingUpIcon className="w-4 h-4" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">{roi.toFixed(1)}%</span>
            </div>
          )}
        </div>

        {/* Asset Name */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
          {asset.name}
        </h3>

        {/* Category */}
        <div className="mb-3">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Category: <span className="font-medium text-gray-700 dark:text-gray-300">
              {asset.category_name_en || 'Unknown'}
            </span>
          </span>
        </div>

        {/* Current Value */}
        <div className="mb-4">
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(
                asset.current_value || asset.amount,
                asset.currency
              )}
            </span>
            {asset.currency !== 'USD' && (
              <span className="text-sm text-gray-500 dark:text-gray-400">
                ({asset.currency})
              </span>
            )}
          </div>
          {asset.purchase_price && asset.purchase_price > 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Bought: {formatCurrency(asset.purchase_price, asset.purchase_currency || asset.currency)}
            </p>
          )}
        </div>

        {/* Owner/Member */}
        {asset.member_name && (
          <div className="mb-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Owner: <span className="font-medium text-gray-700 dark:text-gray-300">
                {asset.member_name}
              </span>
            </span>
          </div>
        )}

        {/* Ownership Type */}
        <div className="mb-3">
          <span className={`inline-block px-2 py-1 text-xs font-medium rounded ${
            asset.ownership_type === 'shared'
              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
              : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
          }`}>
            {asset.ownership_type === 'shared' ? 'Shared' : 'Individual'}
            {asset.ownership_percentage && asset.ownership_percentage < 100 && ` (${asset.ownership_percentage}%)`}
          </span>
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          <span className={`inline-block px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(asset.status)}`}>
            {asset.status.charAt(0).toUpperCase() + asset.status.slice(1)}
          </span>

          {asset.last_valuation_date && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Updated: {new Date(asset.last_valuation_date).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssetCard;

