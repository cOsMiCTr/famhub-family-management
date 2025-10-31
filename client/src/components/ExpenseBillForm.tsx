import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseAssetSelector from './ExpenseAssetSelector';

interface ExpenseBillFormProps {
  linkedAssetId?: number;
  billType?: string;
  onChange: (linkedAssetId: number | null, billType?: string) => void;
  error?: string;
}

const ExpenseBillForm: React.FC<ExpenseBillFormProps> = ({
  linkedAssetId,
  billType,
  onChange,
  error
}) => {
  const { t } = useTranslation();

  const handleAssetChange = (assetId: number | null) => {
    onChange(assetId, billType);
  };

  const handleBillTypeChange = (newBillType: string) => {
    onChange(linkedAssetId || null, newBillType || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('expenses.billDescription')}
        </p>
      </div>

      <ExpenseAssetSelector
        value={linkedAssetId}
        onChange={handleAssetChange}
        required={true}
        error={error}
      />

      {/* Bill Type (Subcategory) - Optional, stored in metadata */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.billType') || 'Bill Type'} <span className="text-gray-500 text-xs">({t('expenses.optional') || 'Optional'})</span>
        </label>
        <select
          value={billType || ''}
          onChange={(e) => handleBillTypeChange(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
        >
          <option value="">{t('expenses.selectBillType') || 'Select bill type...'}</option>
          <option value="electricity">{t('expenses.billTypes.electricity') || 'Electricity'}</option>
          <option value="water">{t('expenses.billTypes.water') || 'Water'}</option>
          <option value="gas">{t('expenses.billTypes.gas') || 'Gas'}</option>
          <option value="maintenance">{t('expenses.billTypes.maintenance') || 'Maintenance'}</option>
          <option value="rent">{t('expenses.billTypes.rent') || 'Rent'}</option>
          <option value="internet">{t('expenses.billTypes.internet') || 'Internet'}</option>
          <option value="other">{t('expenses.billTypes.other') || 'Other'}</option>
        </select>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('expenses.billTypeHint') || 'Optional: Specify the type of bill for better categorization'}
        </p>
      </div>
    </div>
  );
};

export default ExpenseBillForm;

