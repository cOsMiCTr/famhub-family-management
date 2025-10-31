import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import {
  BellIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  TrashIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface UserNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  read: boolean;
  created_at: string;
}

const NotificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [readFilter, setReadFilter] = useState<boolean | undefined>(undefined);
  const limit = 20;

  useEffect(() => {
    loadNotifications();
  }, [page, readFilter]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getUserNotifications(page, limit, readFilter);
      setNotifications(response.notifications || []);
      setTotal(response.total || 0);
      setTotalPages(response.totalPages || 0);
    } catch (err: any) {
      setError(err.response?.data?.error || t('notifications.errorLoading') || 'Failed to load notifications');
      console.error('Error loading notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: number) => {
    try {
      await apiService.markUserNotificationRead(notificationId.toString());
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.read);
    if (unreadNotifications.length === 0) return;

    try {
      const notificationIds = unreadNotifications.map(n => n.id);
      await apiService.markAllUserNotificationsRead(notificationIds);
      await loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      await apiService.deleteUserNotification(notificationId.toString());
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setTotal(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    if (type.includes('invitation_received')) {
      return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
    }
    if (type.includes('invitation_accepted')) {
      return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
    }
    if (type.includes('invitation_revoked') || type.includes('invitation_expired')) {
      return <ExclamationTriangleIcon className="h-6 w-6 text-yellow-500" />;
    }
    return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const handleNotificationClick = (notification: UserNotification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.related_entity_type === 'external_person_connection') {
      navigate('/notifications'); // Could navigate to invitations page
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('notifications.title') || 'Notifications'}
        </h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {t('notifications.description') || 'Manage your notifications and stay updated'}
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setReadFilter(undefined)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              readFilter === undefined
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('common.all') || 'All'}
          </button>
          <button
            onClick={() => setReadFilter(false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              readFilter === false
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('notifications.unread') || 'Unread'}
          </button>
          <button
            onClick={() => setReadFilter(true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              readFilter === true
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            {t('common.read') || 'Read'}
          </button>
        </div>

        {notifications.filter(n => !n.read).length > 0 && (
          <button
            onClick={markAllAsRead}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center space-x-2"
          >
            <CheckIcon className="h-4 w-4" />
            <span>{t('notifications.markAllAsRead') || 'Mark all as read'}</span>
          </button>
        )}
      </div>

      {/* Notifications List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">{t('common.loading') || 'Loading...'}</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
          <BellIcon className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {t('notifications.noNotifications') || 'No notifications'}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('notifications.noNotificationsDescription') || 'You have no notifications at this time.'}
          </p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow divide-y divide-gray-200 dark:divide-gray-700">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div
                  className="flex items-start space-x-4 flex-1 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <p className={`text-base ${
                        notification.read
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-900 dark:text-white font-semibold'
                      }`}>
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {notification.message}
                    </p>
                    <div className="mt-2 flex items-center text-xs text-gray-400 dark:text-gray-500">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {formatDate(notification.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {!notification.read && (
                    <button
                      onClick={() => markAsRead(notification.id)}
                      className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                      title={t('notifications.markAsRead') || 'Mark as read'}
                    >
                      <CheckIcon className="h-5 w-5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notification.id)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title={t('common.delete') || 'Delete'}
                  >
                    <TrashIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <div className="text-sm text-gray-700 dark:text-gray-300">
            {t('common.showing') || 'Showing'} {(page - 1) * limit + 1} {t('common.to') || 'to'}{' '}
            {Math.min(page * limit, total)} {t('common.of') || 'of'} {total}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(prev => Math.max(1, prev - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.previous') || 'Previous'}
            </button>
            <button
              onClick={() => setPage(prev => Math.min(totalPages, prev + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              {t('common.next') || 'Next'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;

