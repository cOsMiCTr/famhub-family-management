import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ShieldExclamationIcon,
  LockClosedIcon,
  KeyIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  EyeIcon,
  EyeSlashIcon,
  BellIcon,
  ChartBarIcon,
  UserGroupIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface SecurityStats {
  totalFailedAttempts24h: number;
  lockedAccountsCount: number;
  recentSuspiciousActivity: number;
}

interface NotificationCounts {
  unread: number;
  critical: number;
  warning: number;
  info: number;
}

interface FailedAttempt {
  id: number;
  email: string;
  user_id?: number;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
  created_at: string;
  user_email?: string;
}

interface LockedAccount {
  id: number;
  email: string;
  account_locked_until?: string;
  last_failed_login_at?: string;
}

interface PendingPasswordChange {
  id: number;
  email: string;
  created_at: string;
}

const AdminSecurityDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [securityStats, setSecurityStats] = useState<SecurityStats | null>(null);
  const [notificationCounts, setNotificationCounts] = useState<NotificationCounts | null>(null);
  const [recentFailedAttempts, setRecentFailedAttempts] = useState<FailedAttempt[]>([]);
  const [lockedAccounts, setLockedAccounts] = useState<LockedAccount[]>([]);
  const [pendingPasswordChanges, setPendingPasswordChanges] = useState<PendingPasswordChange[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    setIsLoading(true);
    try {
      const [dashboardData, notificationsData] = await Promise.all([
        apiService.getSecurityDashboard(),
        apiService.getAdminNotifications(1, 10, false) // Get 10 unread notifications
      ]);

      setSecurityStats(dashboardData.statistics);
      setNotificationCounts(dashboardData.notifications);
      setRecentFailedAttempts(dashboardData.recent_failed_attempts);
      setLockedAccounts(dashboardData.locked_accounts);
      setPendingPasswordChanges(dashboardData.pending_password_changes);
      setNotifications(notificationsData.notifications);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load security data');
    } finally {
      setIsLoading(false);
    }
  };

  const markNotificationAsRead = async (notificationId: number) => {
    try {
      await apiService.markNotificationRead(notificationId.toString());
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      if (notificationCounts) {
        setNotificationCounts(prev => prev ? { ...prev, unread: prev.unread - 1 } : null);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to mark notification as read');
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20';
      case 'info':
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Security Dashboard
          </h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Monitor security events, failed login attempts, and account status
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative btn-secondary flex items-center"
          >
            <BellIcon className="h-5 w-5 mr-2" />
            Notifications
            {notificationCounts && notificationCounts.unread > 0 && (
              <span className="absolute -top-2 -right-2 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {notificationCounts.unread}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Security Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card hover-lift">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ShieldExclamationIcon className="h-8 w-8 text-red-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Failed Login Attempts (24h)
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {securityStats?.totalFailedAttempts24h || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card hover-lift">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <LockClosedIcon className="h-8 w-8 text-orange-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Locked Accounts
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {securityStats?.lockedAccountsCount || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card hover-lift">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <KeyIcon className="h-8 w-8 text-yellow-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Pending Password Changes
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {pendingPasswordChanges.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card hover-lift">
          <div className="card-body">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <ExclamationTriangleIcon className="h-8 w-8 text-purple-500" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Suspicious Activity
                </p>
                <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                  {securityStats?.recentSuspiciousActivity || 0}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Notifications Panel */}
      {showNotifications && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent Security Notifications
            </h3>
          </div>
          <div className="card-body">
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">No unread notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-4 rounded-lg border ${getSeverityColor(notification.severity)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        <p className="text-sm mt-1">{notification.message}</p>
                        <p className="text-xs mt-2 opacity-75">
                          {formatDateTime(notification.created_at)}
                        </p>
                      </div>
                      <button
                        onClick={() => markNotificationAsRead(notification.id)}
                        className="ml-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recent Failed Login Attempts */}
      <div className="card">
        <div className="card-header">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Recent Failed Login Attempts
          </h3>
        </div>
        <div className="card-body">
          {recentFailedAttempts.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircleIcon className="h-12 w-12 text-green-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No failed login attempts in the last 24 hours</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      IP Address
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Reason
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Timestamp
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {recentFailedAttempts.map((attempt) => (
                    <tr key={attempt.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {attempt.user_email || attempt.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {attempt.ip_address || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {attempt.failure_reason || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(attempt.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Locked Accounts */}
      {lockedAccounts.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Currently Locked Accounts
            </h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Locked Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Last Failed Login
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {lockedAccounts.map((account) => (
                    <tr key={account.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {account.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.account_locked_until ? formatDateTime(account.account_locked_until) : 'Indefinitely'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {account.last_failed_login_at ? formatDateTime(account.last_failed_login_at) : 'Unknown'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pending Password Changes */}
      {pendingPasswordChanges.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Users Pending Password Change
            </h3>
          </div>
          <div className="card-body">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Created
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {pendingPasswordChanges.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {formatDateTime(user.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSecurityDashboard;
