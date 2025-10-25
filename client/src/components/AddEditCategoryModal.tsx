import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, HomeIcon, ChartBarIcon, ChartPieIcon, DocumentTextIcon, CurrencyDollarIcon, SparklesIcon, TruckIcon, PaintBrushIcon, BanknotesIcon, CubeTransparentIcon } from '@heroicons/react/24/outline';

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
}

interface AddEditCategoryModalProps {
  category?: AssetCategory;
  onClose: () => void;
  onSave: (categoryData: Partial<AssetCategory>) => void;
  mode: 'add' | 'edit';
}

const AddEditCategoryModal: React.FC<AddEditCategoryModalProps> = ({
  category,
  onClose,
  onSave,
  mode
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  
  // Icon mapping for categories
  const getCategoryIcon = (iconName: string) => {
    const iconMap: {[key: string]: React.ComponentType<any>} = {
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
    };
    return iconMap[iconName] || CubeTransparentIcon;
  };

  const availableIcons = [
    { value: 'HomeIcon', label: 'Home', component: HomeIcon },
    { value: 'ChartBarIcon', label: 'Chart Bar', component: ChartBarIcon },
    { value: 'ChartPieIcon', label: 'Chart Pie', component: ChartPieIcon },
    { value: 'DocumentTextIcon', label: 'Document', component: DocumentTextIcon },
    { value: 'CurrencyDollarIcon', label: 'Currency', component: CurrencyDollarIcon },
    { value: 'SparklesIcon', label: 'Sparkles', component: SparklesIcon },
    { value: 'TruckIcon', label: 'Truck', component: TruckIcon },
    { value: 'PaintBrushIcon', label: 'Paint Brush', component: PaintBrushIcon },
    { value: 'BanknotesIcon', label: 'Banknotes', component: BanknotesIcon },
    { value: 'CubeTransparentIcon', label: 'Cube', component: CubeTransparentIcon },
  ];

  const [formData, setFormData] = useState({
    name_en: '',
    name_de: '',
    name_tr: '',
    type: 'income',
    category_type: 'other',
    icon: '',
    requires_ticker: false,
    depreciation_enabled: false,
    is_default: false
  });

  useEffect(() => {
    if (category && mode === 'edit') {
      setFormData({
        name_en: category.name_en,
        name_de: category.name_de,
        name_tr: category.name_tr,
        type: category.type,
        category_type: category.category_type,
        icon: category.icon || '',
        requires_ticker: category.requires_ticker,
        depreciation_enabled: category.depreciation_enabled,
        is_default: category.is_default
      });
    }
  }, [category, mode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving category:', error);
    } finally {
      setLoading(false);
    }
  };

  const categoryTypes = [
    { value: 'real_estate', label: t('assetCategories.realEstate') },
    { value: 'stocks', label: t('assetCategories.stocks') },
    { value: 'etf', label: t('assetCategories.etf') },
    { value: 'bonds', label: t('assetCategories.bonds') },
    { value: 'crypto', label: t('assetCategories.crypto') },
    { value: 'gold', label: t('assetCategories.gold') },
    { value: 'vehicles', label: t('assetCategories.vehicles') },
    { value: 'collectibles', label: t('assetCategories.collectibles') },
    { value: 'cash', label: t('assetCategories.cash') },
    { value: 'other', label: t('assetCategories.other') }
  ];

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-2/3 lg:w-1/2 shadow-lg rounded-md bg-white dark:bg-gray-800">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {mode === 'add' ? t('assetCategories.addCategory') : t('assetCategories.editCategory')}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Names */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')} (EN) *
                </label>
                <input
                  type="text"
                  name="name_en"
                  value={formData.name_en}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')} (DE) *
                </label>
                <input
                  type="text"
                  name="name_de"
                  value={formData.name_de}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('common.name')} (TR) *
                </label>
                <input
                  type="text"
                  name="name_tr"
                  value={formData.name_tr}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>

            {/* Type and Category Type */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('assetCategories.typeLabel')} *
                </label>
                <select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="income">{t('assetCategories.income')}</option>
                  <option value="expense">{t('assetCategories.expense')}</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t('assetCategories.categoryType')}
                </label>
                <select
                  name="category_type"
                  value={formData.category_type}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categoryTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Icon */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('assetCategories.icon')}
              </label>
              <select
                name="icon"
                value={formData.icon}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="">Select an icon</option>
                {availableIcons.map(icon => (
                  <option key={icon.value} value={icon.value}>
                    {icon.label}
                  </option>
                ))}
              </select>
              {/* Show selected icon preview */}
              {formData.icon && (
                <div className="mt-2 flex items-center">
                  {(() => {
                    const IconComponent = getCategoryIcon(formData.icon);
                    return (
                      <>
                        <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {availableIcons.find(i => i.value === formData.icon)?.label}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Settings */}
            <div className="space-y-3">
              <h4 className="text-md font-medium text-gray-900 dark:text-white">{t('assetCategories.settingsLabel')}</h4>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="requires_ticker"
                    checked={formData.requires_ticker}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('assetCategories.requiresTickerSymbol')}
                  </span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    name="depreciation_enabled"
                    checked={formData.depreciation_enabled}
                    onChange={handleChange}
                    className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                  />
                  <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    {t('assetCategories.depreciationEnabledLabel')}
                  </span>
                </label>
                {mode === 'add' && (
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      name="is_default"
                      checked={formData.is_default}
                      onChange={handleChange}
                      className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t('assetCategories.defaultCategory')}
                    </span>
                  </label>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('common.saving') : (mode === 'add' ? t('assetCategories.addCategory') : t('assetCategories.editCategory'))}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditCategoryModal;
