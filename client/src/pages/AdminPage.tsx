import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  UserGroupIcon, 
  HomeIcon, 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

const AdminPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
        <p className="mt-1 text-sm text-gray-600">
          Manage users, households, and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Link 
          to="/admin/users" 
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    User Management
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Manage Users
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <Link 
          to="/admin/security" 
          className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow duration-200"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-red-500 rounded-md flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Security Dashboard
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Monitor Security
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </Link>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <HomeIcon className="h-5 w-5 text-white" />
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Household Management
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    Coming Soon
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900 mb-4">
            Admin Panel Features
          </h3>
          <div className="text-sm text-gray-600">
            <p>Current admin panel features:</p>
            <ul className="mt-2 list-disc list-inside space-y-1">
              <li>✅ User management and generation</li>
              <li>✅ Password reset and account unlocking</li>
              <li>✅ Security monitoring and notifications</li>
              <li>✅ Login attempt tracking</li>
              <li>✅ Account status management</li>
              <li>🔄 Household management (coming soon)</li>
              <li>🔄 Permission controls (coming soon)</li>
              <li>🔄 Category management (coming soon)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
