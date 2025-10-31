import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, UserIcon } from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface ExternalPerson {
  id: number;
  name: string;
  birth_date: string | null;
  relationship: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const ExternalPersonsPage: React.FC = () => {
  const { t } = useTranslation();
  const [externalPersons, setExternalPersons] = useState<ExternalPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<ExternalPerson | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    relationship: '',
    notes: ''
  });
  const [formErrors, setFormErrors] = useState<string[]>([]);

  useEffect(() => {
    loadExternalPersons();
  }, []);

  const loadExternalPersons = async () => {
    try {
      setLoading(true);
      const response = await apiService.get('/external-persons');
      setExternalPersons(response.data || response);
      setError(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load external persons');
      console.error('Error loading external persons:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setFormData({ name: '', birth_date: '', relationship: '', notes: '' });
    setFormErrors([]);
    setSelectedPerson(null);
    setShowAddModal(true);
  };

  const handleEdit = (person: ExternalPerson) => {
    setFormData({
      name: person.name,
      birth_date: person.birth_date || '',
      relationship: person.relationship || '',
      notes: person.notes || ''
    });
    setFormErrors([]);
    setSelectedPerson(person);
    setShowEditModal(true);
  };

  const handleDelete = (person: ExternalPerson) => {
    setSelectedPerson(person);
    setShowDeleteModal(true);
  };

  const validateForm = (): boolean => {
    const errors: string[] = [];
    
    if (!formData.name.trim()) {
      errors.push('Name is required');
    }
    
    setFormErrors(errors);
    return errors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    try {
      const payload = {
        name: formData.name.trim(),
        birth_date: formData.birth_date || null,
        relationship: formData.relationship.trim() || null,
        notes: formData.notes.trim() || null
      };

      if (selectedPerson) {
        await apiService.put(`/external-persons/${selectedPerson.id}`, payload);
      } else {
        await apiService.post('/external-persons', payload);
      }

      await loadExternalPersons();
      setShowAddModal(false);
      setShowEditModal(false);
      setSelectedPerson(null);
      setFormData({ name: '', birth_date: '', relationship: '', notes: '' });
    } catch (err: any) {
      setFormErrors([err.response?.data?.error || 'Failed to save external person']);
      console.error('Error saving external person:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!selectedPerson) return;

    try {
      await apiService.delete(`/external-persons/${selectedPerson.id}`);
      await loadExternalPersons();
      setShowDeleteModal(false);
      setSelectedPerson(null);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete external person');
      console.error('Error deleting external person:', err);
    }
  };

  const filteredPersons = externalPersons.filter(person =>
    person.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (person.relationship && person.relationship.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const formatDate = (dateString: string | null): string => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('settings.externalMembers') || 'External Members'}
        </h1>
        <button
          onClick={handleAdd}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          {t('common.add') || 'Add'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
        <input
          type="text"
          placeholder={t('common.search') || 'Search...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
        />
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('common.name') || 'Name'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('common.birthDate') || 'Birth Date'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('common.relationship') || 'Relationship'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('common.notes') || 'Notes'}
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                {t('common.actions') || 'Actions'}
              </th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            {filteredPersons.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No external persons found' : 'No external persons yet'}
                </td>
              </tr>
            ) : (
              filteredPersons.map((person) => (
                <tr key={person.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <UserIcon className="h-5 w-5 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {person.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {formatDate(person.birth_date)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {person.relationship || '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    <div className="max-w-xs truncate">
                      {person.notes || '-'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(person)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-4"
                    >
                      <PencilIcon className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(person)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                    >
                      <TrashIcon className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {selectedPerson ? (t('common.edit') || 'Edit') : (t('common.add') || 'Add')} {t('externalPersons.person') || 'External Person'}
              </h3>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setShowEditModal(false);
                  setSelectedPerson(null);
                  setFormData({ name: '', birth_date: '', relationship: '', notes: '' });
                  setFormErrors([]);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {formErrors.length > 0 && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded">
                  <ul className="list-disc list-inside">
                    {formErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.name') || 'Name'} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.relationship') || 'Relationship'}
                </label>
                <select
                  value={formData.relationship}
                  onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('common.notes') || 'Notes'}
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setShowEditModal(false);
                    setSelectedPerson(null);
                    setFormData({ name: '', birth_date: '', relationship: '', notes: '' });
                    setFormErrors([]);
                  }}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {t('common.save') || 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPerson && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              {t('common.confirmDelete') || 'Confirm Delete'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {t('externalPersons.confirmDeleteMessage', { name: selectedPerson.name }) || `Are you sure you want to delete ${selectedPerson.name}?`}
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedPerson(null);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                {t('common.cancel') || 'Cancel'}
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                {t('common.delete') || 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExternalPersonsPage;

