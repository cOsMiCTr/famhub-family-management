import React from 'react';
import { useTranslation } from 'react-i18next';

interface ExpenseSubscriptionFormProps {
  subscriptionProvider?: string;
  subscriptionTier?: string;
  onChange: (data: {
    subscription_provider?: string;
    subscription_tier?: string;
  }) => void;
  error?: string;
}

const ExpenseSubscriptionForm: React.FC<ExpenseSubscriptionFormProps> = ({
  subscriptionProvider = '',
  subscriptionTier = '',
  onChange,
  error
}) => {
  const { t } = useTranslation();

  const handleInputChange = (field: string, value: string) => {
    onChange({ [field]: value || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('expenses.subscriptionDescription') || 'Select the subscription provider and tier (if applicable).'}
        </p>
      </div>

      {/* Subscription Provider (Subcategory) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.subscriptionProvider') || 'Subscription Provider'}
        </label>
        <select
          value={subscriptionProvider}
          onChange={(e) => handleInputChange('subscription_provider', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">{t('expenses.selectProvider') || 'Select provider...'}</option>
          <option value="netflix">{t('expenses.subscriptionProviders.netflix') || 'Netflix'}</option>
          <option value="spotify">{t('expenses.subscriptionProviders.spotify') || 'Spotify'}</option>
          <option value="amazon_prime">{t('expenses.subscriptionProviders.amazonPrime') || 'Amazon Prime'}</option>
          <option value="disney_plus">{t('expenses.subscriptionProviders.disneyPlus') || 'Disney+'}</option>
          <option value="gym_membership">{t('expenses.subscriptionProviders.gym') || 'Gym Membership'}</option>
          <option value="magazine">{t('expenses.subscriptionProviders.magazine') || 'Magazine Subscription'}</option>
          <option value="software">{t('expenses.subscriptionProviders.software') || 'Software Subscription'}</option>
          <option value="other">{t('expenses.subscriptionProviders.other') || 'Other'}</option>
        </select>
        {subscriptionProvider === 'other' && (
          <input
            type="text"
            value={subscriptionProvider === 'other' ? subscriptionProvider : ''}
            onChange={(e) => handleInputChange('subscription_provider', e.target.value)}
            placeholder={t('expenses.enterProviderName') || 'Enter provider name...'}
            className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        )}
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Subscription Tier/Plan */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.subscriptionTier') || 'Subscription Tier / Plan'}
        </label>
        <input
          type="text"
          value={subscriptionTier}
          onChange={(e) => handleInputChange('subscription_tier', e.target.value)}
          placeholder={t('expenses.tierPlaceholder') || 'e.g., Premium, Basic, Family Plan...'}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>
    </div>
  );
};

export default ExpenseSubscriptionForm;

