import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseAssetSelector from './ExpenseAssetSelector';

interface ExpenseBausparvertragFormProps {
  linkedAssetId?: number;
  interestRate?: string;
  contractNumber?: string;
  onChange: (linkedAssetId: number | null, interestRate?: string, contractNumber?: string) => void;
  error?: string;
}

const ExpenseBausparvertragForm: React.FC<ExpenseBausparvertragFormProps> = ({
  linkedAssetId,
  interestRate,
  contractNumber,
  onChange,
  error
}) => {
  const { t } = useTranslation();

  const handleAssetChange = (assetId: number | null) => {
    onChange(assetId, interestRate, contractNumber);
  };

  const handleInterestRateChange = (newInterestRate: string) => {
    onChange(linkedAssetId || null, newInterestRate || undefined, contractNumber);
  };

  const handleContractNumberChange = (newContractNumber: string) => {
    onChange(linkedAssetId || null, interestRate, newContractNumber || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          {t('expenses.bausparvertragDescription')}
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
          {t('expenses.interestRate')}
        </label>
        <input
          type="text"
          value={interestRate || ''}
          onChange={(e) => handleInterestRateChange(e.target.value)}
          placeholder={t('expenses.interestRatePlaceholder')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('expenses.contractNumber')}
        </label>
        <input
          type="text"
          value={contractNumber || ''}
          onChange={(e) => handleContractNumberChange(e.target.value)}
          placeholder={t('expenses.contractNumberPlaceholder')}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>
    </div>
  );
};

export default ExpenseBausparvertragForm;

