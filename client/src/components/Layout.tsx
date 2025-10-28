import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from './ThemeToggle';
import AdminNotificationBell from './AdminNotificationBell';
import {
  HomeIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  UserIcon,
  LanguageIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  UsersIcon
} from '@heroicons/react/24/outline';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLanguageMenuOpen(false);
  };

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: HomeIcon },
    { name: t('navigation.assets'), href: '/assets', icon: CurrencyDollarIcon },
    { name: t('navigation.contracts'), href: '/contracts', icon: DocumentTextIcon },
    { name: t('navigation.income'), href: '/income', icon: BanknotesIcon },
    { name: t('navigation.settings'), href: '/settings', icon: Cog6ToothIcon },
  ];

  // Admin-only navigation items
  const adminNavigation = [
    { name: t('admin.adminDashboard'), href: '/admin/dashboard', icon: ChartBarIcon },
    { name: t('admin.userManagement'), href: '/admin/users', icon: UserGroupIcon },
    { name: t('admin.securityDashboard'), href: '/admin/security', icon: ShieldCheckIcon },
    { name: t('admin.translations'), href: '/admin/translations', icon: LanguageIcon },
    { name: t('admin.currencyManagement'), href: '/admin/currencies', icon: CurrencyDollarIcon },
    { name: t('incomeCategories.title'), href: '/admin/income-categories', icon: DocumentTextIcon },
    { name: t('assetCategories.title'), href: '/admin/asset-categories', icon: CurrencyDollarIcon },
  ];

  const languages = [
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  return (
    <div id="main-layout" className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Mobile menu backdrop */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-backdrop"
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Desktop Layout Container */}
      <div className="lg:flex lg:min-h-screen">
        {/* Sidebar */}
        <div id="sidebar" className={`fixed inset-y-0 left-0 z-50 w-64 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:relative lg:flex-shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}>
          <div id="sidebar-content" className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl lg:shadow-none">
            {/* Logo */}
            <div id="sidebar-logo" className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">FH</span>
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">FamHub</span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Navigation */}
            <nav id="sidebar-nav" className="flex-1 px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <item.icon className={`mr-3 h-5 w-5 ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Admin-only navigation items */}
              {user?.role === 'admin' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                  <div className="px-3 py-2">
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Admin
                    </h3>
                  </div>
                  {adminNavigation.map((item) => {
                    const isActive = location.pathname === item.href;
                    return (
                      <Link
                        key={item.name}
                        to={item.href}
                        className={`group flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        <item.icon className={`mr-3 h-5 w-5 ${
                          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        {item.name}
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>

            {/* User section */}
            <div id="sidebar-user-section" className="border-t border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-center space-x-3 mb-4">
                <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === 'admin' ? t('user.admin') : t('user.member')}
                  </p>
                </div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center space-x-2">
                {/* Language selector */}
                <div className="relative flex-1">
                  <button
                    onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                    className="flex items-center justify-center w-full px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                  >
                    <LanguageIcon className="h-4 w-4 mr-2" />
                    <span className="mr-1">{currentLanguage.flag}</span>
                    <span className="truncate">{currentLanguage.name}</span>
                  </button>
                  
                  {isLanguageMenuOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                      {languages.map((lang) => (
                        <button
                          key={lang.code}
                          onClick={() => changeLanguage(lang.code)}
                          className={`w-full px-3 py-2 text-sm text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
                            i18n.language === lang.code ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
                          }`}
                        >
                          <span className="mr-2">{lang.flag}</span>
                          {lang.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                {/* Theme toggle */}
                <ThemeToggle />
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className="w-full mt-3 flex items-center justify-center px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 mr-2" />
                {t('auth.logout')}
              </button>
            </div>
          </div>
        </div>

        {/* Main content */}
        <div id="main-content" className="lg:flex-1 lg:flex lg:flex-col lg:min-h-0">
          {/* Top bar */}
          <div id="top-bar" className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 lg:px-6">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Bars3Icon className="h-5 w-5 text-gray-500" />
            </button>
            
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-4">
                <div className="hidden sm:block">
                  <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                    {navigation.find(item => item.href === location.pathname)?.name || t('navigation.dashboard')}
                  </h1>
                </div>
              </div>
              
              {/* Admin Notification Bell - floated to right */}
              <div className="flex items-center">
                <AdminNotificationBell />
              </div>
            </div>
          </div>

          {/* Page content */}
          <main id="page-content" className="flex-1 p-4 lg:p-6 overflow-auto">
            <div id="content-wrapper" className="animate-fadeIn">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default Layout;