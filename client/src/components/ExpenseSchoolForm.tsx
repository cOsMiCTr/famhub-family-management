import React from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseMemberMultiSelect from './ExpenseMemberMultiSelect';

interface ExpenseSchoolFormProps {
  expenseType?: string;
  linkedMemberIds: number[];
  onChange: (data: {
    expense_type?: string;
    linked_member_ids?: number[];
  }) => void;
  error?: string;
}

const ExpenseSchoolForm: React.FC<ExpenseSchoolFormProps> = ({
  expenseType = '',
  linkedMemberIds = [],
  onChange,
  error
}) => {
  const { t } = useTranslation();

  const handleExpenseTypeChange = (newType: string) => {
    onChange({ expense_type: newType || undefined });
  };

  const handleMembersChange = (memberIds: number[]) => {
    onChange({ linked_member_ids: memberIds });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('expenses.schoolExpenseDescription') || 'Select the type of school expense and optionally link it to a student.'}
        </p>
      </div>

      {/* Expense Type (Subcategory) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.expenseType') || 'Expense Type'}
        </label>
        <select
          value={expenseType}
          onChange={(e) => handleExpenseTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">{t('expenses.selectExpenseType') || 'Select expense type...'}</option>
          <option value="tuition">{t('expenses.schoolExpenseTypes.tuition') || 'Tuition'}</option>
          <option value="books">{t('expenses.schoolExpenseTypes.books') || 'Books'}</option>
          <option value="supplies">{t('expenses.schoolExpenseTypes.supplies') || 'Supplies'}</option>
          <option value="uniforms">{t('expenses.schoolExpenseTypes.uniforms') || 'Uniforms'}</option>
          <option value="transportation">{t('expenses.schoolExpenseTypes.transportation') || 'Transportation'}</option>
          <option value="other">{t('expenses.schoolExpenseTypes.other') || 'Other'}</option>
        </select>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Student Selection (Optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.studentSelection') || 'Student(s)'} <span className="text-gray-500 text-xs">({t('expenses.optional') || 'Optional'})</span>
        </label>
        <ExpenseMemberMultiSelect
          value={linkedMemberIds}
          onChange={handleMembersChange}
          required={false}
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('expenses.studentSelectionHint') || 'Link this expense to specific students in your household'}
        </p>
      </div>
    </div>
  );
};

export default ExpenseSchoolForm;

