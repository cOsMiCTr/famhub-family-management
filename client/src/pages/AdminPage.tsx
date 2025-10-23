import React from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { 
  UserGroupIcon, 
  ShieldCheckIcon,
  ChartBarIcon,
  LanguageIcon
} from '@heroicons/react/24/outline';

const AdminPage: React.FC = () => {
  const { t } = useTranslation();

  const adminCards = [
    {
      title: t('admin.adminDashboard'),
      description: t('admin.systemStatistics'),
      icon: ChartBarIcon,
      href: '/admin/dashboard',
      gradient: 'from-purple-500 to-indigo-600',
      iconBg: 'bg-gradient-to-r from-purple-500 to-indigo-600'
    },
    {
      title: t('admin.userManagement'),
      description: t('admin.usersHouseholds'),
      icon: UserGroupIcon,
      href: '/admin/users',
      gradient: 'from-blue-500 to-cyan-600',
      iconBg: 'bg-gradient-to-r from-blue-500 to-cyan-600'
    },
    {
      title: t('admin.securityDashboard'),
      description: t('admin.monitorSecurity'),
      icon: ShieldCheckIcon,
      href: '/admin/security',
      gradient: 'from-red-500 to-pink-600',
      iconBg: 'bg-gradient-to-r from-red-500 to-pink-600'
    },
    {
      title: t('admin.translations'),
      description: t('admin.manageTranslations'),
      icon: LanguageIcon,
      href: '/admin/translations',
      gradient: 'from-green-500 to-emerald-600',
      iconBg: 'bg-gradient-to-r from-green-500 to-emerald-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('admin.title')}</h1>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
          Manage users, households, security, and system settings
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {adminCards.map((card) => (
          <Link 
            key={card.href}
            to={card.href} 
            className="group relative bg-white dark:bg-gray-800 overflow-hidden shadow-md rounded-xl hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
          >
            <div className="absolute inset-0 bg-gradient-to-br opacity-0 group-hover:opacity-5 transition-opacity duration-300" 
                 style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }} />
            
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`w-12 h-12 ${card.iconBg} rounded-xl flex items-center justify-center shadow-lg transform group-hover:scale-110 transition-transform duration-300`}>
                  <card.icon className="h-6 w-6 text-white" />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {card.title}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {card.description}
              </p>
            </div>
            
            <div className={`h-1 bg-gradient-to-r ${card.gradient} transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left`} />
          </Link>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
