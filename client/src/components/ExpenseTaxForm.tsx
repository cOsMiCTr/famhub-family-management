import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseAssetSelector from './ExpenseAssetSelector';

interface ExpenseTaxFormProps {
  linkedAssetId?: number;
  taxType?: string;
  onChange: (linkedAssetId: number | null, taxType?: string) => void;
  error?: string;
}

const ExpenseTaxForm: React.FC<ExpenseTaxFormProps> = ({
  linkedAssetId,
  taxType,
  onChange,
  error
}) => {
  const { t } = useTranslation();

  const handleAssetChange = (assetId: number | null) => {
    onChange(assetId, taxType);
  };

  const handleTaxTypeChange = (newTaxType: string) => {
    onChange(linkedAssetId || null, newTaxType || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('expenses.taxDescription')}
        </p>
      </div>

      {/* Tax Type (Subcategory) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.taxType') || 'Tax Type'} <span className="text-red-500">*</span>
        </label>
        <select
          value={taxType || ''}
          onChange={(e) => handleTaxTypeChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
          required
        >
          <option value="">{t('expenses.selectTaxType') || 'Select tax type...'}</option>
          <option value="income_tax">{t('expenses.taxTypes.incomeTax') || 'Income Tax'}</option>
          <option value="property_tax">{t('expenses.taxTypes.propertyTax') || 'Property Tax'}</option>
          <option value="sales_tax">{t('expenses.taxTypes.salesTax') || 'Sales Tax'}</option>
          <option value="other">{t('expenses.taxTypes.other') || 'Other'}</option>
        </select>
      </div>

      {taxType === 'property_tax' && (
        <ExpenseAssetSelector
          value={linkedAssetId}
          onChange={handleAssetChange}
          required={true}
          error={error}
        />
      )}

      {taxType !== 'property_tax' && (
        <div className="text-sm text-gray-500">
          {t('expenses.taxAssetOptional')}
        </div>
      )}
    </div>
  );
};

export default ExpenseTaxForm;

