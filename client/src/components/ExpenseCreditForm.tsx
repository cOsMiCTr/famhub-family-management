import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseAssetSelector from './ExpenseAssetSelector';

interface ExpenseCreditFormProps {
  creditUseType: 'free_use' | 'renovation' | 'property_purchase' | 'other' | '';
  linkedAssetId?: number;
  onChange: (creditUseType: 'free_use' | 'renovation' | 'property_purchase' | 'other' | '', linkedAssetId?: number) => void;
  error?: string;
}

const ExpenseCreditForm: React.FC<ExpenseCreditFormProps> = ({
  creditUseType,
  linkedAssetId,
  onChange,
  error
}) => {
  const { t } = useTranslation();
  const [useTypeError, setUseTypeError] = useState<string>('');

  const handleUseTypeChange = (newUseType: string) => {
    const validTypes = ['free_use', 'renovation', 'property_purchase', 'other'] as const;
    const typedValue = validTypes.includes(newUseType as any) ? newUseType as typeof validTypes[number] : '';
    
    if (newUseType === 'renovation' || newUseType === 'property_purchase') {
      // Asset link required for renovation and property purchase
      onChange(typedValue, linkedAssetId);
      if (!linkedAssetId) {
        setUseTypeError(t('expenses.propertyRequiredForCredit'));
      } else {
        setUseTypeError('');
      }
    } else {
      // Asset link optional for free use and other
      onChange(typedValue, undefined);
      setUseTypeError('');
    }
  };

  const handleAssetChange = (assetId: number | null) => {
    if (creditUseType === 'renovation' || creditUseType === 'property_purchase') {
      if (!assetId) {
        setUseTypeError(t('expenses.propertyRequiredForCredit'));
      } else {
        setUseTypeError('');
      }
    }
    onChange(creditUseType, assetId || undefined);
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          {t('expenses.creditDescription')}
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('expenses.creditUseType')}
          <span className="text-red-500 ml-1">*</span>
        </label>
        <select
          value={creditUseType}
          onChange={(e) => handleUseTypeChange(e.target.value)}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        >
          <option value="">{t('expenses.selectCreditPurpose')}</option>
          <option value="free_use">{t('expenses.creditUseTypes.free_use')}</option>
          <option value="renovation">{t('expenses.creditUseTypes.renovation')}</option>
          <option value="property_purchase">{t('expenses.creditUseTypes.property_purchase')}</option>
          <option value="other">{t('expenses.creditUseTypes.other')}</option>
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>

      {(creditUseType === 'renovation' || creditUseType === 'property_purchase') && (
        <ExpenseAssetSelector
          value={linkedAssetId}
          onChange={handleAssetChange}
          required={true}
          error={useTypeError}
        />
      )}

      {creditUseType === 'free_use' || creditUseType === 'other' ? (
        <div className="text-sm text-gray-500">
          {t('expenses.creditAssetOptional')}
        </div>
      ) : null}
    </div>
  );
};

export default ExpenseCreditForm;

