import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { UserIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface Member {
  id: number;
  first_name?: string;
  last_name?: string;
  name?: string;
  relationship?: string;
  is_shared?: boolean;
}

interface ExpenseMemberMultiSelectProps {
  value?: number[];
  onChange: (memberIds: number[]) => void;
  required?: boolean;
  error?: string;
}

const ExpenseMemberMultiSelect: React.FC<ExpenseMemberMultiSelectProps> = ({
  value = [],
  onChange,
  required = false,
  error
}) => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setLoading(true);
        const response = await apiService.get('/expenses/linkable-members');
        setMembers(response.data || response);
        setErrorMessage(null);
      } catch (err: any) {
        console.error('Error fetching linkable members:', err);
        setErrorMessage(err.response?.data?.error || t('expenses.errorFetchingMembers'));
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [t]);

  const toggleMember = (memberId: number) => {
    const currentIds = value || [];
    if (currentIds.includes(memberId)) {
      onChange(currentIds.filter(id => id !== memberId));
    } else {
      onChange([...currentIds, memberId]);
    }
  };

  const removeMember = (memberId: number) => {
    onChange((value || []).filter(id => id !== memberId));
  };

  const selectedMembers = members.filter(m => (value || []).includes(m.id));

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {t('expenses.selectRecipients') || 'Select Recipients'}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>

      {loading ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">{t('common.loading') || 'Loading...'}</div>
      ) : errorMessage ? (
        <div className="text-sm text-red-600 dark:text-red-400">{errorMessage}</div>
      ) : members.length === 0 ? (
        <div className="text-sm text-gray-500 dark:text-gray-400">{t('expenses.noMembersAvailable') || 'No members available'}</div>
      ) : (
        <>
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 max-h-32 overflow-y-auto bg-white dark:bg-gray-700">
            {members.map((member) => (
              <label
                key={member.id}
                className="flex items-center py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(value || []).includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member ${member.id}`}
                </span>
                {member.relationship && (
                  <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">({member.relationship})</span>
                )}
              </label>
            ))}
          </div>

          {selectedMembers.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {selectedMembers.map((member) => (
                <span
                  key={member.id}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200"
                >
                  <UserIcon className="h-3 w-3 mr-1" />
                  {member.name || `${member.first_name || ''} ${member.last_name || ''}`.trim() || `Member ${member.id}`}
                  <button
                    type="button"
                    onClick={() => removeMember(member.id)}
                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                  >
                    <XMarkIcon className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {required && (value || []).length === 0 && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{t('expenses.selectAtLeastOneRecipient') || 'Please select at least one recipient'}</p>
          )}
        </>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default ExpenseMemberMultiSelect;

