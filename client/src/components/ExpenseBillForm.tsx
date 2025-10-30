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
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          {t('expenses.billDescription')}
        </p>
      </div>

      <ExpenseAssetSelector
        value={linkedAssetId}
        onChange={handleAssetChange}
        required={true}
        error={error}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('expenses.billType')}
        </label>
        <select
          value={billType || ''}
          onChange={(e) => handleBillTypeChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="">{t('expenses.selectBillType')}</option>
          <option value="electricity">{t('expenses.billTypes.electricity')}</option>
          <option value="water">{t('expenses.billTypes.water')}</option>
          <option value="gas">{t('expenses.billTypes.gas')}</option>
          <option value="maintenance">{t('expenses.billTypes.maintenance')}</option>
          <option value="rent">{t('expenses.billTypes.rent')}</option>
          <option value="other">{t('expenses.billTypes.other')}</option>
        </select>
      </div>
    </div>
  );
};

export default ExpenseBillForm;

