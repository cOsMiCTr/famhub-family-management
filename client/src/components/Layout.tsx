import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useModuleContext } from '../contexts/ModuleContext';
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
  UsersIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  TicketIcon
} from '@heroicons/react/24/outline';

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const { isDark } = useTheme();
  const { hasModule } = useModuleContext();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  
  // Desktop sidebar collapse state (persisted in localStorage)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved ? JSON.parse(saved) : false;
  });
  
  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', JSON.stringify(newState));
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsLanguageMenuOpen(false);
  };

  const navigation = [
    { name: t('navigation.dashboard'), href: '/dashboard', icon: HomeIcon, module: null }, // Always show
    { name: t('navigation.income'), href: '/income', icon: BanknotesIcon, module: 'income' },
    { name: t('navigation.assets'), href: '/assets', icon: CurrencyDollarIcon, module: 'assets' },
    { name: t('navigation.settings'), href: '/settings', icon: Cog6ToothIcon, module: null }, // Always show
  ].filter(item => !item.module || hasModule(item.module));

  // Admin-only navigation items
  const adminNavigation = [
    { name: t('admin.adminDashboard'), href: '/admin/dashboard', icon: ChartBarIcon },
    { name: t('admin.userManagement'), href: '/admin/users', icon: UserGroupIcon },
    { name: t('admin.securityDashboard'), href: '/admin/security', icon: ShieldCheckIcon },
    { name: t('admin.translations'), href: '/admin/translations', icon: LanguageIcon },
    { name: t('admin.currencyManagement'), href: '/admin/currencies', icon: CurrencyDollarIcon },
    { name: t('incomeCategories.title'), href: '/admin/income-categories', icon: DocumentTextIcon },
    { name: t('assetCategories.title'), href: '/admin/asset-categories', icon: CurrencyDollarIcon },
    { name: 'Voucher Management', href: '/admin/vouchers', icon: TicketIcon },
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
        <div id="sidebar" className={`fixed inset-y-0 left-0 z-50 transform transition-all duration-300 ease-in-out lg:relative lg:flex-shrink-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'
        } ${
          isSidebarCollapsed ? 'lg:w-16' : 'lg:w-64'
        }`}>
          <div id="sidebar-content" className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl lg:shadow-none">
            {/* Logo */}
            <div id="sidebar-logo" className="flex h-16 items-center justify-between px-4 lg:px-6 border-b border-gray-200 dark:border-gray-700">
              <div className={`flex items-center space-x-3 ${isSidebarCollapsed ? 'lg:justify-center lg:space-x-0' : ''}`}>
                <span className={`text-xl font-bold text-gray-900 dark:text-white ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>FamHub</span>
              </div>
              <div className="flex items-center space-x-2">
                {/* Desktop collapse button */}
                <button
                  onClick={toggleSidebar}
                  className="hidden lg:flex p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  title={isSidebarCollapsed ? t('navigation.expandSidebar') : t('navigation.collapseSidebar')}
                >
                  {isSidebarCollapsed ? (
                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronLeftIcon className="h-5 w-5 text-gray-500" />
                  )}
                </button>
                {/* Mobile close button */}
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  <XMarkIcon className="h-5 w-5 text-gray-500" />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav id="sidebar-nav" className="flex-1 px-2 lg:px-4 py-6 space-y-2">
              {navigation.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`group flex items-center px-2 lg:px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    title={isSidebarCollapsed ? item.name : ''}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 ${
                      isSidebarCollapsed ? 'lg:mr-0' : 'mr-3'
                    } ${
                      isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                    }`} />
                    <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Admin-only navigation items */}
              {user?.role === 'admin' && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 my-4"></div>
                  <div className={`px-2 lg:px-3 py-2 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
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
                        className={`group flex items-center px-2 lg:px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border-r-2 border-blue-500'
                            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                        } ${isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                        title={isSidebarCollapsed ? item.name : ''}
                      >
                        <item.icon className={`h-5 w-5 flex-shrink-0 ${
                          isSidebarCollapsed ? 'lg:mr-0' : 'mr-3'
                        } ${
                          isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'
                        }`} />
                        <span className={isSidebarCollapsed ? 'lg:hidden' : ''}>{item.name}</span>
                      </Link>
                    );
                  })}
                </>
              )}
            </nav>

            {/* User section */}
            <div id="sidebar-user-section" className="border-t border-gray-200 dark:border-gray-700 p-2 lg:p-4">
              <div className={`flex items-center space-x-3 mb-4 ${isSidebarCollapsed ? 'lg:justify-center lg:space-x-0' : ''}`}>
                <div className="h-10 w-10 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserIcon className="h-5 w-5 text-white" />
                </div>
                <div className={`flex-1 min-w-0 ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {user?.email}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {user?.role === 'admin' ? t('user.admin') : t('user.member')}
                  </p>
                </div>
              </div>
              
              {/* Controls */}
              <div className={`flex items-center space-x-2 ${isSidebarCollapsed ? 'lg:flex-col lg:space-x-0 lg:space-y-2' : ''}`}>
                {/* Language selector */}
                <div className={`relative ${isSidebarCollapsed ? 'lg:w-full' : 'flex-1'}`}>
                  <button
                    onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
                    className={`flex items-center justify-center w-full px-2 lg:px-3 py-2 text-sm text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
                      isSidebarCollapsed ? 'lg:justify-center lg:px-2' : ''
                    }`}
                    title={isSidebarCollapsed ? currentLanguage.name : ''}
                  >
                    <LanguageIcon className="h-4 w-4 flex-shrink-0" />
                    <span className={`${isSidebarCollapsed ? 'lg:hidden' : ''} ml-2 lg:mr-1`}>{currentLanguage.flag}</span>
                    <span className={`truncate ${isSidebarCollapsed ? 'lg:hidden' : ''}`}>{currentLanguage.name}</span>
                  </button>
                  
                  {isLanguageMenuOpen && (
                    <div className={`absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${
                      isSidebarCollapsed ? 'lg:left-0 lg:right-auto lg:ml-2 lg:min-w-[150px]' : 'left-0 right-0'
                    }`}>
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
                <div className={isSidebarCollapsed ? 'lg:w-full' : ''}>
                  <ThemeToggle />
                </div>
              </div>
              
              {/* Logout button */}
              <button
                onClick={handleLogout}
                className={`w-full mt-3 flex items-center justify-center px-2 lg:px-3 py-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors ${
                  isSidebarCollapsed ? 'lg:px-2' : ''
                }`}
                title={isSidebarCollapsed ? t('auth.logout') : ''}
              >
                <ArrowRightOnRectangleIcon className="h-4 w-4 flex-shrink-0" />
                <span className={isSidebarCollapsed ? 'lg:hidden ml-2' : 'ml-2'}>{t('auth.logout')}</span>
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