import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';

const SettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    preferred_language: 'en',
    main_currency: 'USD',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      const response = await apiService.getUserSettings();
      setSettings({
        preferred_language: response.user.preferred_language,
        main_currency: response.user.main_currency,
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');
    setMessage('');

    try {
      await apiService.updateUserSettings(settings);
      setMessage(t('settings.settingsUpdated'));
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings({
      ...settings,
      [e.target.name]: e.target.value,
    });
  };

  const languages = [
    { code: 'en', name: t('languages.en') },
    { code: 'de', name: t('languages.de') },
    { code: 'tr', name: t('languages.tr') },
  ];

  const currencies = [
    { code: 'USD', name: t('currencies.USD') },
    { code: 'EUR', name: t('currencies.EUR') },
    { code: 'GBP', name: t('currencies.GBP') },
    { code: 'TRY', name: t('currencies.TRY') },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('settings.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your account preferences and settings
        </p>
      </div>

      {message && (
        <div className="rounded-md bg-green-50 p-4">
          <div className="text-sm text-green-700">{message}</div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-700">{error}</div>
        </div>
      )}

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            {t('settings.profile')}
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email
              </label>
              <div className="mt-1 text-sm text-gray-900">{user?.email}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Role
              </label>
              <div className="mt-1 text-sm text-gray-900 capitalize">{user?.role}</div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t('settings.household')}
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.household_name || 'No household assigned'}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Member Since
              </label>
              <div className="mt-1 text-sm text-gray-900">
                {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Preferences
          </h3>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="preferred_language" className="block text-sm font-medium text-gray-700">
                {t('settings.language')}
              </label>
              <select
                id="preferred_language"
                name="preferred_language"
                value={settings.preferred_language}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                {languages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="main_currency" className="block text-sm font-medium text-gray-700">
                {t('settings.mainCurrency')}
              </label>
              <select
                id="main_currency"
                name="main_currency"
                value={settings.main_currency}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? t('common.loading') : t('common.save')}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsPage;
