import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon,
  UserIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

interface HouseholdMember {
  id: number;
  name: string;
  relationship?: string;
  date_of_birth?: string;
  notes?: string;
  is_shared: boolean;
  created_at: string;
  creator_email?: string;
}

interface FamilyMembersTabProps {
  // Any props that might be needed
}

const FamilyMembersTab: React.FC<FamilyMembersTabProps> = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    relationship: '',
    date_of_birth: '',
    notes: ''
  });

  // Load household members
  const loadMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/household-members?t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load household members');
      }

      const data = await response.json();
      setMembers(data);
    } catch (error) {
      console.error('Error loading household members:', error);
      setError('Failed to load household members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const url = showEditModal && selectedMember
        ? `/api/household-members/${selectedMember.id}`
        : '/api/household-members';

      const method = showEditModal ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save member');
      }

      await loadMembers();
      setShowAddModal(false);
      setShowEditModal(false);
      setFormData({
        name: '',
        relationship: '',
        date_of_birth: '',
        notes: ''
      });
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleDelete = async () => {
    if (!selectedMember) return;

    try {
      const response = await fetch(`/api/household-members/${selectedMember.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete member');
      }

      await loadMembers();
      setShowDeleteModal(false);
      setSelectedMember(null);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      relationship: '',
      date_of_birth: '',
      notes: ''
    });
    setShowAddModal(true);
  };

  const openEditModal = (member: HouseholdMember) => {
    setSelectedMember(member);
    
    // Format date_of_birth for date input (YYYY-MM-DD)
    let formattedDate = '';
    if (member.date_of_birth) {
      const date = new Date(member.date_of_birth);
      if (!isNaN(date.getTime())) {
        formattedDate = date.toISOString().split('T')[0];
      }
    }
    
    setFormData({
      name: member.name,
      relationship: member.relationship || '',
      date_of_birth: formattedDate,
      notes: member.notes || ''
    });
    setShowEditModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
        </div>
      )}

      <div className="card">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('households.familyMembers')}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {members.length === 0 
                  ? t('households.noMembersYet')
                  : `${members.length} ${members.length === 1 ? t('households.member') : t('households.members')}`
                }
              </p>
            </div>
            {members.length > 0 && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-5 w-5 mr-2" />
                {t('households.addMember')}
              </button>
            )}
          </div>

          {members.length === 0 ? (
            <div className="text-center py-12">
              <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">
                {t('households.noFamilyMembers')}
              </h3>
              <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('households.addHouseholdMembers')}
              </p>
              <div className="mt-6">
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {t('households.addYourFirstMember')}
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {members.map((member) => (
                <div
                  key={member.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {member.name}
                      </h3>
                      {member.relationship && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {member.relationship}
                        </p>
                      )}
                      {member.date_of_birth && (
                        <p className="text-sm text-gray-500 dark:text-gray-500 mt-1 flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {new Date(member.date_of_birth).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                        title="Edit"
                      >
                        <PencilIcon className="h-5 w-5" />
                      </button>
                      {!member.is_shared && (
                        <button
                          onClick={() => {
                            setSelectedMember(member);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {member.notes && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
                      {member.notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowAddModal(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Add Family Member</h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</label>
                    <input
                      type="text"
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowEditModal(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Edit Family Member</h3>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Relationship</label>
                    <input
                      type="text"
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date of Birth</label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes</label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedMember && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={() => setShowDeleteModal(false)}></div>
            <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Delete Family Member</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Are you sure you want to delete {selectedMember.name}? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyMembersTab;

