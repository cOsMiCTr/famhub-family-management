import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { reloadTranslations } from '../i18n';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  CheckIcon,
  XMarkIcon,
  LanguageIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface Translation {
  id: number;
  translation_key: string;
  category: string;
  en: string;
  de: string;
  tr: string;
  created_at: string;
  updated_at: string;
}

const TranslationManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [translations, setTranslations] = useState<Translation[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  
  // Edit states
  const [editingTranslations, setEditingTranslations] = useState<{[key: number]: Partial<Translation>}>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Ref for search input to maintain focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  const loadTranslations = useCallback(async () => {
    try {
      setIsLoading(true);
      const category = selectedCategory === 'all' ? undefined : selectedCategory;
      const search = debouncedSearchTerm.trim() || undefined;
      const data = await apiService.getTranslations(category, search);
      setTranslations(data.translations);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load translations');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCategory, debouncedSearchTerm]);

  const loadCategories = useCallback(async () => {
    try {
      const data = await apiService.getTranslationCategories();
      setCategories(data.categories);
    } catch (err: any) {
      console.error('Failed to load categories:', err);
    }
  }, []);

  useEffect(() => {
    loadTranslations();
  }, [loadTranslations]);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  // Debounce search term with longer delay to prevent flashing
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // Maintain focus after state update
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  };

  const handleTranslationChange = (id: number, field: 'de' | 'tr', value: string) => {
    setEditingTranslations(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value
      }
    }));
    setHasChanges(true);
  };

  const saveAllChanges = async () => {
    try {
      setIsSaving(true);
      setError('');
      
      const translationsToUpdate = Object.entries(editingTranslations)
        .filter(([_, data]) => Object.keys(data).length > 0)
        .map(([id, data]) => ({
          id: parseInt(id),
          ...data
        }));

      if (translationsToUpdate.length === 0) {
        setMessage('No changes to save');
        return;
      }

      await apiService.bulkUpdateTranslations(translationsToUpdate);
      
      setMessage(`${translationsToUpdate.length} translations updated successfully`);
      setEditingTranslations({});
      setHasChanges(false);
      
      // Reload translations to get updated data
      loadTranslations();
      
      // Reload i18n translations to update the frontend immediately
      await reloadTranslations();
      
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save translations');
    } finally {
      setIsSaving(false);
    }
  };

  const resetChanges = () => {
    setEditingTranslations({});
    setHasChanges(false);
  };

  const getTranslationValue = (translation: Translation, field: 'de' | 'tr') => {
    const editingData = editingTranslations[translation.id];
    if (editingData && editingData[field] !== undefined) {
      return editingData[field] as string;
    }
    return translation[field] || translation.en;
  };

  const isTranslationChanged = (id: number, field: 'de' | 'tr') => {
    const editingData = editingTranslations[id];
    if (!editingData || editingData[field] === undefined) {
      return false;
    }
    const originalValue = translations.find(t => t.id === id)?.[field] || translations.find(t => t.id === id)?.en;
    return editingData[field] !== originalValue;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('translations.title')}</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            {t('translations.manageTranslations')}
          </p>
        </div>
        
        {hasChanges && (
          <div className="flex items-center space-x-3">
            <button
              onClick={resetChanges}
              className="btn-secondary flex items-center"
            >
              <XMarkIcon className="h-4 w-4 mr-2" />
              Reset Changes
            </button>
            <button
              onClick={saveAllChanges}
              disabled={isSaving}
              className="btn-primary flex items-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
            >
              {isSaving ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <CheckIcon className="h-4 w-4 mr-2" />
                  Save All Changes
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-300 text-sm">{message}</p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('common.search')}
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={handleSearchChange}
                className="form-input pl-10"
                placeholder={t('translations.searchPlaceholder')}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('translations.category')}
            </label>
            <div className="relative">
              <FunnelIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="form-input pl-10"
              >
                <option value="all">{t('translations.allCategories')}</option>
                {categories.map(category => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex items-end">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {translations.length} {t('translations.translationsFound')}
            </div>
          </div>
        </div>
      </div>

      {/* Translations Table */}
      <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center">
                    <LanguageIcon className="h-4 w-4 mr-1" />
                    English (Default)
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center">
                    <LanguageIcon className="h-4 w-4 mr-1" />
                    German
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  <div className="flex items-center">
                    <LanguageIcon className="h-4 w-4 mr-1" />
                    Turkish
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {translations.map((translation) => (
                <tr key={translation.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                      {translation.category}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-2 rounded">
                      {translation.en}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <textarea
                        value={getTranslationValue(translation, 'de')}
                        onChange={(e) => handleTranslationChange(translation.id, 'de', e.target.value)}
                        className={`w-full text-sm border rounded-md p-2 resize-none transition-colors ${
                          isTranslationChanged(translation.id, 'de')
                            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        } text-gray-900 dark:text-white`}
                        rows={2}
                        placeholder={t('translations.germanPlaceholder')}
                      />
                      {isTranslationChanged(translation.id, 'de') && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative">
                      <textarea
                        value={getTranslationValue(translation, 'tr')}
                        onChange={(e) => handleTranslationChange(translation.id, 'tr', e.target.value)}
                        className={`w-full text-sm border rounded-md p-2 resize-none transition-colors ${
                          isTranslationChanged(translation.id, 'tr')
                            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
                            : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700'
                        } text-gray-900 dark:text-white`}
                        rows={2}
                        placeholder={t('translations.turkishPlaceholder')}
                      />
                      {isTranslationChanged(translation.id, 'tr') && (
                        <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full"></div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {translations.length === 0 && (
          <div className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
            <DocumentTextIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No translations found</p>
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          {t('translations.instructions')}
        </h3>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• {t('translations.instruction1')}</li>
          <li>• {t('translations.instruction2')}</li>
          <li>• {t('translations.instruction3')}</li>
          <li>• {t('translations.instruction4')}</li>
          <li>• {t('translations.instruction5')}</li>
        </ul>
      </div>
    </div>
  );
};

export default TranslationManagementPage;