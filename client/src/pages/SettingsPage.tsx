import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrencies } from '../contexts/CurrencyContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import { reloadTranslations } from '../i18n';
import { formatCurrencyWithSymbol } from '../utils/currencyHelpers';
import { 
  UserIcon, 
  LanguageIcon, 
  CurrencyDollarIcon, 
  BellIcon, 
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckIcon,
  XMarkIcon,
  ChartBarIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

interface UserSettings {
  preferred_language: string;
  main_currency: string;
  email_notifications: boolean;
  contract_reminders: boolean;
  income_alerts: boolean;
  dark_mode: boolean;
}

interface PasswordChange {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

const SettingsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { user, logout, updateUser } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const activeCurrencies = useCurrencies();
  
  const [settings, setSettings] = useState<UserSettings>({
    preferred_language: 'en',
    main_currency: 'USD',
    email_notifications: true,
    contract_reminders: true,
    income_alerts: true,
    dark_mode: false,
  });
  
  const [passwordChange, setPasswordChange] = useState<PasswordChange>({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getUserSettings();
      setSettings({
        preferred_language: response.user.preferred_language || 'en',
        main_currency: response.user.main_currency || 'USD',
        email_notifications: true,
        contract_reminders: true,
        income_alerts: true,
        dark_mode: isDark,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await apiService.updateUserSettings({
        preferred_language: settings.preferred_language,
        main_currency: settings.main_currency,
      });
      
      // Update language if changed
      if (settings.preferred_language !== i18n.language) {
        i18n.changeLanguage(settings.preferred_language);
        // Save language to localStorage for i18n persistence
        localStorage.setItem('i18nextLng', settings.preferred_language);
        // Reload translations for the new language
        await reloadTranslations();
      }
      
      // Update user data in localStorage with new preferences
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userData.preferred_language = settings.preferred_language;
        userData.main_currency = settings.main_currency;
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Update AuthContext user state
        updateUser({
          preferred_language: settings.preferred_language,
          main_currency: settings.main_currency
        });
      }
      
      setMessage('Settings updated successfully!');
      setTimeout(() => setMessage(''), 5000); // Increased timeout for mobile users
    } catch (err: any) {
      console.error('Settings update error:', err);
      const errorMessage = err.response?.data?.error || 
                          err.message || 
                          'Failed to update settings. Please check your connection and try again.';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setError('');
    setMessage('');

    if (passwordChange.new_password !== passwordChange.confirm_password) {
      setError('New passwords do not match');
      setIsChangingPassword(false);
      return;
    }

    if (passwordChange.new_password.length < 6) {
      setError('Password must be at least 6 characters long');
      setIsChangingPassword(false);
      return;
    }

    try {
      await apiService.changePassword({
        current_password: passwordChange.current_password,
        new_password: passwordChange.new_password,
      });
      
      setMessage('Password changed successfully!');
      setPasswordChange({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to change password');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleSettingsChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setSettings(prev => ({
        ...prev,
        [name]: checked,
      }));
      
      // Handle theme toggle
      if (name === 'dark_mode' && checked !== isDark) {
        toggleTheme();
      }
    } else {
      setSettings(prev => ({
        ...prev,
        [name]: value,
      }));
    }
  };

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordChange(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  ];

  // Filter to show only active fiat currencies
  const fiatCurrencies = activeCurrencies
    .filter(c => c.is_active && c.currency_type === 'fiat')
    .sort((a, b) => a.name.localeCompare(b.name));

  const tabs = [
    { id: 'profile', name: 'Profile', icon: UserIcon },
    { id: 'preferences', name: 'Preferences', icon: LanguageIcon },
    { id: 'notifications', name: 'Notifications', icon: BellIcon },
    { id: 'family-members', name: t('navigation.familyMembers'), icon: UsersIcon },
    { id: 'security', name: 'Security', icon: ShieldCheckIcon },
    ...(user?.role === 'admin' ? [{ id: 'master-admin', name: 'Master Admin', icon: ShieldCheckIcon }] : []),
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="animate-fadeIn">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          {t('settings.title')}
        </h1>
        <p className="mt-2 text-lg text-gray-600 dark:text-gray-300">
          Manage your account preferences and settings
        </p>
      </div>

      {/* Messages */}
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 animate-fadeIn">
          <div className="flex items-center">
            <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
            <div className="text-sm text-green-700 dark:text-green-300">{message}</div>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-fadeIn">
          <div className="flex items-center">
            <XMarkIcon className="h-5 w-5 text-red-500 mr-2" />
            <div className="text-sm text-red-700 dark:text-red-300">{error}</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <tab.icon className="h-5 w-5 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Profile Tab */}
      {activeTab === 'profile' && (
        <div className="card hover-lift animate-fadeIn">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <UserIcon className="h-5 w-5 mr-2 text-blue-500" />
              Profile Information
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="form-label">Email Address</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {user?.email}
                </div>
              </div>
              
              <div>
                <label className="form-label">Role</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white capitalize">
                  {user?.role}
                </div>
              </div>
              
              <div>
                <label className="form-label">Household</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {user?.household_name || 'No household assigned'}
                </div>
              </div>
              
              <div>
                <label className="form-label">Member Since</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <form onSubmit={handleSaveSettings} className="space-y-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Language & Currency Card */}
              <div className="flex-1 card hover-lift animate-fadeIn">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <LanguageIcon className="h-5 w-5 mr-2 text-green-500" />
                    Language & Currency
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="preferred_language" className="form-label">
                        Preferred Language
                      </label>
                      <select
                        id="preferred_language"
                        name="preferred_language"
                        value={settings.preferred_language}
                        onChange={handleSettingsChange}
                        className="form-input"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.flag} {lang.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label htmlFor="main_currency" className="form-label">
                        Main Currency
                      </label>
                      <select
                        id="main_currency"
                        name="main_currency"
                        value={settings.main_currency}
                        onChange={handleSettingsChange}
                        className="form-input"
                      >
                        {fiatCurrencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {formatCurrencyWithSymbol(currency.code, currency.name)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Display Preferences Card */}
              <div className="flex-1 card hover-lift animate-fadeIn">
                <div className="card-header">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 mr-2 text-purple-500" />
                    Display Preferences
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
                      </div>
                      <div className="flex-shrink-0 ml-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            name="dark_mode"
                            checked={settings.dark_mode}
                            onChange={handleSettingsChange}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary flex items-center"
              >
                {isSaving ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Saving...</span>
                  </>
                ) : (
                  'Save Preferences'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notifications Tab */}
      {activeTab === 'notifications' && (
        <div className="card hover-lift animate-fadeIn">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <BellIcon className="h-5 w-5 mr-2 text-yellow-500" />
              Notification Preferences
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Email Notifications</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive notifications via email</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="email_notifications"
                    checked={settings.email_notifications}
                    onChange={handleSettingsChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Contract Reminders</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get notified about upcoming contract renewals</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="contract_reminders"
                    checked={settings.contract_reminders}
                    onChange={handleSettingsChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">Income Alerts</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Receive alerts for income entries and updates</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="income_alerts"
                    checked={settings.income_alerts}
                    onChange={handleSettingsChange}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Family Members Tab */}
      {activeTab === 'family-members' && (
        <div className="card hover-lift animate-fadeIn">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <UsersIcon className="h-5 w-5 mr-2 text-blue-500" />
              {t('navigation.familyMembers')}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Manage household members for income, asset, and contract assignments
            </p>
          </div>
          <div className="card-body">
            <div className="text-center py-8">
              <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                Family Members Management
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Use the dedicated Family Members page to manage household members.
              </p>
              <div className="mt-6">
                <a
                  href="/family-members"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <UsersIcon className="h-5 w-5 mr-2" />
                  Go to Family Members
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordChange} className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <KeyIcon className="h-5 w-5 mr-2 text-red-500" />
                Change Password
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label htmlFor="current_password" className="form-label">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      id="current_password"
                      name="current_password"
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordChange.current_password}
                      onChange={handlePasswordInputChange}
                      className="form-input pr-10"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(prev => ({ ...prev, current: !prev.current }))}
                    >
                      {showPassword.current ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="new_password" className="form-label">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      id="new_password"
                      name="new_password"
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordChange.new_password}
                      onChange={handlePasswordInputChange}
                      className="form-input pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(prev => ({ ...prev, new: !prev.new }))}
                    >
                      {showPassword.new ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirm_password" className="form-label">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordChange.confirm_password}
                      onChange={handlePasswordInputChange}
                      className="form-input pr-10"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => setShowPassword(prev => ({ ...prev, confirm: !prev.confirm }))}
                    >
                      {showPassword.confirm ? (
                        <EyeSlashIcon className="h-5 w-5 text-gray-400" />
                      ) : (
                        <EyeIcon className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  disabled={isChangingPassword}
                  className="btn-primary flex items-center"
                >
                  {isChangingPassword ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Changing Password...</span>
                    </>
                  ) : (
                    'Change Password'
                  )}
                </button>
              </div>
            </div>
          </form>

          <div className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-orange-500" />
                Account Actions
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Sign Out</h4>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    Sign out of your account on this device
                  </p>
                  <button
                    onClick={logout}
                    className="mt-3 btn-secondary"
                  >
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Master Admin Tab */}
      {activeTab === 'master-admin' && user?.role === 'admin' && (
        <div className="space-y-6">
          <div className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-red-500" />
                Master Admin Controls
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Advanced administrative functions for system management
              </p>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* User Management */}
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">User Management</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                    Manage users, roles, and permissions
                  </p>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm bg-blue-100 dark:bg-blue-800 rounded hover:bg-blue-200 dark:hover:bg-blue-700">
                      • Invite New Users
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-blue-100 dark:bg-blue-800 rounded hover:bg-blue-200 dark:hover:bg-blue-700">
                      • Manage User Roles
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-blue-100 dark:bg-blue-800 rounded hover:bg-blue-200 dark:hover:bg-blue-700">
                      • View All Users
                    </button>
                  </div>
                </div>

                {/* Household Management */}
                <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">Household Management</h4>
                  <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                    Create and manage family households
                  </p>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm bg-green-100 dark:bg-green-800 rounded hover:bg-green-200 dark:hover:bg-green-700">
                      • Create New Household
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-green-100 dark:bg-green-800 rounded hover:bg-green-200 dark:hover:bg-green-700">
                      • Assign Users to Households
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-green-100 dark:bg-green-800 rounded hover:bg-green-200 dark:hover:bg-green-700">
                      • Manage Household Settings
                    </button>
                  </div>
                </div>

                {/* System Settings */}
                <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                  <h4 className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-2">System Settings</h4>
                  <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                    Configure system-wide settings
                  </p>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm bg-purple-100 dark:bg-purple-800 rounded hover:bg-purple-200 dark:hover:bg-purple-700">
                      • Exchange Rate Settings
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-purple-100 dark:bg-purple-800 rounded hover:bg-purple-200 dark:hover:bg-purple-700">
                      • Default Categories
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-purple-100 dark:bg-purple-800 rounded hover:bg-purple-200 dark:hover:bg-purple-700">
                      • System Maintenance
                    </button>
                  </div>
                </div>

                {/* Data Management */}
                <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                  <h4 className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-2">Data Management</h4>
                  <p className="text-sm text-orange-700 dark:text-orange-300 mb-3">
                    Manage application data and backups
                  </p>
                  <div className="space-y-2">
                    <button className="w-full text-left px-3 py-2 text-sm bg-orange-100 dark:bg-orange-800 rounded hover:bg-orange-200 dark:hover:bg-orange-700">
                      • Export Data
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-orange-100 dark:bg-orange-800 rounded hover:bg-orange-200 dark:hover:bg-orange-700">
                      • Database Backup
                    </button>
                    <button className="w-full text-left px-3 py-2 text-sm bg-orange-100 dark:bg-orange-800 rounded hover:bg-orange-200 dark:hover:bg-orange-700">
                      • System Logs
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Statistics */}
          <div className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ChartBarIcon className="h-5 w-5 mr-2 text-indigo-500" />
                System Statistics
              </h3>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">24</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Users</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">8</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Active Households</div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">156</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Total Assets</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
