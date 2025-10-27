import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  TagIcon,
  ExclamationTriangleIcon,
  HomeIcon, 
  ChartBarIcon, 
  ChartPieIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  SparklesIcon, 
  TruckIcon, 
  PaintBrushIcon, 
  BanknotesIcon, 
  CubeTransparentIcon 
} from '@heroicons/react/24/outline';
import AddEditCategoryModal from '../components/AddEditCategoryModal';

interface AssetCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  type: string;
  category_type: string;
  icon?: string;
  requires_ticker: boolean;
  depreciation_enabled: boolean;
  is_default: boolean;
  asset_count: number;
  allowed_currency_types?: string[];
}

const AssetCategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);

  // Icon mapping for categories
  const getCategoryIcon = (iconName: string) => {
    // Map database icon names (like "home-modern") to Heroicon components
    const iconMap: {[key: string]: React.ComponentType<any>} = {
      // Old format (full component names)
      'HomeIcon': HomeIcon,
      'ChartBarIcon': ChartBarIcon,
      'ChartPieIcon': ChartPieIcon,
      'DocumentTextIcon': DocumentTextIcon,
      'CurrencyDollarIcon': CurrencyDollarIcon,
      'SparklesIcon': SparklesIcon,
      'TruckIcon': TruckIcon,
      'PaintBrushIcon': PaintBrushIcon,
      'BanknotesIcon': BanknotesIcon,
      'CubeTransparentIcon': CubeTransparentIcon,
      // New format (Heroicon names without Icon suffix)
      'home-modern': HomeIcon,
      'chart-bar': ChartBarIcon,
      'chart-bar-square': ChartBarIcon,
      'document-text': DocumentTextIcon,
      'currency-bitcoin': CurrencyDollarIcon,
      'sparkles': SparklesIcon,
      'truck': TruckIcon,
      'paint-brush': PaintBrushIcon,
      'banknotes': BanknotesIcon,
      'cube': CubeTransparentIcon,
    };
    return iconMap[iconName] || CubeTransparentIcon;
  };

// Fetch categories
const fetchCategories = async () => {
  try {
    setLoading(true);
    const token = localStorage.getItem('token');
    const response = await fetch('/api/asset-categories', {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    if (!response.ok) throw new Error(t('assetCategories.failedToFetch'));
    
    const data = await response.json();
    setCategories(data);
  } catch (err) {
    setError(err instanceof Error ? err.message : t('assetCategories.failedToFetch'));
  } finally {
    setLoading(false);
  }
};

// Add category
const handleAddCategory = async (categoryData: Partial<AssetCategory>) => {
  try {
    const token = localStorage.getItem('token');
    const response = await fetch('/api/asset-categories', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || t('assetCategories.failedToAdd'));
    }
    
    await fetchCategories();
    setShowAddModal(false);
  } catch (err) {
    alert(err instanceof Error ? err.message : t('assetCategories.failedToAdd'));
  }
};

 // Edit category
const handleEditCategory = async (categoryData: Partial<AssetCategory>) => {
  if (!selectedCategory) return;

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/asset-categories/${selectedCategory.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(categoryData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || t('assetCategories.failedToUpdate'));
    }
    
    await fetchCategories();
    setShowEditModal(false);
    setSelectedCategory(null);
  } catch (err) {
    alert(err instanceof Error ? err.message : t('assetCategories.failedToUpdate'));
  }
};

 // Delete category
const handleDelete = async (category: AssetCategory) => {
  if (category.is_default) {
    alert(t('assetCategories.cannotDeleteDefault'));
    return;
  }

  if (category.asset_count > 0) {
    alert(t('assetCategories.cannotDeleteWithAssets'));
    return;
  }

  if (!window.confirm(`${t('assetCategories.confirmDelete')} "${category.name_en}"?`)) {
    return;
  }

  try {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/asset-categories/${category.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(t('assetCategories.failedToDelete'));
    
    await fetchCategories();
  } catch (err) {
    alert(err instanceof Error ? err.message : t('assetCategories.failedToDelete'));
  }
};

  // Get category type name
  const getCategoryTypeName = (type: string) => {
    const typeNames: { [key: string]: string } = {
      'real_estate': t('assetCategories.realEstate'),
      'stocks': t('assetCategories.stocks'),
      'etf': t('assetCategories.etf'),
      'bonds': t('assetCategories.bonds'),
      'crypto': t('assetCategories.crypto'),
      'gold': t('assetCategories.gold'),
      'vehicles': t('assetCategories.vehicles'),
      'collectibles': t('assetCategories.collectibles'),
      'cash': t('assetCategories.cash'),
      'other': t('assetCategories.other')
    };
    return typeNames[type] || type;
  };

  // Load categories on component mount
  useEffect(() => {
    fetchCategories();
  }, []);

  if (loading) {
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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('assetCategories.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('assetCategories.manageSettings')}
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('assetCategories.addCategory')}
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            {t('assetCategories.assetCategoriesCount')} ({categories.length})
          </h3>
        </div>
        
        {categories.length === 0 ? (
          <div className="text-center py-12">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">{t('assetCategories.noCategoriesFound')}</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('assetCategories.getStarted')}
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('assetCategories.addCategory')}
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('assetCategories.category')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('assetCategories.type')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('assetCategories.settings')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Allowed Currencies
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('assetCategories.assets')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    {t('assetCategories.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                            {category.icon ? (
                              (() => {
                                const IconComponent = getCategoryIcon(category.icon);
                                return <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-400" />;
                              })()
                            ) : (
                              <TagIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                            )}
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {category.name_en}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {category.name_de} • {category.name_tr}
                          </div>
                        </div>
                        {category.is_default && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                            {t('assetCategories.default')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                        {getCategoryTypeName(category.category_type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        {category.requires_ticker && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
                            {t('assetCategories.requiresTicker')}
                          </span>
                        )}
                        {category.depreciation_enabled && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                            {t('assetCategories.depreciationEnabled')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {(category.allowed_currency_types || ['fiat']).map((type: string) => (
                          <span key={type} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300 capitalize">
                            {type === 'fiat' ? 'Fiat' : type === 'cryptocurrency' ? 'Crypto' : 'Metal'}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {category.asset_count}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedCategory(category);
                            setShowEditModal(true);
                          }}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                          title={t('assetCategories.editCategory')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={category.is_default || category.asset_count > 0}
                          className={`${
                            category.is_default || category.asset_count > 0
                              ? 'text-gray-400 cursor-not-allowed'
                              : 'text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300'
                          }`}
                          title={
                            category.is_default
                              ? t('assetCategories.cannotDeleteDefaultTooltip')
                              : category.asset_count > 0
                              ? t('assetCategories.cannotDeleteWithAssetsTooltip')
                              : t('assetCategories.deleteCategory')
                          }
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <AddEditCategoryModal
          onClose={() => setShowAddModal(false)}
          onSave={handleAddCategory}
          mode="add"
        />
      )}

      {/* Edit Category Modal */}
      {showEditModal && selectedCategory && (
        <AddEditCategoryModal
          category={selectedCategory}
          onClose={() => {
            setShowEditModal(false);
            setSelectedCategory(null);
          }}
          onSave={handleEditCategory}
          mode="edit"
        />
      )}
    </div>
  );
};

export default AssetCategoriesPage;
