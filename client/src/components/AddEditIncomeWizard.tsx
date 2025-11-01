import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyContext } from '../contexts/CurrencyContext';
import { XMarkIcon, ArrowRightIcon, ArrowLeftIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface IncomeEntry {
  id?: number;
  household_member_id?: number | null;
  category_id: number;
  amount: number;
  currency: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_recurring: boolean;
  frequency?: string;
}

interface IncomeCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  field_requirements?: Record<string, any>;
}

interface HouseholdMember {
  id: number;
  name: string;
}

interface AddEditIncomeWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  income?: IncomeEntry | null;
  categories: IncomeCategory[];
  members: HouseholdMember[];
}

const AddEditIncomeWizard: React.FC<AddEditIncomeWizardProps> = ({
  isOpen,
  onClose,
  onSave,
  income,
  categories,
  members
}) => {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { allCurrencies, activeCurrencies } = useCurrencyContext();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;
  
  // Form state
  const [formData, setFormData] = useState({
    category_id: '',
    household_member_id: '',
    amount: '',
    currency: user?.main_currency || activeCurrencies[0]?.code || 'USD',
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    is_recurring: false,
    frequency: 'monthly'
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Get selected category
  const selectedCategory = categories.find(cat => cat.id.toString() === formData.category_id);
  
  // Get fields to show based on field requirements
  const visibleFields = useMemo(() => {
    if (!selectedCategory?.field_requirements) {
      // Default visible fields if no field requirements
      return {
        household_member_id: true,
        amount: true,
        currency: true,
        description: true,
        start_date: true,
        end_date: true,
        is_recurring: true,
        frequency: true
      };
    }
    
    const reqs = selectedCategory.field_requirements;
    return {
      household_member_id: reqs.household_member_id !== undefined,
      amount: reqs.amount !== undefined,
      currency: reqs.currency !== undefined,
      description: reqs.description !== undefined,
      start_date: reqs.start_date !== undefined,
      end_date: reqs.end_date !== undefined,
      is_recurring: reqs.is_recurring !== undefined,
      frequency: reqs.frequency !== undefined
    };
  }, [selectedCategory]);

  // Initialize form from income prop
  useEffect(() => {
    if (income) {
      setFormData({
        category_id: income.category_id.toString(),
        household_member_id: income.household_member_id?.toString() || '',
        amount: income.amount.toString(),
        currency: income.currency,
        description: income.description || '',
        start_date: income.start_date || new Date().toISOString().split('T')[0],
        end_date: income.end_date || '',
        is_recurring: income.is_recurring || false,
        frequency: income.frequency || 'monthly'
      });
      setCurrentStep(1);
    } else {
      setFormData({
        category_id: '',
        household_member_id: '',
        amount: '',
        currency: user?.main_currency || activeCurrencies[0]?.code || 'USD',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        end_date: '',
        is_recurring: false,
        frequency: 'monthly'
      });
      setCurrentStep(1);
    }
    setErrors([]);
  }, [income, isOpen, user?.main_currency, activeCurrencies]);

  const validateStep = (step: number): boolean => {
    const newErrors: string[] = [];
    const reqs = selectedCategory?.field_requirements || {};
    
    switch (step) {
      case 1: // Category selection
        if ((reqs.category_id?.required !== false) && !formData.category_id) {
          newErrors.push(t('income.categoryRequired') || 'Category is required');
        }
        break;
      case 2: // Amount & Currency
        if (reqs.amount?.required && (!formData.amount || parseFloat(formData.amount) <= 0)) {
          newErrors.push(t('income.amountRequired') || 'Valid amount is required');
        }
        if (reqs.currency?.required && !formData.currency) {
          newErrors.push(t('income.currencyRequired') || 'Currency is required');
        }
        break;
      case 3: // Timing
        if (reqs.start_date?.required && !formData.start_date) {
          newErrors.push(t('income.startDateRequired') || 'Start date is required');
        }
        if (formData.end_date && formData.end_date < formData.start_date) {
          newErrors.push(t('income.endDateAfterStart') || 'End date must be after start date');
        }
        if (formData.is_recurring && reqs.frequency?.required && !formData.frequency) {
          newErrors.push(t('income.frequencyRequired') || 'Frequency is required for recurring income');
        }
        break;
      case 4: // Member
        if (reqs.household_member_id?.required && !formData.household_member_id) {
          newErrors.push(t('income.memberRequired') || 'Household member is required');
        }
        break;
      case 5: // Confirmation
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
      const incomeData: any = {
        category_id: parseInt(formData.category_id),
        household_member_id: formData.household_member_id ? parseInt(formData.household_member_id) : null,
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        description: formData.description || null,
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        is_recurring: formData.is_recurring,
        frequency: formData.is_recurring ? formData.frequency : null
      };

      if (income?.id) {
        await apiService.updateIncome(income.id, incomeData);
      } else {
        await apiService.createIncome(incomeData);
      }

      onSave();
      onClose();
    } catch (error: any) {
      console.error('Error saving income:', error);
      setErrors([error.response?.data?.error || error.message || t('income.saveError') || 'Failed to save income']);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getCategoryName = (category: IncomeCategory) => {
    const lang = i18n.language as 'en' | 'de' | 'tr';
    return category[`name_${lang}`] || category.name_en;
  };

  const getMemberName = (memberId: string) => {
    const member = members.find(m => m.id.toString() === memberId);
    return member?.name || '';
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-6 border w-[95vw] max-w-3xl shadow-xl rounded-lg bg-white dark:bg-gray-800">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {income ? t('income.editIncome') : t('income.addIncome')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4, 5].map((step) => (
              <React.Fragment key={step}>
                <div className="flex items-center">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      currentStep >= step
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                  >
                    {currentStep > step ? (
                      <CheckCircleIcon className="h-6 w-6" />
                    ) : (
                      <span>{step}</span>
                    )}
                  </div>
                  {step < totalSteps && (
                    <div
                      className={`w-16 h-1 mx-2 ${
                        currentStep > step ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              </React.Fragment>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>{t('income.category') || 'Category'}</span>
            <span>{t('income.amount') || 'Amount'}</span>
            <span>{t('income.timing') || 'Timing'}</span>
            <span>{t('income.member') || 'Member'}</span>
            <span>{t('common.confirm') || 'Confirm'}</span>
          </div>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            {errors.map((error, index) => (
              <p key={index} className="text-sm text-red-600 dark:text-red-400">
                {error}
              </p>
            ))}
          </div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('income.selectCategory') || 'Select Income Category'}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {categories.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, category_id: category.id.toString() })}
                    className={`p-4 rounded-lg border-2 text-left transition-colors ${
                      formData.category_id === category.id.toString()
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    <div className="font-medium text-gray-900 dark:text-white">
                      {getCategoryName(category)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('income.amountAndCurrency') || 'Amount & Currency'}
              </h3>
              {visibleFields.amount && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.amount')} {selectedCategory?.field_requirements?.amount?.required && '*'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder="0.00"
                  />
                </div>
              )}
              {visibleFields.currency && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.currency')} {selectedCategory?.field_requirements?.currency?.required && '*'}
                  </label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {activeCurrencies.map((curr) => (
                      <option key={curr.code} value={curr.code}>
                        {curr.name} ({curr.symbol})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              {visibleFields.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.description')} {selectedCategory?.field_requirements?.description?.required && '*'}
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    placeholder={t('income.descriptionPlaceholder') || 'Optional description...'}
                  />
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('income.timing') || 'Timing'}
              </h3>
              {visibleFields.start_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.startDate')} {selectedCategory?.field_requirements?.start_date?.required && '*'}
                  </label>
                  <input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              {visibleFields.end_date && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.endDate')}
                  </label>
                  <input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    min={formData.start_date}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>
              )}
              {visibleFields.is_recurring && (
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.is_recurring}
                      onChange={(e) => setFormData({ ...formData, is_recurring: e.target.checked, frequency: e.target.checked ? formData.frequency : 'monthly' })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                      {t('income.isRecurring') || 'This is a recurring income'}
                    </span>
                  </label>
                </div>
              )}
              {visibleFields.frequency && formData.is_recurring && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.frequency')} {selectedCategory?.field_requirements?.frequency?.required && '*'}
                  </label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="monthly">{t('income.monthly') || 'Monthly'}</option>
                    <option value="weekly">{t('income.weekly') || 'Weekly'}</option>
                    <option value="yearly">{t('income.yearly') || 'Yearly'}</option>
                    <option value="one-time">{t('income.oneTime') || 'One-time'}</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('income.selectMember') || 'Select Household Member'}
              </h3>
              {visibleFields.household_member_id && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('income.member')} {selectedCategory?.field_requirements?.household_member_id?.required && '*'}
                  </label>
                  <select
                    value={formData.household_member_id}
                    onChange={(e) => setFormData({ ...formData, household_member_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">{t('income.selectMember') || 'Select member...'}</option>
                    {members.map((member) => (
                      <option key={member.id} value={member.id}>
                        {member.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {currentStep === 5 && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                {t('common.confirm') || 'Confirm'}
              </h3>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('income.category')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedCategory ? getCategoryName(selectedCategory) : '-'}
                  </span>
                </div>
                {visibleFields.amount && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('income.amount')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.amount} {formData.currency}
                    </span>
                  </div>
                )}
                {visibleFields.description && formData.description && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('income.description')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formData.description}</span>
                  </div>
                )}
                {visibleFields.start_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('income.startDate')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formData.start_date}</span>
                  </div>
                )}
                {visibleFields.end_date && formData.end_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('income.endDate')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formData.end_date}</span>
                  </div>
                )}
                {visibleFields.is_recurring && formData.is_recurring && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('income.frequency')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formData.frequency}</span>
                  </div>
                )}
                {visibleFields.household_member_id && formData.household_member_id && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">{t('income.member')}:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {getMemberName(formData.household_member_id)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8">
          <button
            type="button"
            onClick={currentStep === 1 ? onClose : prevStep}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            {currentStep === 1 ? (t('common.cancel') || 'Cancel') : (t('common.back') || 'Back')}
          </button>
          <div className="flex space-x-3">
            {currentStep < totalSteps ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
              >
                {t('common.next') || 'Next'} <ArrowRightIcon className="inline h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
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

export default AddEditIncomeWizard;

