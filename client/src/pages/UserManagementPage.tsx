import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import UserGenerationModal from '../components/UserGenerationModal';
import { 
  UserGroupIcon, 
  PencilIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  HomeIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  LockClosedIcon,
  LockOpenIcon,
  KeyIcon,
  ClockIcon,
  UserMinusIcon
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  email: string;
  role: string;
  household_id?: number;
  household_name?: string;
  preferred_language: string;
  main_currency: string;
  account_status: 'active' | 'locked' | 'pending_password_change';
  last_login_at?: string;
  last_activity_at?: string;
  failed_login_attempts: number;
  account_locked_until?: string;
  must_change_password: boolean;
  created_at: string;
  updated_at?: string;
}

interface Household {
  id: number;
  name: string;
  created_at: string;
}

const UserManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  
  // Data states
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showHardDeleteModal, setShowHardDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [editForm, setEditForm] = useState({
    role: 'user',
    household_id: '',
    can_view_contracts: false,
    can_view_income: false,
    can_edit: false
  });
  
  // Filter and search states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [householdFilter, setHouseholdFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [activeTab, setActiveTab] = useState<'users' | 'households'>('users');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, householdsData] = await Promise.all([
        apiService.getUsers(),
        apiService.getHouseholds()
      ]);
      setUsers(usersData.users);
      setHouseholds(householdsData.households);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (userData: any) => {
    try {
      setIsSaving(true);
      setError('');
      await apiService.createUser(userData);
      setMessage('User created successfully');
      setShowCreateModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError('');
      await apiService.updateUser(selectedUser.id.toString(), editForm);
      setMessage('User updated successfully');
      setShowEditModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError('');
      await apiService.deactivateUser(selectedUser.id.toString());
      
      // Optimistically update the user status in local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === selectedUser.id 
            ? { ...user, account_status: 'locked' as const }
            : user
        )
      );
      
      setMessage('User deactivated successfully');
      setShowDeleteModal(false);
      
      // Also refresh data to ensure consistency
      setTimeout(() => loadData(), 500);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleHardDeleteUser = async () => {
    if (!selectedUser) return;

    try {
      setIsSaving(true);
      setError('');
      await apiService.hardDeleteUser(selectedUser.id.toString());
      setMessage('User permanently deleted successfully');
      setShowHardDeleteModal(false);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to permanently delete user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (userId: number) => {
    try {
      setIsSaving(true);
      setError('');
      const result = await apiService.resetUserPassword(userId.toString());
      setMessage(`Password reset successfully. New temporary password: ${result.temporary_password}`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnlockUser = async (userId: number) => {
    try {
      setIsSaving(true);
      setError('');
      await apiService.unlockUser(userId.toString());
      setMessage('User account unlocked successfully');
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to unlock user');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    try {
      setIsSaving(true);
      setError('');
      const newStatus = currentStatus === 'active' ? 'locked' : 'active';
      await apiService.toggleUserStatus(userId.toString(), newStatus);
      setMessage(`User status changed to ${newStatus}`);
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to toggle user status');
    } finally {
      setIsSaving(false);
    }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      household_id: user.household_id?.toString() || '',
      can_view_contracts: false,
      can_view_income: false,
      can_edit: false
    });
    setShowEditModal(true);
  };

  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const openHardDeleteModal = (user: User) => {
    setSelectedUser(user);
    setShowHardDeleteModal(true);
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesHousehold = householdFilter === 'all' || user.household_id?.toString() === householdFilter;
    const matchesStatus = statusFilter === 'all' || user.account_status === statusFilter;
    
    return matchesSearch && matchesRole && matchesHousehold && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      locked: { color: 'bg-red-100 text-red-800', text: 'Locked' },
      pending_password_change: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending Password Change' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.text}
      </span>
    );
  };

  const formatLastLogin = (lastLoginAt?: string) => {
    if (!lastLoginAt) return 'Never';
    const date = new Date(lastLoginAt);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Manage users, reset passwords, and monitor account status
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        </div>
      )}
      
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-300 text-sm">{message}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('households')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'households'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Households ({households.length})
          </button>
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Search
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="form-input pl-10"
                    placeholder="Search by email..."
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="form-input"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="user">User</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Household
                </label>
                <select
                  value={householdFilter}
                  onChange={(e) => setHouseholdFilter(e.target.value)}
                  className="form-input"
                >
                  <option value="all">All Households</option>
                  {households.map(household => (
                    <option key={household.id} value={household.id.toString()}>
                      {household.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="form-input"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="locked">Locked</option>
                  <option value="pending_password_change">Pending Password Change</option>
                </select>
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Household
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                              <span className="text-white font-medium text-sm">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {user.email}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              ID: {user.id}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === 'admin' 
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.household_name || 'Unassigned'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.account_status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatLastLogin(user.last_login_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openEditModal(user)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Edit User"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          
                          {user.account_status === 'locked' && (
                            <button
                              onClick={() => handleUnlockUser(user.id)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Unlock Account"
                              disabled={isSaving}
                            >
                              <LockOpenIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          {user.account_status === 'active' && user.role !== 'admin' && (
                            <button
                              onClick={() => handleToggleUserStatus(user.id, user.account_status)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                              title="Lock Account"
                              disabled={isSaving}
                            >
                              <LockClosedIcon className="h-4 w-4" />
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleResetPassword(user.id)}
                            className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300"
                            title="Reset Password"
                            disabled={isSaving}
                          >
                            <KeyIcon className="h-4 w-4" />
                          </button>
                          
                          {user.role !== 'admin' && (
                            <>
                              <button
                                onClick={() => openDeleteModal(user)}
                                className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300"
                                title="Deactivate User"
                              >
                                <UserMinusIcon className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openHardDeleteModal(user)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Permanently Delete User"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Households Tab */}
      {activeTab === 'households' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Household Management
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Household management features will be available in a future update.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {households.map((household) => (
                <div key={household.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <HomeIcon className="h-8 w-8 text-blue-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white">
                        {household.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        ID: {household.id}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <UserGenerationModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={(user) => {
          setMessage('User created successfully');
          setShowCreateModal(false);
          loadData();
        }}
        households={households}
      />

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleEditUser}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="sm:flex sm:items-start">
                    <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 sm:mx-0 sm:h-10 sm:w-10">
                      <PencilIcon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                      <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                        Edit User: {selectedUser.email}
                      </h3>
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="form-label">Role</label>
                          <select
                            value={editForm.role}
                            onChange={(e) => setEditForm({...editForm, role: e.target.value})}
                            className="form-input"
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="form-label">Household</label>
                          <select
                            value={editForm.household_id}
                            onChange={(e) => setEditForm({...editForm, household_id: e.target.value})}
                            className="form-input"
                          >
                            <option value="">Unassigned</option>
                            {households.map(household => (
                              <option key={household.id} value={household.id.toString()}>
                                {household.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    className="btn-primary sm:ml-3 sm:w-auto"
                    disabled={isSaving}
                  >
                    {isSaving ? <LoadingSpinner size="sm" /> : 'Update User'}
                  </button>
                  <button
                    type="button"
                    className="btn-secondary mt-3 sm:mt-0 sm:w-auto"
                    onClick={() => setShowEditModal(false)}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {showDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeleteModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Deactivate User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to deactivate <strong>{selectedUser.email}</strong>? 
                        This action can be reversed later.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="btn-danger sm:ml-3 sm:w-auto"
                  onClick={handleDeleteUser}
                  disabled={isSaving}
                >
                  {isSaving ? <LoadingSpinner size="sm" /> : 'Deactivate'}
                </button>
                <button
                  type="button"
                  className="btn-secondary mt-3 sm:mt-0 sm:w-auto"
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hard Delete User Modal */}
      {showHardDeleteModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowHardDeleteModal(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <TrashIcon className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Permanently Delete User
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        <strong>WARNING:</strong> Are you sure you want to permanently delete <strong>{selectedUser.email}</strong>? 
                        This action will remove the user and ALL their data from the database. This action CANNOT be undone.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  className="btn-danger sm:ml-3 sm:w-auto"
                  onClick={handleHardDeleteUser}
                  disabled={isSaving}
                >
                  {isSaving ? <LoadingSpinner size="sm" /> : 'Permanently Delete'}
                </button>
                <button
                  type="button"
                  className="btn-secondary mt-3 sm:mt-0 sm:w-auto"
                  onClick={() => setShowHardDeleteModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagementPage;