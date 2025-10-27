import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlassIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import type { AssetCategory } from '../utils/assetUtils';

interface SearchableAssetCategorySelectorProps {
  categories: AssetCategory[];
  selectedCategoryId: string;
  onCategoryChange: (categoryId: string) => void;
  error?: string;
  placeholder?: string;
  getCategoryIcon: (iconName: string) => React.ComponentType<any>;
}

const SearchableAssetCategorySelector: React.FC<SearchableAssetCategorySelectorProps> = ({
  categories,
  selectedCategoryId,
  onCategoryChange,
  error,
  placeholder,
  getCategoryIcon
}) => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCategories, setFilteredCategories] = useState<AssetCategory[]>(categories);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Get category name based on current language
  const getCategoryName = (category: AssetCategory) => {
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

  // Filter categories based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCategories(categories);
    } else {
      const filtered = categories.filter(category => {
        const name = getCategoryName(category).toLowerCase();
        const search = searchTerm.toLowerCase();
        return name.includes(search);
      });
      setFilteredCategories(filtered);
    }
  }, [searchTerm, categories, i18n.language]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Get selected category
  const selectedCategory = categories.find(cat => cat.id.toString() === selectedCategoryId);

  // Handle category selection
  const handleCategorySelect = (category: AssetCategory) => {
    onCategoryChange(category.id.toString());
    setIsOpen(false);
    setSearchTerm('');
  };

  // Handle dropdown toggle
  const handleToggle = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setSearchTerm('');
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Category *
      </label>
      
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={handleToggle}
        className={`w-full border rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-lg text-left flex items-center justify-between ${
          error 
            ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
            : 'border-gray-300 dark:border-gray-600'
        }`}
      >
        <div className="flex items-center">
          {selectedCategory ? (
            <>
              {(() => {
                const IconComponent = getCategoryIcon(selectedCategory.icon || 'CubeTransparentIcon');
                return (
                  <>
                    <IconComponent className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-3" />
                    <span>{getCategoryName(selectedCategory)}</span>
                  </>
                );
              })()}
            </>
          ) : (
            <span>{placeholder || 'Select a category'}</span>
          )}
        </div>
        <ChevronDownIcon 
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-700 shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-hidden focus:outline-none">
          {/* Search Input */}
          <div className="px-3 py-2 border-b border-gray-200 dark:border-gray-600">
            <div className="relative">
              <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search categories..."
                className="w-full pl-10 pr-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-600 dark:text-white"
              />
            </div>
          </div>

          {/* Categories List */}
          <div className="overflow-y-auto" style={{ maxHeight: '135px' }}>
            {filteredCategories.length > 0 ? (
              filteredCategories.map((category) => {
                const IconComponent = getCategoryIcon(category.icon || 'CubeTransparentIcon');
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => handleCategorySelect(category)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 flex items-center justify-between ${
                      selectedCategoryId === category.id.toString()
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-900 dark:text-blue-200'
                        : 'text-gray-900 dark:text-white'
                    }`}
                  >
                    <div className="flex items-center">
                      <IconComponent className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-3" />
                      <span>{getCategoryName(category)}</span>
                    </div>
                    {category.is_default && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Default
                      </span>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">
                No categories found
              </div>
            )}
          </div>

          {/* Quick Add Categories Hint */}
          {searchTerm && filteredCategories.length === 0 && (
            <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400 border-t border-gray-200 dark:border-gray-600">
              Category not found? Contact admin to add new categories.
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
};

export default SearchableAssetCategorySelector;
