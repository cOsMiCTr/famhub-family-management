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
import LoadingSpinner from '../components/LoadingSpinner';

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

interface MemberAssignments {
  member: HouseholdMember;
  income: any[];
  assets: any[];
  contracts: any[];
}

const HouseholdMembersPage: React.FC = () => {
  const { t } = useTranslation();
  const [members, setMembers] = useState<HouseholdMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignmentsModal, setShowAssignmentsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<HouseholdMember | null>(null);
  const [assignments, setAssignments] = useState<MemberAssignments | null>(null);
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
      console.log('🔍 Debug - Household members API response:', data);
      console.log('🔍 Debug - Members array length:', data.length);
      console.log('🔍 Debug - Setting members state with:', data);
      setMembers(data);
      console.log('🔍 Debug - Members state set, current members:', members);
    } catch (error) {
      console.error('Error loading household members:', error);
      setError('Failed to load household members');
    } finally {
      setLoading(false);
    }
  };

  // Load member assignments
  const loadAssignments = async (memberId: number) => {
    try {
      const response = await fetch(`/api/household-members/${memberId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load member assignments');
      }

      const data = await response.json();
      setAssignments(data);
    } catch (error) {
      console.error('Error loading member assignments:', error);
      setError('Failed to load member assignments');
    }
  };

  useEffect(() => {
    loadMembers();
  }, []);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = selectedMember 
        ? `/api/household-members/${selectedMember.id}`
        : '/api/household-members';
      
      const method = selectedMember ? 'PUT' : 'POST';
      
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
      setSelectedMember(null);
      setFormData({ name: '', relationship: '', date_of_birth: '', notes: '' });
    } catch (error) {
      console.error('Error saving member:', error);
      setError(error instanceof Error ? error.message : 'Failed to save member');
    }
  };

  // Handle delete
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
    } catch (error) {
      console.error('Error deleting member:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete member');
    }
  };

  // Handle edit
  const handleEdit = (member: HouseholdMember) => {
    if (member.is_shared) {
      setError(t('familyMembers.cannotEditShared'));
      return;
    }
    
    setSelectedMember(member);
    setFormData({
      name: member.name,
      relationship: member.relationship || '',
      date_of_birth: member.date_of_birth || '',
      notes: member.notes || ''
    });
    setShowEditModal(true);
  };

  // Handle delete confirmation
  const handleDeleteClick = (member: HouseholdMember) => {
    if (member.is_shared) {
      setError(t('familyMembers.cannotDeleteShared'));
      return;
    }
    
    setSelectedMember(member);
    setShowDeleteModal(true);
  };

  // Handle assignments view
  const handleViewAssignments = async (member: HouseholdMember) => {
    setSelectedMember(member);
    await loadAssignments(member.id);
    setShowAssignmentsModal(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Calculate age from date of birth
  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">{error}</div>
          <button 
            onClick={loadMembers}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('familyMembers.title')}
              </h1>
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                {t('familyMembers.noMembersFound')}
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <PlusIcon className="h-5 w-5 mr-2" />
              {t('familyMembers.addMember')}
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  {t('common.error')}
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
                <div className="mt-4">
                  <button
                    onClick={() => setError(null)}
                    className="bg-red-100 px-3 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                  >
                    {t('common.close')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Members List */}
        <div className="bg-white dark:bg-gray-800 shadow rounded-lg">
          {(() => {
            console.log('🔍 Debug - Rendering check: loading=', loading, 'members.length=', members.length);
            console.log('🔍 Debug - Will show empty state?', !loading && members.length === 0);
            return !loading && members.length === 0 ? (
              <div className="text-center py-12">
                <UserIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                  {t('familyMembers.noMembersFound')}
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Get started by adding a new family member.
                </p>
              </div>
            ) : (
            <div className="overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('familyMembers.name')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('familyMembers.relationship')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('familyMembers.dateOfBirth')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Age
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {t('familyMembers.assignments')}
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {members.map((member) => (
                    <tr key={member.id} className={member.is_shared ? 'bg-blue-50 dark:bg-blue-900/20' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                              <UserIcon className="h-6 w-6 text-gray-600 dark:text-gray-300" />
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {member.name}
                              {member.is_shared && (
                                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                  {t('familyMembers.shared')}
                                </span>
                              )}
                            </div>
                            {member.notes && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {member.notes}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.relationship || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.date_of_birth ? formatDate(member.date_of_birth) : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {member.date_of_birth ? `${calculateAge(member.date_of_birth)} years` : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <button
                          onClick={() => handleViewAssignments(member)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          View Assignments
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleEdit(member)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title={t('familyMembers.editMember')}
                          >
                            <PencilIcon className="h-5 w-5" />
                          </button>
                          {!member.is_shared && (
                            <button
                              onClick={() => handleDeleteClick(member)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title={t('familyMembers.deleteMember')}
                            >
                              <TrashIcon className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            );
          })()}
        </div>

        {/* Add/Edit Modal */}
        {(showAddModal || showEditModal) && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-4 mx-auto p-4 border w-[95vw] max-w-md shadow-lg rounded-md bg-white dark:bg-gray-800 max-h-[90vh] overflow-y-auto">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {selectedMember ? t('familyMembers.editMember') : t('familyMembers.addMember')}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('familyMembers.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="name"
                      inputMode="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('familyMembers.relationship')}
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      inputMode="text"
                      value={formData.relationship}
                      onChange={(e) => setFormData({ ...formData, relationship: e.target.value })}
                      placeholder="e.g., Spouse, Child, Parent"
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('familyMembers.dateOfBirth')}
                    </label>
                    <input
                      type="date"
                      value={formData.date_of_birth}
                      onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                      className="form-input"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      {t('familyMembers.notes')}
                    </label>
                    <textarea
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      rows={3}
                      className="form-input"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setShowEditModal(false);
                        setSelectedMember(null);
                        setFormData({ name: '', relationship: '', date_of_birth: '', notes: '' });
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      {t('common.save')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && selectedMember && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {t('familyMembers.deleteMember')}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Are you sure you want to delete "{selectedMember.name}"? This action cannot be undone.
                </p>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setSelectedMember(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleDelete}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Assignments Modal */}
        {showAssignmentsModal && selectedMember && assignments && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-10 mx-auto p-5 border w-4/5 max-w-4xl shadow-lg rounded-md bg-white dark:bg-gray-800">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    {t('familyMembers.assignments')} - {selectedMember.name}
                  </h3>
                  <button
                    onClick={() => {
                      setShowAssignmentsModal(false);
                      setSelectedMember(null);
                      setAssignments(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Income Assignments */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                      {t('familyMembers.incomeAssignments')} ({assignments.income.length})
                    </h4>
                    <div className="space-y-2">
                      {assignments.income.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No income assignments</p>
                      ) : (
                        assignments.income.map((income: any) => (
                          <div key={income.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {income.category_name_en}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {income.amount} {income.currency}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(income.start_date)} - {income.end_date ? formatDate(income.end_date) : 'Ongoing'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Asset Assignments */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                      {t('familyMembers.assetAssignments')} ({assignments.assets.length})
                    </h4>
                    <div className="space-y-2">
                      {assignments.assets.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No asset assignments</p>
                      ) : (
                        assignments.assets.map((asset: any) => (
                          <div key={asset.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {asset.category_name_en}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {asset.value} {asset.currency}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(asset.date)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Contract Assignments */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                      {t('familyMembers.contractAssignments')} ({assignments.contracts.length})
                    </h4>
                    <div className="space-y-2">
                      {assignments.contracts.length === 0 ? (
                        <p className="text-sm text-gray-500 dark:text-gray-400">No contract assignments</p>
                      ) : (
                        assignments.contracts.map((contract: any) => (
                          <div key={contract.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {contract.category_name_en}
                            </div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {contract.monthly_amount} {contract.currency}/month
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-500">
                              {formatDate(contract.start_date)} - {contract.end_date ? formatDate(contract.end_date) : 'Ongoing'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HouseholdMembersPage;

