import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import {
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  XMarkIcon,
  UserIcon
} from '@heroicons/react/24/outline';

interface ExternalPersonConnection {
  id: number;
  external_person_id: number;
  invited_user_id: number;
  invited_by_user_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired';
  invited_at: string;
  responded_at: string | null;
  expires_at: string;
  external_person_name?: string;
  external_person_email?: string;
  invited_user_email?: string;
  invited_by_user_email?: string;
}

interface InvitationManagerProps {
  userId: number;
}

const InvitationManager: React.FC<InvitationManagerProps> = ({ userId }) => {
  const { t } = useTranslation();
  const [pendingInvitations, setPendingInvitations] = useState<ExternalPersonConnection[]>([]);
  const [sentInvitations, setSentInvitations] = useState<ExternalPersonConnection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInvitations();
  }, []);

  const loadInvitations = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getExternalPersonInvitations('all');
      
      // Separate received and sent invitations
      const all = [
        ...(response.invitations || []),
        ...(response.connections || [])
      ];
      
      setPendingInvitations(
        all.filter((inv: ExternalPersonConnection) => 
          inv.invited_user_id === userId && inv.status === 'pending'
        )
      );
      
      setSentInvitations(
        all.filter((inv: ExternalPersonConnection) => 
          inv.invited_by_user_id === userId && ['pending', 'accepted', 'revoked'].includes(inv.status)
        )
      );
    } catch (err: any) {
      setError(err.response?.data?.error || t('invitations.errorLoading') || 'Failed to load invitations');
      console.error('Error loading invitations:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (connectionId: number) => {
    try {
      await apiService.acceptExternalPersonInvitation(connectionId);
      await loadInvitations();
    } catch (err: any) {
      alert(err.response?.data?.error || t('invitations.errorAccepting') || 'Failed to accept invitation');
    }
  };

  const handleReject = async (connectionId: number) => {
    try {
      await apiService.rejectExternalPersonInvitation(connectionId);
      await loadInvitations();
    } catch (err: any) {
      alert(err.response?.data?.error || t('invitations.errorRejecting') || 'Failed to reject invitation');
    }
  };

  const handleRevoke = async (connectionId: number) => {
    if (!confirm(t('invitations.revokeConfirmation') || 'Are you sure you want to revoke this invitation?')) {
      return;
    }
    try {
      await apiService.revokeExternalPersonInvitation(connectionId);
      await loadInvitations();
    } catch (err: any) {
      alert(err.response?.data?.error || t('invitations.errorRevoking') || 'Failed to revoke invitation');
    }
  };

  const handleDisconnect = async (connectionId: number) => {
    if (!confirm(t('invitations.disconnectConfirmation') || 'Are you sure you want to disconnect? This will revoke access to linked data.')) {
      return;
    }
    try {
      await apiService.disconnectExternalPersonInvitation(connectionId);
      await loadInvitations();
    } catch (err: any) {
      alert(err.response?.data?.error || t('invitations.errorDisconnecting') || 'Failed to disconnect');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date() > new Date(expiresAt);
  };

  const getStatusBadge = (status: string, expiresAt: string) => {
    if (status === 'pending' && isExpired(expiresAt)) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {t('invitations.expired') || 'Expired'}
        </span>
      );
    }
    
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300">
            {t('invitations.pending') || 'Pending'}
          </span>
        );
      case 'accepted':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
            {t('invitations.accepted') || 'Accepted'}
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
            {t('invitations.rejected') || 'Rejected'}
          </span>
        );
      case 'revoked':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
            {t('invitations.revoked') || 'Revoked'}
          </span>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pending Invitations Received */}
      {pendingInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('invitations.pendingReceived') || 'Pending Invitations'}
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
            {pendingInvitations.map((invitation) => (
              <div key={invitation.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <UserIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {invitation.external_person_name || 'External Person'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('invitations.invitedBy') || 'Invited by'} {invitation.invited_by_user_email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                      <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                        <ClockIcon className="h-4 w-4 mr-1" />
                        {t('invitations.expiresIn') || 'Expires'} {formatDate(invitation.expires_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    <button
                      onClick={() => handleAccept(invitation.id)}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 flex items-center space-x-1"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      <span>{t('invitations.accept') || 'Accept'}</span>
                    </button>
                    <button
                      onClick={() => handleReject(invitation.id)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 flex items-center space-x-1"
                    >
                      <XCircleIcon className="h-4 w-4" />
                      <span>{t('invitations.reject') || 'Reject'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sent Invitations */}
      {sentInvitations.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('invitations.sentInvitations') || 'Sent Invitations'}
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
            {sentInvitations.map((invitation) => (
              <div key={invitation.id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <UserIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                          {invitation.external_person_name || 'External Person'}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {t('invitations.invitedTo') || 'Invited'} {invitation.invited_user_email}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center space-x-4">
                      {getStatusBadge(invitation.status, invitation.expires_at)}
                      {invitation.status === 'pending' && (
                        <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                          <ClockIcon className="h-4 w-4 mr-1" />
                          {t('invitations.expiresIn') || 'Expires'} {formatDate(invitation.expires_at)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 ml-4">
                    {invitation.status === 'pending' && (
                      <button
                        onClick={() => handleRevoke(invitation.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        {t('invitations.revoke') || 'Revoke'}
                      </button>
                    )}
                    {invitation.status === 'accepted' && (
                      <button
                        onClick={() => handleDisconnect(invitation.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
                      >
                        {t('invitations.disconnect') || 'Disconnect'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {pendingInvitations.length === 0 && sentInvitations.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <UserIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('invitations.noInvitations') || 'No invitations'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('invitations.noInvitationsDescription') || 'You have no pending or sent invitations.'}
          </p>
        </div>
      )}
    </div>
  );
};

export default InvitationManager;

