import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { 
  ChartBarIcon,
  ClockIcon,
  GlobeAltIcon,
  ComputerDesktopIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
interface ActivityEntry {
  id: number;
  user_id: number;
  action_type: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// Helper function to clean IP address
const cleanIPAddress = (ip: string): string => {
  if (ip.startsWith('::ffff:')) {
    return ip.substring(7);
  }
  return ip;
};

const ActivityTab: React.FC = () => {
  const { t } = useTranslation();
  const [activities, setActivities] = useState<ActivityEntry[]>([]);
  const [allActionTypes, setAllActionTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);
  const [filter, setFilter] = useState<string>('all');

  // Load all action types once on mount
  useEffect(() => {
    loadAllActionTypes();
  }, []);

  useEffect(() => {
    loadActivities();
  }, [limit, filter]);

  const loadAllActionTypes = async () => {
    try {
      // Fetch a small sample to get all action types
      const response = await apiService.getUserActivity(200, 'all');
      const types = Array.from(new Set((response.activities || []).map((a: ActivityEntry) => a.action_type)));
      setAllActionTypes(types);
    } catch (err) {
      console.error('Error loading action types:', err);
    }
  };

  const loadActivities = async () => {
    setIsLoading(true);
    setError('');
    try {
      const response = await apiService.getUserActivity(limit, filter);
      setActivities(response.activities || []);
    } catch (err: any) {
      console.error('Error loading activities:', err);
      setError(err.response?.data?.error || t('settings.activityLoadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getActionTypeColor = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'login':
      case 'logout':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'password_change':
      case 'security':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'profile_update':
      case 'settings_change':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'data_access':
      case 'export':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getActionTypeIcon = (actionType: string) => {
    switch (actionType.toLowerCase()) {
      case 'login':
      case 'logout':
        return '🔐';
      case 'password_change':
        return '🔑';
      case 'profile_update':
      case 'settings_change':
        return '⚙️';
      case 'data_access':
      case 'export':
        return '📊';
      default:
        return '📝';
    }
  };

  const actionTypes = Array.from(new Set(activities.map(a => a.action_type)));

  return (
    <div className="space-y-6">
      {/* Header and Filters */}
      <div className="card hover-lift animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-purple-500" />
                {t('settings.activityLog')}
              </h3>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {t('settings.activityDescription')}
              </p>
            </div>
            <button
              onClick={loadActivities}
              disabled={isLoading}
              className="btn-secondary flex items-center"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </button>
          </div>
        </div>
        <div className="card-body">
          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-center gap-4">
            <div className="flex items-center space-x-2">
              <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.filterByAction')}:
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="form-input text-sm"
              >
                <option value="all">{t('settings.allActions')}</option>
                {allActionTypes.map((type) => (
                  <option key={type} value={type}>
                    {type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('settings.showLast')}:
              </label>
              <select
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value))}
                className="form-input text-sm"
              >
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>
          </div>

          {/* Activity List */}
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : error ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="text-center py-12">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('settings.noActivityFound')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('settings.noActivityDescription')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((activity) => (
                <div
                  key={activity.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-xl">{getActionTypeIcon(activity.action_type)}</span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getActionTypeColor(activity.action_type)}`}>
                          {activity.action_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {formatDate(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-900 dark:text-white mb-2">
                        {activity.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                        {activity.ip_address && (
                          <span className="flex items-center">
                            <GlobeAltIcon className="h-4 w-4 mr-1" />
                            {cleanIPAddress(activity.ip_address)}
                          </span>
                        )}
                        {activity.user_agent && (
                          <span className="flex items-center">
                            <ComputerDesktopIcon className="h-4 w-4 mr-1" />
                            {activity.user_agent.length > 50 
                              ? `${activity.user_agent.substring(0, 50)}...`
                              : activity.user_agent}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ActivityTab;
