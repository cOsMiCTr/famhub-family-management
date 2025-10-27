import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { 
  UserPlusIcon, 
  BuildingOfficeIcon, 
  EnvelopeIcon,
  CheckIcon,
  XMarkIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';

interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  household_id: number;
  household_name: string;
  is_active: boolean;
  created_at: string;
}

interface Household {
  id: number;
  name: string;
  created_at: string;
  user_count: number;
}

interface Invitation {
  id: number;
  email: string;
  household_id: number;
  household_name: string;
  created_at: string;
  expires_at: string;
}

const AdminPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'users' | 'households' | 'invitations'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, householdsRes, invitationsRes] = await Promise.all([
        apiService.getUsers(),
        apiService.getHouseholds(),
        apiService.getInvitations()
      ]);
      setUsers(usersRes.users);
      setHouseholds(householdsRes.households);
      setInvitations(invitationsRes.invitations);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load admin data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateUser = async (userId: number) => {
    if (!window.confirm('Are you sure you want to deactivate this user?')) return;

    try {
      await apiService.deactivateUser(userId.toString());
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to deactivate user');
    }
  };

  const handleDeleteInvitation = async (invitationId: number) => {
    if (!window.confirm('Are you sure you want to delete this invitation?')) return;

    try {
      await apiService.deleteInvitation(invitationId.toString());
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete invitation');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">Access denied. Admin privileges required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage users and households
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <UserPlusIcon className="h-5 w-5 inline mr-2" />
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('households')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'households'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <BuildingOfficeIcon className="h-5 w-5 inline mr-2" />
            Households ({households.length})
          </button>
          <button
            onClick={() => setActiveTab('invitations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'invitations'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <EnvelopeIcon className="h-5 w-5 inline mr-2" />
            Invitations ({invitations.length})
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : (
        <>
          {/* Users Tab */}
          {activeTab === 'users' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {users.length === 0 ? (
                <div className="text-center py-12">
                  <UserPlusIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No users</h3>
                  <p className="mt-1 text-sm text-gray-500">No users found in the system.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <li key={user.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-700">
                                {user.first_name?.[0]}{user.last_name?.[0]}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.first_name} {user.last_name}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">
                              {user.household_name} • {user.role} • 
                              {user.is_active ? ' Active' : ' Inactive'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeactivateUser(user.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Deactivate"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Households Tab */}
          {activeTab === 'households' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {households.length === 0 ? (
                <div className="text-center py-12">
                  <BuildingOfficeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No households</h3>
                  <p className="mt-1 text-sm text-gray-500">No households found in the system.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {households.map((household) => (
                    <li key={household.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <BuildingOfficeIcon className="h-10 w-10 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {household.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {household.user_count} members
                            </div>
                            <div className="text-xs text-gray-400">
                              Created {new Date(household.created_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {activeTab === 'invitations' && (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              {invitations.length === 0 ? (
                <div className="text-center py-12">
                  <EnvelopeIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No invitations</h3>
                  <p className="mt-1 text-sm text-gray-500">No pending invitations found.</p>
                </div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {invitations.map((invitation) => (
                    <li key={invitation.id} className="px-6 py-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <EnvelopeIcon className="h-10 w-10 text-gray-400" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {invitation.email}
                            </div>
                            <div className="text-sm text-gray-500">
                              Invited to {invitation.household_name}
                            </div>
                            <div className="text-xs text-gray-400">
                              Sent {new Date(invitation.created_at).toLocaleDateString()} • 
                              Expires {new Date(invitation.expires_at).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleDeleteInvitation(invitation.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                            title="Delete Invitation"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdminPage;