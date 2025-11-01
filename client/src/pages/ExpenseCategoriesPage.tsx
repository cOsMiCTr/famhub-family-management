import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import FieldRequirementsEditor from '../components/FieldRequirementsEditor';

interface ExpenseCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  is_default: boolean;
  created_at: string;
  expense_count: number;
  parent_category_id?: number | null;
  subcategories?: ExpenseCategory[];
  allow_sharing_with_external_persons?: boolean;
  field_requirements?: Record<string, any>;
}

const ExpenseCategoriesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ExpenseCategory | null>(null);
  const [isSubcategory, setIsSubcategory] = useState(false);
  const [selectedParentCategory, setSelectedParentCategory] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name_en: '',
    name_de: '',
    name_tr: '',
    parent_category_id: null as number | null,
    display_order: 0,
    allow_sharing_with_external_persons: true,
    field_requirements: null as Record<string, any> | null
  });

  // Load categories
  const loadCategories = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch('/api/expense-categories', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      } else {
        console.error('Failed to load expense categories');
      }
    } catch (error) {
      console.error('Error loading expense categories:', error);
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
      const token = localStorage.getItem('token');
      const url = selectedCategory 
        ? `/api/expense-categories/${selectedCategory.id}`
        : '/api/expense-categories';
      
      const method = selectedCategory ? 'PUT' : 'POST';
      
      const payload = {
        name_en: formData.name_en,
        name_de: formData.name_de,
        name_tr: formData.name_tr,
        ...(formData.parent_category_id !== null && { parent_category_id: formData.parent_category_id }),
        ...(formData.display_order !== undefined && { display_order: formData.display_order }),
        allow_sharing_with_external_persons: formData.allow_sharing_with_external_persons,
        ...(formData.field_requirements && { field_requirements: formData.field_requirements })
      };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        await loadCategories();
        setShowAddModal(false);
        setShowEditModal(false);
        setFormData({ 
          name_en: '', 
          name_de: '', 
          name_tr: '', 
          parent_category_id: null, 
          display_order: 0,
          allow_sharing_with_external_persons: true,
          field_requirements: null
        });
        setSelectedCategory(null);
        setIsSubcategory(false);
        setSelectedParentCategory(null);
      } else {
        console.error('Failed to save expense category');
      }
    } catch (error) {
      console.error('Error saving expense category:', error);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedCategory) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/expense-categories/${selectedCategory.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        await loadCategories();
        setShowDeleteModal(false);
        setSelectedCategory(null);
      } else {
        console.error('Failed to delete expense category');
      }
    } catch (error) {
      console.error('Error deleting expense category:', error);
    }
  };

  // Open edit modal
  const openEditModal = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setIsSubcategory(!!category.parent_category_id);
    setSelectedParentCategory(category.parent_category_id || null);
    setFormData({
      name_en: category.name_en,
      name_de: category.name_de,
      name_tr: category.name_tr,
      parent_category_id: category.parent_category_id || null,
      display_order: (category as any).display_order || 0,
      allow_sharing_with_external_persons: category.allow_sharing_with_external_persons !== undefined 
        ? category.allow_sharing_with_external_persons 
        : true,
      field_requirements: category.field_requirements || null
    });
    setShowEditModal(true);
  };

  // Open delete modal
  const openDeleteModal = (category: ExpenseCategory) => {
    setSelectedCategory(category);
    setShowDeleteModal(true);
  };

  // Get category name based on current language
  const getCategoryName = (category: ExpenseCategory) => {
    const lang = i18n.language;
    switch (lang) {
      case 'de': return category.name_de;
      case 'tr': return category.name_tr;
      default: return category.name_en;
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('expenseCategories.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('expenseCategories.manageCategories')}
          </p>
        </div>
        <button
          onClick={() => {
            setIsSubcategory(false);
            setSelectedParentCategory(null);
            setFormData({ 
          name_en: '', 
          name_de: '', 
          name_tr: '', 
          parent_category_id: null, 
          display_order: 0,
          allow_sharing_with_external_persons: true,
          field_requirements: null
        });
            setShowAddModal(true);
          }}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-4 w-4 mr-2" />
          {t('expenseCategories.addCategory')}
        </button>
      </div>

      {/* Categories Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:p-6">
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('expenseCategories.noCategories')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('expenseCategories.getStarted')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenseCategories.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenseCategories.expenseCount')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {categories.map((category) => (
                    <React.Fragment key={category.id}>
                      {/* Parent Category Row */}
                      <tr className="bg-gray-50 dark:bg-gray-900/50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">
                            {getCategoryName(category)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {category.expense_count} {t('expenses.entries')}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => {
                                setIsSubcategory(true);
                                setSelectedParentCategory(category.id);
                                setFormData({ 
                                  name_en: '', 
                                  name_de: '', 
                                  name_tr: '', 
                                  parent_category_id: category.id, 
                                  display_order: (category.subcategories?.length || 0),
                                  allow_sharing_with_external_persons: true,
                                  field_requirements: null
                                });
                                setShowAddModal(true);
                              }}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title={t('expenseCategories.addSubcategory') || 'Add Subcategory'}
                            >
                              <PlusIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => openEditModal(category)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                              title={t('expenseCategories.editCategory')}
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            {!category.is_default && category.expense_count === 0 && (
                              <button
                                onClick={() => openDeleteModal(category)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title={t('expenseCategories.deleteCategory')}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {/* Subcategories */}
                      {category.subcategories && category.subcategories.length > 0 && category.subcategories.map((subcategory) => (
                        <tr key={subcategory.id} className="bg-white dark:bg-gray-800">
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-300 pl-6 flex items-center">
                              <span className="text-gray-400 dark:text-gray-500 mr-2">└</span>
                              {getCategoryName(subcategory)}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap">
                            <div className="text-sm text-gray-700 dark:text-gray-300">
                              {subcategory.expense_count} {t('expenses.entries')}
                            </div>
                          </td>
                          <td className="px-6 py-3 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => openEditModal(subcategory)}
                                className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                                title={t('expenseCategories.editCategory')}
                              >
                                <PencilIcon className="h-4 w-4" />
                              </button>
                              {!subcategory.is_default && (
                                <button
                                  onClick={() => openDeleteModal(subcategory)}
                                  className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                  title={t('expenseCategories.deleteCategory')}
                                >
                                  <TrashIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {isSubcategory ? (t('expenseCategories.addSubcategory') || 'Add Subcategory') : t('expenseCategories.addCategory')}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {isSubcategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenseCategories.parentCategory') || 'Parent Category'}
                      </label>
                      <select
                        value={formData.parent_category_id || ''}
                        onChange={(e) => {
                          const parentId = e.target.value ? parseInt(e.target.value) : null;
                          setFormData({ ...formData, parent_category_id: parentId });
                          setSelectedParentCategory(parentId);
                        }}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        required
                      >
                        <option value="">{t('expenseCategories.selectParentCategory') || 'Select parent category...'}</option>
                        {categories
                          .filter(cat => !cat.parent_category_id && cat.id !== selectedCategory?.id)
                          .map(cat => (
                            <option key={cat.id} value={cat.id}>
                              {getCategoryName(cat)}
                            </option>
                          ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      English Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_en}
                      onChange={(e) => setFormData({ ...formData, name_en: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Groceries"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      German Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_de}
                      onChange={(e) => setFormData({ ...formData, name_de: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Lebensmittel"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Turkish Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_tr}
                      onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., Market"
                    />
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allow_sharing_with_external_persons}
                        onChange={(e) => setFormData({ ...formData, allow_sharing_with_external_persons: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenseCategories.allowSharingWithExternalPersons') || 'Allow sharing with external persons'}
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('expenseCategories.allowSharingHint') || 'If disabled, expenses in this category will not be shared with external users by default'}
                    </p>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <FieldRequirementsEditor
                      value={formData.field_requirements}
                      onChange={(value) => setFormData({ ...formData, field_requirements: value })}
                      entityType="expense"
                    />
                  </div>
                  {isSubcategory && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenseCategories.displayOrder') || 'Display Order'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('expenseCategories.displayOrderHint') || 'Lower numbers appear first'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setFormData({ 
                        name_en: '', 
                        name_de: '', 
                        name_tr: '', 
                        parent_category_id: null, 
                        display_order: 0,
                        allow_sharing_with_external_persons: true,
                        field_requirements: null
                      });
                      setIsSubcategory(false);
                      setSelectedParentCategory(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
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

      {/* Edit Category Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenseCategories.editCategory')}
              </h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('expenseCategories.parentCategory') || 'Parent Category'} ({t('common.optional') || 'Optional'})
                    </label>
                    <select
                      value={formData.parent_category_id || ''}
                      onChange={(e) => {
                        const parentId = e.target.value ? parseInt(e.target.value) : null;
                        setFormData({ ...formData, parent_category_id: parentId });
                        setSelectedParentCategory(parentId);
                        setIsSubcategory(parentId !== null);
                      }}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">{t('expenseCategories.noParent') || 'No parent (top-level category)'}</option>
                      {categories
                        .filter(cat => !cat.parent_category_id && cat.id !== selectedCategory?.id)
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {getCategoryName(cat)}
                          </option>
                        ))}
                    </select>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('expenseCategories.parentCategoryHint') || 'Select a parent to make this a subcategory, or leave empty for top-level'}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      English Name *
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
                      German Name *
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
                      Turkish Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name_tr}
                      onChange={(e) => setFormData({ ...formData, name_tr: e.target.value })}
                      className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.allow_sharing_with_external_persons}
                        onChange={(e) => setFormData({ ...formData, allow_sharing_with_external_persons: e.target.checked })}
                        className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenseCategories.allowSharingWithExternalPersons') || 'Allow sharing with external persons'}
                      </span>
                    </label>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      {t('expenseCategories.allowSharingHint') || 'If disabled, expenses in this category will not be shared with external users by default'}
                    </p>
                  </div>
                  <div className="border-t pt-4 mt-4">
                    <FieldRequirementsEditor
                      value={formData.field_requirements}
                      onChange={(value) => setFormData({ ...formData, field_requirements: value })}
                      entityType="expense"
                    />
                  </div>
                  {(isSubcategory || formData.parent_category_id) && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenseCategories.displayOrder') || 'Display Order'}
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.display_order}
                        onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                        className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        placeholder="0"
                      />
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('expenseCategories.displayOrderHint') || 'Lower numbers appear first'}
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setFormData({ 
                        name_en: '', 
                        name_de: '', 
                        name_tr: '', 
                        parent_category_id: null, 
                        display_order: 0,
                        allow_sharing_with_external_persons: true,
                        field_requirements: null
                      });
                      setSelectedCategory(null);
                      setIsSubcategory(false);
                      setSelectedParentCategory(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
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
      {showDeleteModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenseCategories.deleteCategory')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('expenseCategories.deleteConfirmation')}
                {selectedCategory && selectedCategory.expense_count > 0 && (
                  <span className="block mt-2 text-red-600 dark:text-red-400">
                    This category has {selectedCategory.expense_count} expense {selectedCategory.expense_count === 1 ? 'entry' : 'entries'} assigned to it.
                  </span>
                )}
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setSelectedCategory(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
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
  );
};

export default ExpenseCategoriesPage;

