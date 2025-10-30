import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseMemberMultiSelect from './ExpenseMemberMultiSelect';

interface ExpenseGiftFormProps {
  linkedMemberIds: number[];
  onChange: (linkedMemberIds: number[]) => void;
  error?: string;
}

const ExpenseGiftForm: React.FC<ExpenseGiftFormProps> = ({
  linkedMemberIds,
  onChange,
  error
}) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
        <p className="text-sm text-blue-800">
          {t('expenses.giftDescription')}
        </p>
      </div>
      
      <ExpenseMemberMultiSelect
        value={linkedMemberIds}
        onChange={onChange}
        required={true}
        error={error}
      />
    </div>
  );
};

export default ExpenseGiftForm;

