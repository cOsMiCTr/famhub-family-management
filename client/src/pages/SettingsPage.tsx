import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useCurrencies } from '../contexts/CurrencyContext';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import DeleteAccountModal from '../components/DeleteAccountModal';
import TwoFactorSetupModal from '../components/TwoFactorSetupModal';
import FamilyMembersTab from '../components/FamilyMembersTab';
import TokenTab from '../components/TokenTab';
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
  UsersIcon,
  SparklesIcon
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
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'profile');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);

  // Update active tab from URL params
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    loadSettings();
    load2FAStatus();
  }, []);

  const load2FAStatus = async () => {
    try {
      const response = await apiService.getTwoFactorStatus();
      setTwoFactorEnabled(response.twoFactorEnabled || false);
    } catch (err) {
      console.error('Error loading 2FA status:', err);
    }
  };

  const handleDisable2FA = async () => {
    if (!window.confirm('Are you sure you want to disable two-factor authentication? This will make your account less secure.')) {
      return;
    }

    try {
      await apiService.disableTwoFactor();
      setTwoFactorEnabled(false);
      setMessage(t('settings.twoFactorDisabled'));
      setError('');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error('Error disabling 2FA:', err);
      setError(err.response?.data?.error || t('settings.twoFactorDisableError'));
      setTimeout(() => setError(''), 3000);
    }
  };

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
      
      // Update user data with household info from settings response
      if (response.user && (response.user.household_name || response.user.created_at)) {
        updateUser({
          household_name: response.user.household_name,
          created_at: response.user.created_at
        });
      }
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
      
      setMessage(t('settings.settingsUpdatedSuccess'));
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

    // Custom validation - check all fields
    if (!passwordChange.current_password) {
      setError(t('settings.currentPasswordRequired'));
      setIsChangingPassword(false);
      return;
    }

    if (!passwordChange.new_password) {
      setError(t('settings.newPasswordRequired'));
      setIsChangingPassword(false);
      return;
    }

    if (passwordChange.new_password.length < 6) {
      setError(t('settings.passwordMinLength'));
      setIsChangingPassword(false);
      return;
    }

    if (!passwordChange.confirm_password) {
      setError(t('settings.confirmPasswordRequired'));
      setIsChangingPassword(false);
      return;
    }

    if (passwordChange.new_password !== passwordChange.confirm_password) {
      setError(t('settings.passwordNotMatch'));
      setIsChangingPassword(false);
      return;
    }

    try {
      await apiService.changePassword({
        current_password: passwordChange.current_password,
        new_password: passwordChange.new_password,
      });
      
      setMessage(t('settings.passwordChangedSuccess'));
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
    { id: 'profile', name: t('settings.profile'), icon: UserIcon },
    { id: 'preferences', name: t('settings.preferences'), icon: LanguageIcon },
    { id: 'notifications', name: t('settings.notifications'), icon: BellIcon },
    { id: 'token', name: t('modules.title'), icon: SparklesIcon },
    { id: 'family-members', name: t('navigation.familyMembers'), icon: UsersIcon },
    { id: 'security', name: t('settings.security'), icon: ShieldCheckIcon },
    { id: 'activity', name: t('settings.activity'), icon: ChartBarIcon },
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
          {t('settings.description')}
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
              {t('settings.profileInformation')}
            </h3>
          </div>
          <div className="card-body">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label className="form-label">{t('settings.emailAddress')}</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {user?.email}
                </div>
              </div>
              
              <div>
                <label className="form-label">{t('settings.role')}</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white capitalize">
                  {user?.role}
                </div>
              </div>
              
              <div>
                <label className="form-label">{t('settings.household')}</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {user?.household_name || t('settings.noHousehold')}
                </div>
              </div>
              
              <div>
                <label className="form-label">{t('settings.memberSince')}</label>
                <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg text-gray-900 dark:text-white">
                  {user?.created_at ? new Date(user.created_at).toLocaleString('de-DE', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  }) : 'N/A'}
                </div>
              </div>
            </div>
            
            {/* Data Export Section */}
            <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">{t('settings.exportYourData')}</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                {t('settings.exportDescription')}
              </p>
              <button
                onClick={async () => {
                  try {
                    setMessage(t('settings.generatingPDF'));
                    const blob = await apiService.exportUserData();
                    const url = window.URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `user-data-export-${Date.now()}.pdf`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    window.URL.revokeObjectURL(url);
                    setMessage(t('settings.pdfExportedSuccess'));
                  } catch (err: any) {
                    setError(err.response?.data?.error || t('settings.failedToExport'));
                  }
                }}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                {t('settings.exportToPDF')}
              </button>
            </div>

            {/* Data Privacy Section */}
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <h4 className="text-sm font-medium text-green-800 dark:text-green-200 mb-2">{t('settings.dataPrivacy')}</h4>
              <div className="text-sm text-green-700 dark:text-green-300 space-y-2">
                <p className="font-medium mb-2">{t('settings.whatDataWeCollect')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('settings.dataPersonalInfo')}</li>
                  <li>{t('settings.dataFinancial')}</li>
                  <li>{t('settings.dataHousehold')}</li>
                  <li>{t('settings.dataActivity')}</li>
                </ul>
                <p className="mt-3 font-medium mb-2">{t('settings.yourRights')}</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>{t('settings.rightsExport')}</li>
                  <li>{t('settings.rightsDeletion')}</li>
                  <li>{t('settings.rightsCorrection')}</li>
                  <li>{t('settings.rightsGDPR')}</li>
                </ul>
                <p className="mt-3 text-xs">
                  {t('settings.dataPrivacyNote')}
                </p>
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
                    {t('settings.languageAndCurrency')}
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="preferred_language" className="form-label">
                        {t('settings.preferredLanguage')}
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
                        {t('settings.mainCurrency')}
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
                    {t('settings.displayPreferences')}
                  </h3>
                </div>
                <div className="card-body">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.darkModeLabel')}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.darkModeDescription')}</p>
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
                    <span className="ml-2">{t('settings.saving')}</span>
                  </>
                ) : (
                  t('settings.savePreferences')
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
              {t('settings.notificationPreferences')}
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white">{t('settings.emailNotifications')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('settings.receiveViaEmail')}</p>
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

      {/* Token Tab */}
      {activeTab === 'token' && (
        <TokenTab />
      )}

      {/* Family Members Tab */}
      {activeTab === 'family-members' && (
        <FamilyMembersTab />
      )}

      {/* Security Tab */}
      {activeTab === 'security' && (
        <div className="space-y-6">
          <form onSubmit={handlePasswordChange} className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <KeyIcon className="h-5 w-5 mr-2 text-red-500" />
                {t('settings.changePasswordTitle')}
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div>
                  <label htmlFor="current_password" className="form-label">
                    {t('settings.currentPasswordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="current_password"
                      name="current_password"
                      type={showPassword.current ? 'text' : 'password'}
                      value={passwordChange.current_password}
                      onChange={handlePasswordInputChange}
                      className="form-input pr-10"
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
                    {t('settings.newPasswordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="new_password"
                      name="new_password"
                      type={showPassword.new ? 'text' : 'password'}
                      value={passwordChange.new_password}
                      onChange={handlePasswordInputChange}
                      className="form-input pr-10"
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
                    {t('settings.confirmNewPasswordLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="confirm_password"
                      name="confirm_password"
                      type={showPassword.confirm ? 'text' : 'password'}
                      value={passwordChange.confirm_password}
                      onChange={handlePasswordInputChange}
                      className="form-input pr-10"
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

          {/* Two-Factor Authentication */}
          <div className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-blue-500" />
                {t('settings.twoFactorAuth')}
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {t('settings.twoFactorDescription')}
                </p>
                {twoFactorEnabled ? (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-200">
                          {t('settings.twoFactorEnabled')}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                          {t('settings.twoFactorEnabledDescription')}
                        </p>
                      </div>
                      <CheckIcon className="h-6 w-6 text-green-600" />
                    </div>
                    <button
                      onClick={handleDisable2FA}
                      className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      {t('settings.disable2FA')}
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
                      {t('settings.twoFactorDisabled')}
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
                      {t('settings.twoFactorEnableDescription')}
                    </p>
                    <button
                      onClick={() => setShow2FAModal(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
{t('settings.enable2FA')}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="card hover-lift animate-fadeIn">
            <div className="card-header">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                <ShieldCheckIcon className="h-5 w-5 mr-2 text-orange-500" />
                {t('settings.accountActions')}
              </h3>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-200">{t('settings.deleteAccount')}</h4>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1 mb-2">
                    {t('settings.deleteAccountDescription')}
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="mt-3 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {t('settings.deleteMyAccount')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Tab */}
      {activeTab === 'activity' && (
        <div className="card hover-lift animate-fadeIn">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
              <ChartBarIcon className="h-5 w-5 mr-2 text-purple-500" />
              {t('settings.activityLog')}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {t('settings.activityDescription')}
            </p>
          </div>
          <div className="card-body">
            <div className="p-8 text-center">
              <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
                {t('settings.activityComingSoon')}
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('settings.activityWillBeLogged')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Two-Factor Authentication Modal */}
      <TwoFactorSetupModal
        isOpen={show2FAModal}
        onClose={() => setShow2FAModal(false)}
        onSuccess={(backupCodes) => {
          setTwoFactorEnabled(true);
          setMessage(t('settings.2FAEnabledSuccess'));
          console.log('Backup codes:', backupCodes);
        }}
      />

      {/* Delete Account Modal */}
      <DeleteAccountModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={() => {
          logout();
        }}
        currentUsername={user?.email || ''}
      />
    </div>
  );
};

export default SettingsPage;
