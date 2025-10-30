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
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          {t('expenses.taxDescription')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('expenses.taxType')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={taxType || ''}
          onChange={(e) => handleTaxTypeChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        >
          <option value="">{t('expenses.selectTaxType')}</option>
          <option value="income_tax">{t('expenses.taxTypes.incomeTax')}</option>
          <option value="property_tax">{t('expenses.taxTypes.propertyTax')}</option>
          <option value="other">{t('expenses.taxTypes.other')}</option>
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

