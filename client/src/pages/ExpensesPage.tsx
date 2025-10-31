import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  ArrowDownCircleIcon,
  CalendarIcon,
  UserIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import LoadingSpinner from '../components/LoadingSpinner';
import SearchableCategorySelector from '../components/SearchableCategorySelector';
import ExpenseCategoryForm from '../components/ExpenseCategoryForm';
import { formatDate, formatCurrency } from '../utils/formatters';

interface ExpenseEntry {
  id: number;
  household_member_id?: number;
  category_id: number;
  amount: number;
  currency: string;
  source_currency?: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_recurring: boolean;
  frequency: string;
  category_name_en: string;
  category_name_de: string;
  category_name_tr: string;
  category_type?: string;
  has_custom_form?: boolean;
  requires_asset_link?: boolean;
  requires_member_link?: boolean;
  allows_multiple_members?: boolean;
  member_name?: string;
  member_is_shared?: boolean;
  created_at: string;
  amount_in_main_currency?: number;
  main_currency?: string;
  linked_asset_id?: number;
  linked_asset_name?: string;
  linked_member_ids?: number[];
  linked_member_names?: string[];
  credit_use_type?: 'free_use' | 'renovation' | 'property_purchase' | 'other';
  metadata?: Record<string, any>;
}

interface ExpenseCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  is_default: boolean;
  category_type?: string;
  has_custom_form?: boolean;
  requires_asset_link?: boolean;
  requires_member_link?: boolean;
  allows_multiple_members?: boolean;
}

interface HouseholdMember {
  id: number;
  name: string;
  is_shared: boolean;
}

interface ExpenseSummary {
  total: {
    total: number;
    count: number;
  };
  breakdown: Array<{
    member_id?: number;
    member_name?: string;
    member_is_shared?: boolean;
    category_id?: number;
    category_name_en?: string;
    category_name_de?: string;
    category_name_tr?: string;
    total: number;
    count: number;
  }>;
  breakdown_by_assets?: Array<{
    asset_id: number;
    asset_name: string;
    asset_location?: string;
    total: number;
    count: number;
    average: number;
  }>;
  breakdown_by_credit_type?: Array<{
    credit_use_type: string;
    total: number;
    count: number;
    average: number;
  }>;
  breakdown_by_category_type?: Array<{
    category_type: string;
    total: number;
    count: number;
    average: number;
  }>;
  statistics: {
    total_amount: number;
    total_entries: number;
    average_amount: number;
    min_amount: number;
    max_amount: number;
    recurring_count: number;
    one_time_count: number;
    recurring_total: number;
    one_time_total: number;
    monthly_recurring_total: number;
  };
}

const ExpensesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [expenseEntries, setExpenseEntries] = useState<ExpenseEntry[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [summary, setSummary] = useState<ExpenseSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [linkableAssets, setLinkableAssets] = useState<Array<{id: number; name: string; location?: string}>>([]);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showNoMembersWarning, setShowNoMembersWarning] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<ExpenseEntry | null>(null);
  const [filters, setFilters] = useState({
    start_date: '',
    end_date: '',
    member_id: '',
    category_id: '',
    is_recurring: '',
    linked_asset_id: '',
    linked_member_ids: [] as number[],
    credit_use_type: '',
    category_type: ''
  });
  
  // Local state for date inputs to prevent focus loss
  const [localDateFilters, setLocalDateFilters] = useState({
    start_date: '',
    end_date: ''
  });
  
  // Refs for debouncing timeouts
  const startDateTimeoutRef = useRef<number | null>(null);
  const endDateTimeoutRef = useRef<number | null>(null);
  
  // Ref to store the latest setFilters function
  const setFiltersRef = useRef(setFilters);
  setFiltersRef.current = setFilters;
  
  const [userPreferences, setUserPreferences] = useState<{currency?: string} | null>(null);
  
  const [formData, setFormData] = useState({
    household_member_id: '',
    category_id: '',
    amount: '',
    currency: userPreferences?.currency || 'USD',
    description: '',
    start_date: '',
    end_date: '',
    is_recurring: false,
    frequency: 'one-time'
  });

  // Custom form fields for enhanced expense categories
  const [customFormData, setCustomFormData] = useState({
    linkedMemberIds: [] as number[],
    linkedAssetId: undefined as number | undefined,
    creditUseType: '' as 'free_use' | 'renovation' | 'property_purchase' | 'other' | '',
    metadata: {} as Record<string, any>
  });

  // Get selected category details
  const selectedCategory = categories.find(cat => cat.id.toString() === formData.category_id);

  // Debounced update functions for date filters
  const debouncedUpdateStartDate = useCallback((value: string) => {
    if (startDateTimeoutRef.current) {
      clearTimeout(startDateTimeoutRef.current);
    }
    startDateTimeoutRef.current = setTimeout(() => {
      setFiltersRef.current(prev => ({ ...prev, start_date: value }));
    }, 500);
  }, []);

  const debouncedUpdateEndDate = useCallback((value: string) => {
    if (endDateTimeoutRef.current) {
      clearTimeout(endDateTimeoutRef.current);
    }
    endDateTimeoutRef.current = setTimeout(() => {
      setFiltersRef.current(prev => ({ ...prev, end_date: value }));
    }, 500);
  }, []);

  // Handle date input changes
  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalDateFilters(prev => ({ ...prev, start_date: value }));
    debouncedUpdateStartDate(value);
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalDateFilters(prev => ({ ...prev, end_date: value }));
    debouncedUpdateEndDate(value);
  };

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (startDateTimeoutRef.current) {
        clearTimeout(startDateTimeoutRef.current);
      }
      if (endDateTimeoutRef.current) {
        clearTimeout(endDateTimeoutRef.current);
      }
    };
  }, []);

  // Load data
  const loadData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      // Load expense entries with filters
      const expenseParams = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          if (key === 'linked_member_ids' && Array.isArray(value) && value.length > 0) {
            // For array values, append multiple times
            value.forEach(v => expenseParams.append(key, v.toString()));
          } else if (!Array.isArray(value)) {
            expenseParams.append(key, value.toString());
          }
        }
      });
      
      const [expenseRes, categoriesRes, membersRes, summaryRes, settingsRes, assetsRes] = await Promise.all([
        fetch(`/api/expenses?${expenseParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/expense-categories', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/household-members', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`/api/expenses/summary?${expenseParams}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/expenses/linkable-assets', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (!expenseRes.ok || !categoriesRes.ok || !membersRes.ok || !summaryRes.ok || !settingsRes.ok) {
        throw new Error('Failed to load data');
      }

      const [expenseData, categoriesData, membersData, summaryData, settingsData, assetsData] = await Promise.all([
        expenseRes.json(),
        categoriesRes.json(),
        membersRes.json(),
        summaryRes.json(),
        settingsRes.json(),
        assetsRes.ok ? assetsRes.json() : Promise.resolve([])
      ]);

      setExpenseEntries(expenseData);
      setCategories(categoriesData);
      setMembers(membersData);
      setSummary(summaryData);
      setUserPreferences({ currency: settingsData.user.main_currency });
      setLinkableAssets(assetsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load expense data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters]);

  // Update form data currency when user preferences are loaded
  useEffect(() => {
    if (userPreferences?.currency && !showAddModal && !showEditModal) {
      setFormData(prev => ({
        ...prev,
        currency: userPreferences.currency || 'USD'
      }));
    }
  }, [userPreferences, showAddModal, showEditModal]);

  // Validate form with custom messages
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    // Standard validations
    if (!formData.category_id) {
      errors.category_id = t('expenses.selectCategory');
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      errors.amount = t('expenses.amountRequired');
    }
    if (!formData.start_date) {
      errors.start_date = t('expenses.startDateRequired');
    }
    
    // Category-specific validations
    if (selectedCategory) {
      // Check member requirement (only if category explicitly requires it)
      if (selectedCategory.requires_member_link) {
        if (selectedCategory.category_type === 'gift') {
          // For gifts, check linked_member_ids
          if (!customFormData.linkedMemberIds || customFormData.linkedMemberIds.length === 0) {
            errors.linkedMembers = t('expenses.memberLinkRequired');
          }
        } else {
          // For other categories that require member link, check household_member_id
          if (!formData.household_member_id) {
            errors.household_member_id = t('expenses.memberLinkRequired');
          }
        }
      }
      // All other categories can belong to household (household_member_id is optional)

      // Check asset requirement
      if (selectedCategory.requires_asset_link && !customFormData.linkedAssetId) {
        errors.linkedAsset = t('expenses.propertyLinkRequired');
      }

      // Check credit use type
      if (selectedCategory.category_type === 'credit' && !customFormData.creditUseType) {
        errors.creditUseType = t('expenses.creditUseTypeRequired');
      }
    }
    // No fallback validation - household_member_id is optional
    
    // Date validation
    if (formData.start_date && formData.end_date) {
      const startDate = new Date(formData.start_date);
      const endDate = new Date(formData.end_date);
      if (endDate <= startDate) {
        errors.end_date = t('expenses.endDateAfterStart');
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Clear previous validation errors
    setValidationErrors({});
    
    // Validate form
    if (!validateForm()) {
      return;
    }
    
    try {
      const url = selectedEntry 
        ? `/api/expenses/${selectedEntry.id}`
        : '/api/expenses';
      
      const method = selectedEntry ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          ...formData,
          amount: parseFloat(formData.amount),
          household_member_id: selectedCategory?.category_type === 'gift' ? null : (formData.household_member_id ? parseInt(formData.household_member_id) : null),
          category_id: parseInt(formData.category_id),
          end_date: formData.end_date || null,
          linked_asset_id: customFormData.linkedAssetId || null,
          linked_member_ids: customFormData.linkedMemberIds.length > 0 ? customFormData.linkedMemberIds : undefined,
          credit_use_type: customFormData.creditUseType || undefined,
          metadata: Object.keys(customFormData.metadata).length > 0 ? customFormData.metadata : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save expense entry');
      }

      await loadData();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedEntry(null);
      setFormData({
        household_member_id: '',
        category_id: '',
        amount: '',
        currency: userPreferences?.currency || 'USD',
        description: '',
        start_date: '',
        end_date: '',
        is_recurring: false,
        frequency: 'one-time'
      });
    } catch (error) {
      console.error('Error saving expense entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to save expense entry');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedEntry) return;

    try {
      const response = await fetch(`/api/expenses/${selectedEntry.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete expense entry');
      }

      await loadData();
      setShowDeleteModal(false);
      setSelectedEntry(null);
    } catch (error) {
      console.error('Error deleting expense entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete expense entry');
    }
  };

  // Handle edit
  const handleEdit = (entry: ExpenseEntry) => {
    setSelectedEntry(entry);
    
    // Handle contradictory data: if is_recurring is true but frequency is one-time, treat as monthly
    const effectiveFrequency = (entry.is_recurring && entry.frequency === 'one-time') ? 'monthly' : entry.frequency;
    
    // Format dates for HTML date input (YYYY-MM-DD)
    const formatDateForInput = (dateString: string | null | undefined): string => {
      if (!dateString) return '';
      const date = new Date(dateString);
      return date.toISOString().split('T')[0];
    };
    
    setFormData({
      household_member_id: entry.household_member_id?.toString() || '',
      category_id: entry.category_id.toString(),
      amount: entry.amount.toString(),
      currency: entry.currency,
      description: entry.description || '',
      start_date: formatDateForInput(entry.start_date),
      end_date: formatDateForInput(entry.end_date),
      is_recurring: entry.is_recurring,
      frequency: effectiveFrequency
    });
    // Load custom form data from entry
    setCustomFormData({
      linkedMemberIds: entry.linked_member_ids || [],
      linkedAssetId: entry.linked_asset_id,
      creditUseType: entry.credit_use_type || '',
      metadata: entry.metadata || {}
    });
    setShowEditModal(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (entry: ExpenseEntry) => {
    setSelectedEntry(entry);
    setShowDeleteModal(true);
  };

  // Get frequency display name and styling
  const getFrequencyDisplay = useCallback((entry: ExpenseEntry) => {
    const frequencyMap: { [key: string]: string } = {
      'monthly': t('expenses.monthly'),
      'weekly': t('expenses.weekly'),
      'yearly': t('expenses.yearly'),
      'one-time': t('expenses.oneTime')
    };

    // Handle contradictory data: if is_recurring is true but frequency is one-time, treat as monthly
    const effectiveFrequency = (entry.is_recurring && entry.frequency === 'one-time') ? 'monthly' : entry.frequency;
    const displayText = frequencyMap[effectiveFrequency] || effectiveFrequency;
    
    // Different colors for different frequency types
    const getFrequencyStyle = (frequency: string, isRecurring: boolean) => {
      // Handle contradictory data: if is_recurring is true but frequency is one-time, treat as recurring
      const effectiveFrequency = (isRecurring && frequency === 'one-time') ? 'monthly' : frequency;
      
      if (!isRecurring) {
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      }
      
      switch (effectiveFrequency) {
        case 'monthly':
          return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'weekly':
          return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'yearly':
          return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'one-time':
          return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
        default:
          return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      }
    };

    return {
      text: displayText,
      style: getFrequencyStyle(entry.frequency, entry.is_recurring)
    };
  }, [t]);

  // Get category name based on current language
  const getCategoryName = useCallback((entry: ExpenseEntry) => {
    const lang = i18n.language;
    
    switch (lang) {
      case 'de':
        return entry.category_name_de;
      case 'tr':
        return entry.category_name_tr;
      default:
        return entry.category_name_en;
    }
  }, [i18n.language]);

  // Get category name for dropdown options
  const getCategoryDisplayName = useCallback((category: ExpenseCategory) => {
    const lang = i18n.language;
    
    switch (lang) {
      case 'de':
        return category.name_de;
      case 'tr':
        return category.name_tr;
      default:
        return category.name_en;
    }
  }, [i18n.language]);

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
                {t('expenses.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('expenses.manageHouseholdExpenses')}
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowSummaryModal(true)}
                className="btn-secondary"
              >
                <ChartBarIcon className="h-5 w-5 mr-2" />
                {t('expenses.summary')}
              </button>
              <button
                onClick={() => {
                  // Check if there are any family members
                  if (members.length === 0) {
                    setShowNoMembersWarning(true);
                    return;
                  }
                  setShowAddModal(true);
                  // Reset custom form data
                  setCustomFormData({
                    linkedMemberIds: [],
                    linkedAssetId: undefined,
                    creditUseType: '',
                    metadata: {}
                  });
                  // Set currency to user's preference when opening add modal
                  if (userPreferences?.currency) {
                    setFormData(prev => ({
                      ...prev,
                      currency: userPreferences.currency || 'USD'
                    }));
                  }
                }}
                className="btn-primary"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t('expenses.addExpense')}
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            {t('common.filter')}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.startDate')}
              </label>
              <input
                type="date"
                value={localDateFilters.start_date}
                onChange={handleStartDateChange}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.endDate')}
              </label>
              <input
                type="date"
                value={localDateFilters.end_date}
                onChange={handleEndDateChange}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.member')}
              </label>
              <select
                value={filters.member_id}
                onChange={(e) => setFilters({ ...filters, member_id: e.target.value })}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('expenses.allMembers')}</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.category')}
              </label>
              <select
                value={filters.category_id}
                onChange={(e) => setFilters({ ...filters, category_id: e.target.value })}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('expenseCategories.allCategories')}</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {getCategoryDisplayName(category)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.isRecurring')}
              </label>
              <select
                value={filters.is_recurring}
                onChange={(e) => setFilters({ ...filters, is_recurring: e.target.value })}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('expenses.all')}</option>
                <option value="true">{t('expenses.recurringOnly')}</option>
                <option value="false">{t('expenses.oneTimeOnly')}</option>
              </select>
            </div>
          </div>
          
          {/* Enhanced Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.filterByProperty')}
              </label>
              <select
                value={filters.linked_asset_id}
                onChange={(e) => setFilters({ ...filters, linked_asset_id: e.target.value })}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('expenses.allProperties')}</option>
                {linkableAssets.map((asset) => (
                  <option key={asset.id} value={asset.id}>
                    {asset.name} {asset.location ? `(${asset.location})` : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.filterByCreditType')}
              </label>
              <select
                value={filters.credit_use_type}
                onChange={(e) => setFilters({ ...filters, credit_use_type: e.target.value })}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('expenses.allCreditTypes')}</option>
                <option value="free_use">{t('expenses.creditUseTypes.free_use')}</option>
                <option value="renovation">{t('expenses.creditUseTypes.renovation')}</option>
                <option value="property_purchase">{t('expenses.creditUseTypes.property_purchase')}</option>
                <option value="other">{t('expenses.creditUseTypes.other')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.filterByCategoryType')}
              </label>
              <select
                value={filters.category_type}
                onChange={(e) => setFilters({ ...filters, category_type: e.target.value })}
                className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="">{t('expenses.allCategoryTypes')}</option>
                <option value="gift">{t('expenses.categoryTypes.gift')}</option>
                <option value="credit">{t('expenses.categoryTypes.credit')}</option>
                <option value="bill">{t('expenses.categoryTypes.bill')}</option>
                <option value="tax">{t('expenses.categoryTypes.tax')}</option>
                <option value="insurance">{t('expenses.categoryTypes.insurance')}</option>
                <option value="subscription">{t('expenses.categoryTypes.subscription')}</option>
                <option value="school">{t('expenses.categoryTypes.school')}</option>
                <option value="bausparvertrag">{t('expenses.categoryTypes.bausparvertrag')}</option>
                <option value="other">{t('expenses.categoryTypes.other')}</option>
              </select>
            </div>
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
                    className="btn-danger text-xs px-3 py-2 min-h-[36px]"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Expense Entries List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {expenseEntries.length === 0 ? (
            <div className="text-center py-12">
              <ArrowDownCircleIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('expenses.noExpensesFound')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('expenses.getStartedDescription')}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.category')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.member')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.amount')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.period')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.frequency')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('expenses.actions')}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {expenseEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {getCategoryName(entry)}
                        </div>
                        {entry.description && (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {entry.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center flex-wrap gap-2">
                          {entry.category_type === 'gift' && entry.linked_member_names && entry.linked_member_names.length > 0 ? (
                            // For gifts, show linked members
                            entry.linked_member_names.map((name, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                                <UserIcon className="h-3 w-3 mr-1" />
                                {name}
                              </span>
                            ))
                          ) : (
                            // For other expenses, show regular member or household
                            <>
                              <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                              <div className="text-sm text-gray-900 dark:text-white">
                                {entry.member_name || t('expenses.household')}
                                {entry.member_is_shared && (
                                  <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                    Shared
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                        {/* Show linked asset if present */}
                        {entry.linked_asset_name && (
                          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                            <BuildingOfficeIcon className="h-3 w-3 inline mr-1" />
                            {entry.linked_asset_name}
                          </div>
                        )}
                        {/* Show credit use type if present */}
                        {entry.credit_use_type && (
                          <div className="mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {t(`expenses.creditUseTypes.${entry.credit_use_type}`)}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {entry.amount_in_main_currency ? formatCurrency(entry.amount_in_main_currency, entry.main_currency || 'USD') : formatCurrency(entry.amount, entry.currency)}
                        </div>
                        {entry.amount_in_main_currency && entry.currency !== entry.main_currency && (
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            ≈ {formatCurrency(entry.amount, entry.currency)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          {formatDate(entry.start_date)}
                        </div>
                        {entry.end_date ? (
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {t('expenses.to')} {formatDate(entry.end_date)}
                          </div>
                        ) : (
                          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            {t('expenses.ongoing')}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 dark:text-white">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getFrequencyDisplay(entry).style}`}>
                            {getFrequencyDisplay(entry).text}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(entry)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title={t('expenses.editExpense')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDeleteClick(entry)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title={t('expenses.deleteExpense')}
                          >
                            <TrashIcon className="h-5 w-5" />
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

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-4 border w-[95vw] max-w-2xl shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {selectedEntry ? t('expenses.editExpense') : t('expenses.addExpense')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenses.member')}
                      </label>
                      <select
                        value={formData.household_member_id}
                        onChange={(e) => setFormData({ ...formData, household_member_id: e.target.value })}
                        className={`mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white ${
                          validationErrors.household_member_id ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                        }`}
                      >
                        <option value="">{t('expenses.household')}</option>
                        {members.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.name}
                          </option>
                        ))}
                      </select>
                      {validationErrors.household_member_id && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {validationErrors.household_member_id}
                        </p>
                      )}
                    </div>
                    
                    <SearchableCategorySelector
                      categories={categories.map(cat => ({
                        id: cat.id,
                        name_en: cat.name_en,
                        name_de: cat.name_de,
                        name_tr: cat.name_tr,
                        is_default: cat.is_default || false
                      }))}
                      selectedCategoryId={formData.category_id}
                      onCategoryChange={(categoryId) => setFormData({ ...formData, category_id: categoryId })}
                      error={validationErrors.category_id}
                      placeholder={t('expenses.selectCategory')}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenses.amount')} *
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        autoComplete="off"
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        className={`mt-1 block w-full px-3 py-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base ${
                          validationErrors.amount ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {validationErrors.amount && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {validationErrors.amount}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenses.currency')} *
                      </label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                        className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      >
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                        <option value="TRY">Turkish Lira (₺)</option>
                        <option value="GOLD">Gold (Au)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('expenses.description')}
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenses.startDate')} *
                      </label>
                      <input
                        type="date"
                        value={formData.start_date}
                        onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                        className={`mt-1 block w-full px-3 py-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base ${
                          validationErrors.start_date ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {validationErrors.start_date && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {validationErrors.start_date}
                        </p>
                      )}
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t('expenses.endDate')}
                      </label>
                      <input
                        type="date"
                        value={formData.end_date}
                        onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                        className={`mt-1 block w-full px-3 py-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white text-base ${
                          validationErrors.end_date ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {validationErrors.end_date && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                          {validationErrors.end_date}
                        </p>
                      )}
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {t('expenses.leaveEmptyForOngoing')}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.is_recurring}
                        onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label className="ml-2 block text-sm text-gray-900 dark:text-white">
                        {t('expenses.isRecurring')}
                      </label>
                    </div>
                    
                    {formData.is_recurring && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                          {t('expenses.frequency')}
                        </label>
                        <select
                          value={formData.frequency}
                          onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                          className="mt-1 block w-full px-3 border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        >
                          <option value="monthly">{t('expenses.monthly')}</option>
                          <option value="weekly">{t('expenses.weekly')}</option>
                          <option value="yearly">{t('expenses.yearly')}</option>
                          <option value="one-time">{t('expenses.oneTime')}</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* Custom Form Component based on Category Type */}
                  {selectedCategory?.has_custom_form && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <ExpenseCategoryForm
                        categoryType={selectedCategory.category_type}
                        linkedMemberIds={customFormData.linkedMemberIds}
                        linkedAssetId={customFormData.linkedAssetId}
                        creditUseType={customFormData.creditUseType}
                        metadata={customFormData.metadata}
                        onLinkedMembersChange={(memberIds) => setCustomFormData({ ...customFormData, linkedMemberIds: memberIds })}
                        onLinkedAssetChange={(assetId) => setCustomFormData({ ...customFormData, linkedAssetId: assetId || undefined })}
                        onCreditUseTypeChange={(useType, assetId) => setCustomFormData({ 
                          ...customFormData, 
                          creditUseType: useType,
                          linkedAssetId: assetId
                        })}
                        onMetadataChange={(metadata) => setCustomFormData({ ...customFormData, metadata })}
                        errors={{
                          linkedMembers: validationErrors.linkedMembers,
                          linkedAsset: validationErrors.linkedAsset,
                          creditUseType: validationErrors.creditUseType
                        }}
                      />
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedEntry(null);
                        setFormData({
                          household_member_id: '',
                          category_id: '',
                          amount: '',
                          currency: userPreferences?.currency || 'USD',
                          description: '',
                          start_date: '',
                          end_date: '',
                          is_recurring: false,
                          frequency: 'one-time'
                        });
                      }}
                      className="px-6 py-3 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 active:bg-gray-100 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600 dark:active:bg-gray-500 min-h-[44px] touch-action:manipulation"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 min-h-[44px] touch-action:manipulation"
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
        {showDeleteModal && selectedEntry && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {t('expenses.deleteExpense')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  {t('expenses.deleteConfirmation')}
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedEntry(null);
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

        {/* Summary Modal */}
        {showSummaryModal && summary && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('expenses.summary')}
                  </h3>
                  <button
                    onClick={() => setShowSummaryModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6">
                    <h4 className="text-lg font-medium text-red-900 dark:text-red-100 mb-2">
                      {t('expenses.totalExpenses')}
                    </h4>
                    <div className="text-3xl font-bold text-red-900 dark:text-red-100">
                      {summary.statistics.total_entries} {t('expenses.entries')}
                    </div>
                  </div>
                </div>

                {/* Enhanced KPIs */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                      {t('expenses.totalAmount')}
                    </h5>
                    <div className="text-xl font-bold text-red-900 dark:text-red-100">
                      {formatCurrency(summary.statistics.total_amount, userPreferences?.currency || 'USD')}
                    </div>
                  </div>
                  
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-purple-900 dark:text-purple-100 mb-1">
                      {t('expenses.averageAmount')}
                    </h5>
                    <div className="text-xl font-bold text-purple-900 dark:text-purple-100">
                      {formatCurrency(summary.statistics.average_amount, userPreferences?.currency || 'USD')}
                    </div>
                  </div>
                  
                  <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-orange-900 dark:text-orange-100 mb-1">
                      {t('expenses.recurringExpenses')}
                    </h5>
                    <div className="text-xl font-bold text-orange-900 dark:text-orange-100">
                      {summary.statistics.recurring_count} {t('expenses.entries')}
                    </div>
                    <div className="text-sm text-orange-700 dark:text-orange-300">
                      {formatCurrency(summary.statistics.recurring_total, userPreferences?.currency || 'USD')}
                    </div>
                  </div>
                  
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-indigo-900 dark:text-indigo-100 mb-1">
                      {t('expenses.monthlyExpenses')}
                    </h5>
                    <div className="text-xl font-bold text-indigo-900 dark:text-indigo-100">
                      {formatCurrency(summary.statistics.monthly_recurring_total, userPreferences?.currency || 'USD')}
                    </div>
                    <div className="text-sm text-indigo-700 dark:text-indigo-300">
                      {t('expenses.monthlyEquivalent')}
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
                      {t('expenses.oneTimeExpenses')}
                    </h5>
                    <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                      {summary.statistics.one_time_count} {t('expenses.entries')}
                    </div>
                    <div className="text-sm text-gray-700 dark:text-gray-300">
                      {formatCurrency(summary.statistics.one_time_total, userPreferences?.currency || 'USD')}
                    </div>
                  </div>
                </div>

                {summary.breakdown.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      {t('expenses.breakdown')}
                    </h4>
                    <div className="space-y-3">
                      {summary.breakdown.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.member_name || item.category_name_en}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {item.count} {t('expenses.entries')}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(item.total, userPreferences?.currency || 'USD')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown by Assets */}
                {summary.breakdown_by_assets && summary.breakdown_by_assets.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      {t('expenses.linkedAssets')}
                    </h4>
                    <div className="space-y-3">
                      {summary.breakdown_by_assets.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                          <div>
                            <div className="text-sm font-medium text-blue-900 dark:text-blue-100 flex items-center">
                              <BuildingOfficeIcon className="h-4 w-4 mr-2" />
                              {item.asset_name}
                              {item.asset_location && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-300">({item.asset_location})</span>
                              )}
                            </div>
                            <div className="text-sm text-blue-700 dark:text-blue-300">
                              {item.count} {t('expenses.entries')} • {t('expenses.averageAmount')}: {formatCurrency(item.average, userPreferences?.currency || 'USD')}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            {formatCurrency(item.total, userPreferences?.currency || 'USD')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown by Credit Type */}
                {summary.breakdown_by_credit_type && summary.breakdown_by_credit_type.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      {t('expenses.filterByCreditType')}
                    </h4>
                    <div className="space-y-3">
                      {summary.breakdown_by_credit_type.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                          <div>
                            <div className="text-sm font-medium text-green-900 dark:text-green-100">
                              {t(`expenses.creditUseTypes.${item.credit_use_type}`)}
                            </div>
                            <div className="text-sm text-green-700 dark:text-green-300">
                              {item.count} {t('expenses.entries')} • {t('expenses.averageAmount')}: {formatCurrency(item.average, userPreferences?.currency || 'USD')}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-green-900 dark:text-green-100">
                            {formatCurrency(item.total, userPreferences?.currency || 'USD')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown by Category Type */}
                {summary.breakdown_by_category_type && summary.breakdown_by_category_type.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                      {t('expenses.filterByCategoryType')}
                    </h4>
                    <div className="space-y-3">
                      {summary.breakdown_by_category_type.map((item, index) => (
                        <div key={index} className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                          <div>
                            <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                              {t(`expenses.categoryTypes.${item.category_type}`) || item.category_type}
                            </div>
                            <div className="text-sm text-purple-700 dark:text-purple-300">
                              {item.count} {t('expenses.entries')} • {t('expenses.averageAmount')}: {formatCurrency(item.average, userPreferences?.currency || 'USD')}
                            </div>
                          </div>
                          <div className="text-sm font-medium text-purple-900 dark:text-purple-100">
                            {formatCurrency(item.total, userPreferences?.currency || 'USD')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Members Warning Modal */}
      {showNoMembersWarning && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowNoMembersWarning(false)}></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                    {t('expenses.noMembersTitle') || 'No Family Members'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    {t('expenses.noMembersMessage') || 'You need to add at least one family member before you can add expense entries.'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                    {t('expenses.noMembersQuestion') || 'Would you like to go to Family Members and add one now?'}
                  </p>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => {
                    setShowNoMembersWarning(false);
                    navigate('/settings?tab=family-members');
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {t('expenses.goToFamilyMembers') || 'Go to Family Members'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNoMembersWarning(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensesPage;

