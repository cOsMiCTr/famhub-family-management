import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';

interface IncomeCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  is_default: boolean;
  created_at: string;
}

const IncomeCategoriesPage: React.FC = () => {
  const { t } = useTranslation();
  const [categories, setCategories] = useState<IncomeCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<IncomeCategory | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_de: '',
    name_tr: ''
  });

  // Load income categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/income-categories', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load income categories');
      }

      const data = await response.json();
      setCategories(data);
    } catch (error) {
      console.error('Error loading income categories:', error);
      setError('Failed to load income categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedCategory 
        ? `/api/income-categories/${selectedCategory.id}`
        : '/api/income-categories';
      
      const method = selectedCategory ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save category');
      }

      await loadCategories();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedCategory(null);
      setFormData({ name_en: '', name_de: '', name_tr: '' });
    } catch (error) {
      console.error('Error saving category:', error);
      setError(error instanceof Error ? error.message : 'Failed to save category');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      const response = await fetch(`/api/income-categories/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete category');
      }

      await loadCategories();
      setShowDeleteModal(false);
      setSelectedCategory(null);
    } catch (error) {
      console.error('Error deleting category:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete category');
    }
  };

  // Handle edit
  const handleEdit = (category: IncomeCategory) => {
    if (category.is_default) {
      setError(t('incomeCategories.cannotDeleteDefault'));
      return;
    }
    
    setSelectedCategory(category);
    setFormData({
      name_en: category.name_en,
      name_de: category.name_de,
      name_tr: category.name_tr
    });
    setShowEditModal(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (category: IncomeCategory) => {
    if (category.is_default) {
      setError(t('incomeCategories.cannotDeleteDefault'));
      return;
    }
    
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  // Get category name based on current language
  const getCategoryName = (category: IncomeCategory) => {
    const { i18n } = useTranslation();
    const lang = i18n.language;
    
    switch (lang) {
      case 'de':
        return category.name_de;
      case 'tr':
        return category.name_tr;
      default:
        return category.name_en;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('incomeCategories.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Manage income categories for the system
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('incomeCategories.addCategory')}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {t('common.error')}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Categories List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('incomeCategories.noCategoriesFound')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Get started by adding a new income category.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('incomeCategories.nameEn')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('incomeCategories.nameDe')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('incomeCategories.nameTr')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <tr key={category.id} className={category.is_default ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <TagIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {category.name_en}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {category.name_de}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {category.name_tr}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {category.is_default ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {t('incomeCategories.isDefault')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            Custom
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {!category.is_default && (
                            <>
                              <button
                                onClick={() => handleEdit(category)}
                                className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                                title={t('incomeCategories.editCategory')}
                              >
                                <PencilIcon className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteClick(category)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title={t('incomeCategories.deleteCategory')}
                              >
                                <TrashIcon className="h-5 w-5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {selectedCategory ? t('incomeCategories.editCategory') : t('incomeCategories.addCategory')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('incomeCategories.nameEn')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('incomeCategories.nameDe')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_de}
                      onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('incomeCategories.nameTr')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_tr}
                      onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedCategory(null);
                        setFormData({ name_en: '', name_de: '', name_tr: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedCategory && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {t('incomeCategories.deleteCategory')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete "{selectedCategory.name_en}"? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedCategory(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IncomeCategoriesPage;

