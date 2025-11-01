import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import ExpenseMemberMultiSelect from './ExpenseMemberMultiSelect';
import { apiService } from '../services/api';

interface ExternalPerson {
  id: number;
  name: string;
  birth_date?: string;
}

interface ExpenseGiftFormProps {
  linkedMemberIds: number[];
  externalPersonIds?: number[];
  onChange: (linkedMemberIds: number[]) => void;
  onExternalPersonsChange?: (externalPersonIds: number[]) => void;
  shareWithExternalPersons?: boolean;
  onShareChange?: (share: boolean) => void;
  error?: string;
}

const ExpenseGiftForm: React.FC<ExpenseGiftFormProps> = ({
  linkedMemberIds,
  externalPersonIds = [],
  onChange,
  onExternalPersonsChange,
  shareWithExternalPersons = false,
  onShareChange,
  error
}) => {
  const { t } = useTranslation();
  const [externalPersons, setExternalPersons] = useState<ExternalPerson[]>([]);
  const [showAddExternalModal, setShowAddExternalModal] = useState(false);
  const [newExternalPerson, setNewExternalPerson] = useState({
    name: '',
    birth_date: '',
    relationship: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadExternalPersons();
  }, []);

  const loadExternalPersons = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/external-persons');
      setExternalPersons(response.data || response || []);
    } catch (err) {
      console.error('Error loading external persons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddExternalPerson = async () => {
    if (!newExternalPerson.name.trim()) return;

    try {
      const response = await apiService.post('/external-persons', {
        name: newExternalPerson.name.trim(),
        birth_date: newExternalPerson.birth_date || null,
        relationship: newExternalPerson.relationship.trim() || null
      });
      
      const newPerson = response.data || response;
      setExternalPersons([...externalPersons, newPerson]);
      if (onExternalPersonsChange) {
        onExternalPersonsChange([...externalPersonIds, newPerson.id]);
      }
      setNewExternalPerson({ name: '', birth_date: '', relationship: '' });
      setShowAddExternalModal(false);
    } catch (err: any) {
      console.error('Error adding external person:', err);
      alert(err.response?.data?.error || 'Failed to add external person');
    }
  };

  const toggleExternalPerson = (personId: number) => {
    if (!onExternalPersonsChange) return;
    const currentIds = externalPersonIds || [];
    if (currentIds.includes(personId)) {
      onExternalPersonsChange(currentIds.filter(id => id !== personId));
    } else {
      onExternalPersonsChange([...currentIds, personId]);
    }
  };

  const selectedExternalPersons = externalPersons.filter(p => (externalPersonIds || []).includes(p.id));

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('expenses.giftDescription') || 'Select recipients for this gift. You can choose household members or external persons.'}
        </p>
      </div>
      
      {/* Household Members */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.householdMembers') || 'Household Members'}
        </label>
        <ExpenseMemberMultiSelect
          value={linkedMemberIds}
          onChange={onChange}
          required={false}
        />
      </div>

      {/* External Persons */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('expenses.externalPersons') || 'External Persons'}
          </label>
          <button
            type="button"
            onClick={() => setShowAddExternalModal(true)}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            {t('expenses.addExternalPerson') || 'Add New'}
          </button>
        </div>

        {loading ? (
          <div className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</div>
        ) : externalPersons.length === 0 ? (
          <div className="text-sm text-gray-500 mb-2">
            {t('expenses.noExternalPersons') || 'No external persons yet. Click "Add New" to create one.'}
          </div>
        ) : (
          <div className="border border-gray-300 dark:border-gray-600 rounded-md p-2 max-h-32 overflow-y-auto">
            {externalPersons.map((person) => (
              <label
                key={person.id}
                className="flex items-center py-1 px-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(externalPersonIds || []).includes(person.id)}
                  onChange={() => toggleExternalPerson(person.id)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                  {person.name}
                  {person.birth_date && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({new Date(person.birth_date).toLocaleDateString()})
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        )}

        {selectedExternalPersons.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {selectedExternalPersons.map((person) => (
              <span
                key={person.id}
                className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-200"
              >
                <UserIcon className="h-3 w-3 mr-1" />
                {person.name}
                <button
                  type="button"
                  onClick={() => toggleExternalPerson(person.id)}
                  className="ml-1 text-purple-600 hover:text-purple-800 dark:text-purple-400"
                >
                  <XMarkIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {(linkedMemberIds.length === 0 && (externalPersonIds || []).length === 0) && (
          <p className="mt-1 text-sm text-red-600 dark:text-red-400">
            {t('expenses.selectAtLeastOneRecipient') || 'Please select at least one recipient (household member or external person)'}
          </p>
        )}
      </div>

      {/* Privacy Toggle - Only show if external persons are selected */}
      {(externalPersonIds && externalPersonIds.length > 0) && onShareChange && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md border border-yellow-200 dark:border-yellow-800">
          <label className="flex items-start">
            <input
              type="checkbox"
              checked={shareWithExternalPersons}
              onChange={(e) => onShareChange(e.target.checked)}
              className="mt-1 mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <div className="flex-1">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('expenses.shareWithRecipients') || 'Share this expense with recipients'}
              </span>
              <p className="mt-1 text-xs text-yellow-800 dark:text-yellow-200">
                {shareWithExternalPersons 
                  ? (t('expenses.shareWarning') || 'Recipients will see the amount spent on their gift')
                  : (t('expenses.privacyNote') || 'This expense will not be visible to recipients when shared')
                }
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Add External Person Modal */}
      {showAddExternalModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative bg-white dark:bg-gray-800 p-5 border w-96 shadow-lg rounded-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('expenses.addExternalPerson') || 'Add External Person'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.name') || 'Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newExternalPerson.name}
                  onChange={(e) => setNewExternalPerson({ ...newExternalPerson, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.birthDate') || 'Birth Date'}
                </label>
                <input
                  type="date"
                  value={newExternalPerson.birth_date}
                  onChange={(e) => setNewExternalPerson({ ...newExternalPerson, birth_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.relationship') || 'Relationship'}
                </label>
                <select
                  value={newExternalPerson.relationship}
                  onChange={(e) => setNewExternalPerson({ ...newExternalPerson, relationship: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('common.selectRelationship') || 'Select relationship...'}</option>
                  <option value="friend">{t('relationships.friend') || 'Friend'}</option>
                  <option value="relative">{t('relationships.relative') || 'Relative'}</option>
                  <option value="colleague">{t('relationships.colleague') || 'Colleague'}</option>
                  <option value="neighbor">{t('relationships.neighbor') || 'Neighbor'}</option>
                  <option value="acquaintance">{t('relationships.acquaintance') || 'Acquaintance'}</option>
                  <option value="business_partner">{t('relationships.businessPartner') || 'Business Partner'}</option>
                  <option value="family_friend">{t('relationships.familyFriend') || 'Family Friend'}</option>
                  <option value="godparent">{t('relationships.godparent') || 'Godparent'}</option>
                  <option value="other">{t('relationships.other') || 'Other'}</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowAddExternalModal(false);
                  setNewExternalPerson({ name: '', birth_date: '', relationship: '' });
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                type="button"
                onClick={handleAddExternalPerson}
                disabled={!newExternalPerson.name.trim()}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {t('common.add') || 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default ExpenseGiftForm;

