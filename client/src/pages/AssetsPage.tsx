import React from 'react';
import { useTranslation } from 'react-i18next';

const AssetsPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('assets.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage your family's income and expenses
        </p>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Assets & Income Management
          </h3>
          <div className="text-sm text-gray-600">
            <p>This page will include:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>Add income and expense entries</li>
              <li>Multi-currency support (TRY, GBP, USD, EUR, GOLD)</li>
              <li>Automatic currency conversion</li>
              <li>Category management</li>
              <li>Individual and household views</li>
              <li>Asset filtering and search</li>
              <li>Income analytics and charts</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssetsPage;
