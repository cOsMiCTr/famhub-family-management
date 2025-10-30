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
  CalendarIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  GlobeAltIcon,
  CpuChipIcon,
  ServerIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

interface SecurityMetrics {
  // Login Security
  totalLogins24h: number;
  failedLogins24h: number;
  uniqueIpAddresses24h: number;
  suspiciousLoginPatterns: number;
  
  // Account Security
  lockedAccounts: number;
  accountsPendingPasswordChange: number;
  accountsWith2FA: number;
  accountsWithout2FA: number;
  
  // Activity Security
  totalActivities24h: number;
  criticalActivities24h: number;
  unusualActivityPatterns: number;
  
  // Token Security
  tokenTransactions24h: number;
  suspiciousTokenActivity: number;
  voucherAbuseAttempts: number;
  
  // System Security
  systemHealthScore: number;
  securityAlerts: number;
  dataIntegrityIssues: number;
}

interface SecurityEvent {
  id: number;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: number;
  user_email?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
}

interface SecurityFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  severity?: string[];
  eventTypes?: string[];
  userIds?: number[];
  ipAddresses?: string[];
  searchTerm?: string;
}

interface SecurityAnalytics {
  loginTrends: Array<{
    date: string;
    successful: number;
    failed: number;
    unique_ips: number;
  }>;
  activityTrends: Array<{
    date: string;
    total_activities: number;
    critical_activities: number;
  }>;
  topIpAddresses: Array<{
    ip_address: string;
    count: number;
    last_seen: string;
    risk_level: 'low' | 'medium' | 'high';
  }>;
  topUsers: Array<{
    user_id: number;
    email: string;
    activity_count: number;
    last_activity: string;
    risk_score: number;
  }>;
  securityThreats: Array<{
    threat_type: string;
    count: number;
    severity: string;
    last_detected: string;
  }>;
}

const EnhancedSecurityDashboard: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  
  // Data states
  const [metrics, setMetrics] = useState<SecurityMetrics | null>(null);
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [analytics, setAnalytics] = useState<SecurityAnalytics | null>(null);
  const [alerts, setAlerts] = useState<SecurityEvent[]>([]);
  
  // Filter states
  const [filters, setFilters] = useState<SecurityFilter>({});
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalEvents, setTotalEvents] = useState(0);
  const [eventsPerPage] = useState(25);
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    loadSecurityData();
    
    if (autoRefresh) {
      const interval = setInterval(loadSecurityData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, currentPage, filters]);

  const loadSecurityData = async () => {
    try {
      const [metricsData, eventsData, analyticsData, alertsData] = await Promise.all([
        apiService.getSecurityMetrics(),
        apiService.getSecurityEvents(currentPage, eventsPerPage, filters),
        apiService.getSecurityAnalytics(30),
        apiService.getSecurityAlerts()
      ]);

      setMetrics(metricsData);
      setEvents(eventsData.events);
      setTotalEvents(eventsData.total);
      setAnalytics(analyticsData);
      setAlerts(alertsData);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load security data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: Partial<SecurityFilter>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({});
    setCurrentPage(1);
  };

  const exportSecurityReport = () => {
    const reportData = {
      metrics,
      events: events.slice(0, 100), // Export first 100 events
      analytics,
      alerts,
      generatedAt: new Date().toISOString(),
      generatedBy: currentUser?.email
    };
    
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `security-report-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400';
      case 'high': return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'login_attempt': return <KeyIcon className="h-4 w-4" />;
      case 'user_activity': return <UserGroupIcon className="h-4 w-4" />;
      case 'token_transaction': return <CpuChipIcon className="h-4 w-4" />;
      default: return <InformationCircleIcon className="h-4 w-4" />;
    }
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Enhanced Security Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Comprehensive security monitoring and threat detection
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600 dark:text-gray-400">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={loadSecurityData}
            className="btn-secondary flex items-center"
          >
            <ArrowPathIcon className="h-4 w-4 mr-2" />
            Refresh
          </button>
          <button
            onClick={exportSecurityReport}
            className="btn-primary flex items-center"
          >
            <DocumentArrowDownIcon className="h-4 w-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error loading security data
              </h3>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4">
          <div className="flex items-center">
            <BellIcon className="h-5 w-5 text-red-500 mr-2" />
            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
              Real-time Security Alerts ({alerts.length})
            </h3>
          </div>
          <div className="mt-2 space-y-1">
            {alerts.slice(0, 3).map((alert) => (
              <p key={alert.id} className="text-sm text-red-700 dark:text-red-300">
                {alert.description}
              </p>
            ))}
            {alerts.length > 3 && (
              <p className="text-sm text-red-600 dark:text-red-400">
                +{alerts.length - 3} more alerts...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', name: 'Overview', icon: ChartBarIcon },
            { id: 'events', name: 'Security Events', icon: ExclamationTriangleIcon },
            { id: 'analytics', name: 'Analytics', icon: ServerIcon },
            { id: 'threats', name: 'Threat Detection', icon: ShieldExclamationIcon }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center`}
            >
              <tab.icon className="h-4 w-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && metrics && (
        <div className="space-y-6">
          {/* System Health Score */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    System Health Score
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Overall security posture assessment
                  </p>
                </div>
                <div className="text-right">
                  <div className={`text-3xl font-bold ${
                    metrics.systemHealthScore >= 80 ? 'text-green-600' :
                    metrics.systemHealthScore >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {metrics.systemHealthScore}/100
                  </div>
                  <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-2">
                    <div
                      className={`h-2 rounded-full ${
                        metrics.systemHealthScore >= 80 ? 'bg-green-500' :
                        metrics.systemHealthScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${metrics.systemHealthScore}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Security Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Login Security */}
            <div className="card hover-lift">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <KeyIcon className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Login Security
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {metrics.totalLogins24h}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metrics.failedLogins24h} failed attempts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Security */}
            <div className="card hover-lift">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <LockClosedIcon className="h-8 w-8 text-orange-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Account Security
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {metrics.accountsWith2FA}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metrics.lockedAccounts} locked accounts
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Activity Security */}
            <div className="card hover-lift">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <UserGroupIcon className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Activity Security
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {metrics.totalActivities24h}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metrics.criticalActivities24h} critical activities
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Token Security */}
            <div className="card hover-lift">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CpuChipIcon className="h-8 w-8 text-purple-500" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Token Security
                    </p>
                    <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {metrics.tokenTransactions24h}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {metrics.suspiciousTokenActivity} suspicious
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="card">
              <div className="card-body">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Network Security
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Unique IPs (24h)</span>
                    <span className="text-sm font-medium">{metrics.uniqueIpAddresses24h}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Suspicious Patterns</span>
                    <span className="text-sm font-medium text-red-600">{metrics.suspiciousLoginPatterns}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Data Integrity
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Security Alerts</span>
                    <span className="text-sm font-medium text-orange-600">{metrics.securityAlerts}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Data Issues</span>
                    <span className="text-sm font-medium text-red-600">{metrics.dataIntegrityIssues}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Authentication
                </h4>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">2FA Enabled</span>
                    <span className="text-sm font-medium text-green-600">{metrics.accountsWith2FA}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Pending Changes</span>
                    <span className="text-sm font-medium text-yellow-600">{metrics.accountsPendingPasswordChange}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          {/* Filters */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security Events Filter
                </h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="btn-secondary flex items-center"
                  >
                    <FunnelIcon className="h-4 w-4 mr-2" />
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                  <button
                    onClick={clearFilters}
                    className="btn-secondary"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Date Range
                    </label>
                    <div className="flex space-x-2">
                      <input
                        type="date"
                        value={filters.dateRange?.start || ''}
                        onChange={(e) => handleFilterChange({
                          dateRange: { ...filters.dateRange, start: e.target.value }
                        })}
                        className="form-input text-sm"
                      />
                      <input
                        type="date"
                        value={filters.dateRange?.end || ''}
                        onChange={(e) => handleFilterChange({
                          dateRange: { ...filters.dateRange, end: e.target.value }
                        })}
                        className="form-input text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Severity
                    </label>
                    <select
                      multiple
                      value={filters.severity || []}
                      onChange={(e) => handleFilterChange({
                        severity: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="form-select text-sm"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="critical">Critical</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Event Type
                    </label>
                    <select
                      multiple
                      value={filters.eventTypes || []}
                      onChange={(e) => handleFilterChange({
                        eventTypes: Array.from(e.target.selectedOptions, option => option.value)
                      })}
                      className="form-select text-sm"
                    >
                      <option value="login_attempt">Login Attempts</option>
                      <option value="user_activity">User Activity</option>
                      <option value="token_transaction">Token Transactions</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Search
                    </label>
                    <div className="relative">
                      <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search events..."
                        value={filters.searchTerm || ''}
                        onChange={(e) => handleFilterChange({ searchTerm: e.target.value })}
                        className="form-input pl-10 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Events List */}
          <div className="card">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Security Events ({totalEvents})
                </h3>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  Page {currentPage} of {Math.ceil(totalEvents / eventsPerPage)}
                </div>
              </div>

              <div className="space-y-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0">
                          {getEventTypeIcon(event.event_type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSeverityColor(event.severity)}`}>
                              {event.severity.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                              {event.event_type.replace('_', ' ').toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white">
                            {event.description}
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {event.user_email && (
                              <span>User: {event.user_email}</span>
                            )}
                            {event.ip_address && (
                              <span>IP: {event.ip_address}</span>
                            )}
                            <span>{new Date(event.created_at).toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalEvents > eventsPerPage && (
                <div className="flex items-center justify-between mt-6">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Page {currentPage} of {Math.ceil(totalEvents / eventsPerPage)}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(Math.ceil(totalEvents / eventsPerPage), prev + 1))}
                    disabled={currentPage >= Math.ceil(totalEvents / eventsPerPage)}
                    className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Login Trends */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Login Trends (Last 30 Days)
                </h3>
                <div className="space-y-2">
                  {analytics.loginTrends.slice(0, 7).map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(trend.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-green-600">
                          {trend.successful} successful
                        </span>
                        <span className="text-sm text-red-600">
                          {trend.failed} failed
                        </span>
                        <span className="text-sm text-blue-600">
                          {trend.unique_ips} IPs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Activity Trends */}
            <div className="card">
              <div className="card-body">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Activity Trends (Last 30 Days)
                </h3>
                <div className="space-y-2">
                  {analytics.activityTrends.slice(0, 7).map((trend) => (
                    <div key={trend.date} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(trend.date).toLocaleDateString()}
                      </span>
                      <div className="flex items-center space-x-4">
                        <span className="text-sm text-gray-600">
                          {trend.total_activities} total
                        </span>
                        <span className="text-sm text-orange-600">
                          {trend.critical_activities} critical
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Top IP Addresses */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Top IP Addresses by Activity
              </h3>
              <div className="space-y-3">
                {analytics.topIpAddresses.slice(0, 10).map((ip) => (
                  <div key={ip.ip_address} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <GlobeAltIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-mono text-gray-900 dark:text-white">
                        {ip.ip_address}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {ip.count} attempts
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        ip.risk_level === 'high' ? 'text-red-600 bg-red-100 dark:bg-red-900/20' :
                        ip.risk_level === 'medium' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20' :
                        'text-green-600 bg-green-100 dark:bg-green-900/20'
                      }`}>
                        {ip.risk_level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(ip.last_seen).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Users */}
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Most Active Users
              </h3>
              <div className="space-y-3">
                {analytics.topUsers.slice(0, 10).map((user) => (
                  <div key={user.user_id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <UserGroupIcon className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {user.activity_count} activities
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.risk_score >= 80 ? 'text-red-600 bg-red-100 dark:bg-red-900/20' :
                        user.risk_score >= 60 ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20' :
                        'text-green-600 bg-green-100 dark:bg-green-900/20'
                      }`}>
                        Risk: {user.risk_score}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Threat Detection Tab */}
      {activeTab === 'threats' && analytics && (
        <div className="space-y-6">
          <div className="card">
            <div className="card-body">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Security Threats Detected
              </h3>
              <div className="space-y-4">
                {analytics.securityThreats.map((threat) => (
                  <div key={threat.threat_type} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {threat.threat_type.replace('_', ' ').toUpperCase()}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Last detected: {new Date(threat.last_detected).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl font-bold text-red-600">
                          {threat.count}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          threat.severity === 'high' ? 'text-red-600 bg-red-100 dark:bg-red-900/20' :
                          threat.severity === 'medium' ? 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20' :
                          'text-green-600 bg-green-100 dark:bg-green-900/20'
                        }`}>
                          {threat.severity.toUpperCase()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSecurityDashboard;
