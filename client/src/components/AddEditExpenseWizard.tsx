import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyContext } from '../contexts/CurrencyContext';
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import ExpenseCategoryForm from './ExpenseCategoryForm';

interface ExpenseEntry {
  id?: number;
  household_member_id?: number | null;
  category_id: number;
  amount: number;
  currency: string;
  source_currency?: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_recurring: boolean;
  frequency?: string;
  linked_asset_id?: number;
  linked_member_ids?: number[];
  credit_use_type?: string;
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
  parent_category_id?: number;
  subcategories?: ExpenseCategory[];
}

interface HouseholdMember {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
}

interface AddEditExpenseWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (expenseData: any) => Promise<void>;
  expense?: ExpenseEntry | null;
  categories: ExpenseCategory[];
  members: HouseholdMember[];
  linkableAssets?: Array<{id: number; name: string; location?: string}>;
}

const AddEditExpenseWizard: React.FC<AddEditExpenseWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  expense,
  categories,
  members,
  linkableAssets = []
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { allCurrencies } = useCurrencyContext();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 6;
  
  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    subcategory_id: '',
    household_member_id: '',
    amount: '',
    currency: user?.main_currency || 'USD',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_recurring: false,
    frequency: 'monthly',
    // Category-specific data
    customFormData: {} as Record<string, any>
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [externalPersons, setExternalPersons] = useState<Array<{id: number; name: string}>>([]);
  const [insuranceSuggestions, setInsuranceSuggestions] = useState<Array<{name: string}>>([]);

  // Flatten categories for selection (handle hierarchical structure)
  const flatCategories = useMemo(() => {
    const flatten = (cats: ExpenseCategory[], result: ExpenseCategory[] = []): ExpenseCategory[] => {
      for (const cat of cats) {
        if (!cat.parent_category_id) {
          result.push(cat);
        }
        if (cat.subcategories && cat.subcategories.length > 0) {
          flatten(cat.subcategories, result);
        }
      }
      return result;
    };
    return flatten(categories);
  }, [categories]);

  // Get selected category
  const selectedCategory = flatCategories.find(cat => cat.id.toString() === formData.category_id);
  
  // Get subcategories for selected category
  const subcategories = useMemo(() => {
    if (!selectedCategory || !selectedCategory.parent_category_id) {
      // If selected is a parent, return its subcategories
      const parent = categories.find(cat => cat.id.toString() === formData.category_id && !cat.parent_category_id);
      return parent?.subcategories || [];
    }
    return [];
  }, [selectedCategory, formData.category_id, categories]);

  // Load external persons and insurance suggestions
  useEffect(() => {
    if (isOpen && selectedCategory?.category_type === 'gift') {
      loadExternalPersons();
    }
    if (isOpen && selectedCategory?.category_type === 'insurance') {
      loadInsuranceSuggestions();
    }
  }, [isOpen, selectedCategory?.category_type]);

  const loadExternalPersons = async () => {
    try {
      const response = await apiService.get('/external-persons');
      setExternalPersons(response.data || response || []);
    } catch (err) {
      console.error('Error loading external persons:', err);
    }
  };

  const loadInsuranceSuggestions = async () => {
    try {
      const response = await apiService.get('/expenses/insurance-companies-suggestions');
      setInsuranceSuggestions(response.data || response || []);
    } catch (err) {
      console.error('Error loading insurance suggestions:', err);
    }
  };

  // Reset form when modal opens/closes or expense changes
  useEffect(() => {
    if (isOpen) {
      if (expense) {
        setFormData({
          category_id: expense.category_id?.toString() || '',
          subcategory_id: '',
          household_member_id: expense.household_member_id?.toString() || '',
          amount: expense.amount?.toString() || '',
          currency: expense.currency || user?.main_currency || 'USD',
          description: expense.description || '',
          start_date: expense.start_date || new Date().toISOString().split('T')[0],
          end_date: expense.end_date || '',
          is_recurring: expense.is_recurring || false,
          frequency: expense.frequency || 'monthly',
          customFormData: {
            ...expense.metadata,
            linked_asset_id: expense.linked_asset_id,
            linked_member_ids: expense.linked_member_ids || [],
            credit_use_type: expense.credit_use_type
          }
        });
      } else {
        setFormData({
          category_id: '',
          subcategory_id: '',
          household_member_id: '',
          amount: '',
          currency: user?.main_currency || 'USD',
          description: '',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          is_recurring: false,
          frequency: 'monthly',
          customFormData: {}
        });
      }
      setErrors([]);
      setCurrentStep(1);
    }
  }, [isOpen, expense, user]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleCategoryChange = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: '' // Reset subcategory when parent changes
    }));
  };

  const handleSubcategoryChange = (subcategoryId: string) => {
    setFormData(prev => ({
      ...prev,
      subcategory_id: subcategoryId
    }));
  };

  const handleCustomFormDataChange = (data: Record<string, any>) => {
    setFormData(prev => ({
      ...prev,
      customFormData: { ...prev.customFormData, ...data }
    }));
  };

  const validateStep = (step: number): boolean => {
    const newErrors: string[] = [];
    
    switch (step) {
      case 1: // Category selection
        if (!formData.category_id) {
          newErrors.push(t('expenses.categoryRequired') || 'Category is required');
        }
        break;
      case 2: // Category-specific details
        // Validation handled by ExpenseCategoryForm component
        break;
      case 3: // Amount & Currency
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
          newErrors.push(t('expenses.amountRequired') || 'Valid amount is required');
        }
        if (!formData.currency) {
          newErrors.push(t('expenses.currencyRequired') || 'Currency is required');
        }
        break;
      case 4: // Timing
        if (!formData.start_date) {
          newErrors.push(t('expenses.startDateRequired') || 'Start date is required');
        }
        if (formData.end_date && formData.end_date < formData.start_date) {
          newErrors.push(t('expenses.endDateAfterStart') || 'End date must be after start date');
        }
        if (formData.is_recurring && !formData.frequency) {
          newErrors.push(t('expenses.frequencyRequired') || 'Frequency is required for recurring expenses');
        }
        break;
      case 5: // Ownership
        if (selectedCategory?.requires_member_link && !formData.household_member_id) {
          newErrors.push(t('expenses.memberRequired') || 'Member is required for this category');
        }
        break;
      case 6: // Confirmation
        // No validation needed
        break;
    }
    
    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep) && currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setErrors([]);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors([]);
    }
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setLoading(true);
    try {
      const expenseData: any = {
        category_id: parseInt(formData.subcategory_id || formData.category_id),
        household_member_id: formData.household_member_id ? parseInt(formData.household_member_id) : null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_recurring: formData.is_recurring,
        frequency: formData.is_recurring ? formData.frequency : null,
        ...formData.customFormData
      };

      await onSave(expenseData);
      onClose();
    } catch (err: any) {
      setErrors([err.response?.data?.error || t('expenses.saveError') || 'Failed to save expense']);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryName = (category: ExpenseCategory) => {
    const lang = i18n.language;
    switch (lang) {
      case 'de': return category.name_de;
      case 'tr': return category.name_tr;
      default: return category.name_en;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-medium text-gray-900 dark:text-white">
            {expense ? t('expenses.editExpense') || 'Edit Expense' : t('expenses.addExpense') || 'Add Expense'}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5, 6].map((step) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                      currentStep > step
                        ? 'bg-green-500 border-green-500 text-white'
                        : currentStep === step
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <span>{step}</span>
                    )}
                  </div>
                  <span className="mt-2 text-xs text-gray-600 dark:text-gray-400 text-center">
                    {step === 1 && (t('expenses.wizard.step1Title') || 'Category')}
                    {step === 2 && (t('expenses.wizard.step2Title') || 'Details')}
                    {step === 3 && (t('expenses.wizard.step3Title') || 'Amount')}
                    {step === 4 && (t('expenses.wizard.step4Title') || 'Timing')}
                    {step === 5 && (t('expenses.wizard.step5Title') || 'Ownership')}
                    {step === 6 && (t('expenses.wizard.step6Title') || 'Confirm')}
                  </span>
                </div>
                {step < totalSteps && (
                  <div
                    className={`flex-1 h-0.5 mx-2 ${
                      currentStep > step ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Error Display */}
        {errors.length > 0 && (
          <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
            <ul className="list-disc list-inside">
              {errors.map((err, idx) => (
                <li key={idx}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Step Content */}
        <div className="mb-6 min-h-[400px]">
          {/* Step 1: Category Selection */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenses.wizard.step1Title') || 'What is this expense?'}
              </h4>
              
              {/* Parent Category Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.category') || 'Category'} <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="">{t('expenses.selectCategory') || 'Select a category...'}</option>
                  {categories
                    .filter(cat => !cat.parent_category_id)
                    .map(cat => (
                      <option key={cat.id} value={cat.id.toString()}>
                        {getCategoryName(cat)}
                      </option>
                    ))}
                </select>
              </div>

              {/* Subcategory Selection (if category has subcategories) */}
              {subcategories.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('expenses.subcategory') || 'Subcategory'}
                  </label>
                  <select
                    value={formData.subcategory_id}
                    onChange={(e) => handleSubcategoryChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">{t('expenses.selectSubcategory') || 'Select a subcategory...'}</option>
                    {subcategories.map(subcat => (
                      <option key={subcat.id} value={subcat.id.toString()}>
                        {getCategoryName(subcat)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Category-Specific Details */}
          {currentStep === 2 && selectedCategory && (
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenses.wizard.step2Title') || 'Additional Details'}
              </h4>
              <ExpenseCategoryForm
                categoryType={selectedCategory.category_type || 'other'}
                linkedMemberIds={formData.customFormData.linked_member_ids || []}
                linkedAssetId={formData.customFormData.linked_asset_id}
                creditUseType={formData.customFormData.credit_use_type || ''}
                metadata={formData.customFormData}
                onLinkedMembersChange={(memberIds) => handleCustomFormDataChange({ linked_member_ids: memberIds })}
                onLinkedAssetChange={(assetId) => handleCustomFormDataChange({ linked_asset_id: assetId || undefined })}
                onCreditUseTypeChange={(useType, assetId) => {
                  const updates: any = { credit_use_type: useType };
                  if (assetId !== undefined) updates.linked_asset_id = assetId;
                  handleCustomFormDataChange(updates);
                }}
                onMetadataChange={handleCustomFormDataChange}
                members={members}
                insuranceSuggestions={insuranceSuggestions}
                errors={{
                  linkedMembers: errors.find(e => e.includes('member')) || undefined,
                  linkedAsset: errors.find(e => e.includes('asset') || e.includes('property')) || undefined,
                  creditUseType: errors.find(e => e.includes('credit')) || undefined
                }}
              />
            </div>
          )}

          {/* Step 3: Amount & Currency */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenses.wizard.step3Title') || 'Amount & Currency'}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.amount') || 'Amount'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.currency') || 'Currency'} <span className="text-red-500">*</span>
                </label>
                <select
                  name="currency"
                  value={formData.currency}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                >
                  {allCurrencies
                    .filter(c => c.is_active)
                    .map(c => (
                      <option key={c.code} value={c.code}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.description') || 'Description'}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          )}

          {/* Step 4: Timing */}
          {currentStep === 4 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenses.wizard.step4Title') || 'When does this expense occur?'}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.startDate') || 'Start Date'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.endDate') || 'End Date'} <span className="text-gray-500 text-xs">({t('expenses.optional') || 'Optional'})</span>
                </label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('expenses.leaveEmptyForOngoing') || 'Leave empty for ongoing expenses'}
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  {t('expenses.recurring') || 'This is a recurring expense'}
                </label>
              </div>

              {formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('expenses.frequency') || 'Frequency'} <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="frequency"
                    value={formData.frequency}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    required
                  >
                    <option value="daily">{t('expenses.daily') || 'Daily'}</option>
                    <option value="weekly">{t('expenses.weekly') || 'Weekly'}</option>
                    <option value="monthly">{t('expenses.monthly') || 'Monthly'}</option>
                    <option value="quarterly">{t('expenses.quarterly') || 'Quarterly'}</option>
                    <option value="yearly">{t('expenses.yearly') || 'Yearly'}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Ownership */}
          {currentStep === 5 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenses.wizard.step5Title') || 'Who does this expense belong to?'}
              </h4>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('expenses.member') || 'Member'}
                  {selectedCategory?.requires_member_link && <span className="text-red-500">*</span>}
                </label>
                <select
                  name="household_member_id"
                  value={formData.household_member_id}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required={selectedCategory?.requires_member_link}
                >
                  <option value="">{t('expenses.household') || 'Household'}</option>
                  {members.map(member => (
                    <option key={member.id} value={member.id.toString()}>
                      {member.first_name} {member.last_name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t('expenses.memberHint') || 'Select a member or leave as "Household" for shared expenses'}
                </p>
              </div>
            </div>
          )}

          {/* Step 6: Confirmation */}
          {currentStep === 6 && (
            <div className="space-y-4">
              <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('expenses.wizard.step6Title') || 'Review and Confirm'}
              </h4>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg space-y-2">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('expenses.category') || 'Category'}:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {selectedCategory ? getCategoryName(selectedCategory) : '-'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('expenses.amount') || 'Amount'}:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formData.currency} {formData.amount}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('expenses.startDate') || 'Start Date'}:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">{formData.start_date}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('expenses.isRecurring') || 'Recurring'}:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {formData.is_recurring ? t('common.yes') || 'Yes' : t('common.no') || 'No'}
                    </span>
                  </div>
                </div>
                {formData.description && (
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">{t('expenses.description') || 'Description'}:</span>
                    <p className="mt-1 text-gray-900 dark:text-white">{formData.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={prevStep}
                className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                {t('common.previous') || 'Previous'}
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              {t('common.cancel') || 'Cancel'}
            </button>
            
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('common.next') || 'Next'}
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
              >
                {loading ? (t('common.saving') || 'Saving...') : (t('common.save') || 'Save')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddEditExpenseWizard;

