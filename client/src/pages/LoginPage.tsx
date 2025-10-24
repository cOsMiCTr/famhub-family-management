import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import PasswordChangeModal from '../components/PasswordChangeModal';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const { t, ready } = useTranslation();
  const { login } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPasswordChangeModal, setShowPasswordChangeModal] = useState(false);
  const [lastLoginInfo, setLastLoginInfo] = useState<{ date?: string; time?: string } | null>(null);

  // Show loading spinner while translations are loading
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <LoadingSpinner />
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await login(formData.email, formData.password);
      
      // Check if password change is required
      if (response.must_change_password) {
        setShowPasswordChangeModal(true);
        return;
      }
      
      // Store last login info for display
      if (response.last_login_at) {
        const lastLogin = new Date(response.last_login_at);
        setLastLoginInfo({
          date: lastLogin.toLocaleDateString(),
          time: lastLogin.toLocaleTimeString()
        });
      }
      
      navigate('/dashboard');
    } catch (err: any) {
      const errorCode = err.response?.data?.code;
      const errorMessage = err.response?.data?.error || t('auth.invalidCredentials');
      
      if (errorCode === 'ACCOUNT_LOCKED') {
        setError(`Account is locked until ${new Date(err.response.data.error.split('until ')[1]).toLocaleString()}`);
      } else if (errorCode === 'ACCOUNT_DISABLED') {
        setError('Account has been disabled. Please contact an administrator.');
      } else {
        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    // Don't clear error immediately - let user read it
    // Error will be cleared on next submit attempt
  };

  const handlePasswordChangeSuccess = () => {
    setShowPasswordChangeModal(false);
    navigate('/dashboard');
  };

  const handlePasswordChangeError = (error: string) => {
    setError(error);
  };

  return (
    <div className={`min-h-screen ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
      {/* Background pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(156, 146, 172, 0.3) 1px, transparent 0)`,
            backgroundSize: '20px 20px'
          }}></div>
        </div>
      </div>

      {/* Theme toggle - positioned in top right corner */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>

      {/* Centered content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <div className="animate-fadeIn text-center space-y-8">
            
            {/* New Logo Design */}
            <div className="flex flex-col items-center space-y-4">
              <div className="h-20 w-20 bg-gradient-to-br from-emerald-400 via-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-2xl relative overflow-hidden hover:scale-105 transition-transform duration-300">
                {/* Modern geometric logo */}
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-300 via-blue-400 to-purple-500 opacity-90"></div>
                <div className="relative z-10">
                  <svg className="h-10 w-10 text-white" viewBox="0 0 24 24" fill="currentColor">
                    {/* Family tree/house design */}
                    <path d="M12 2L3 7L12 12L21 7L12 2Z" fill="currentColor" opacity="0.8"/>
                    <path d="M12 12L6 15L12 18L18 15L12 12Z" fill="currentColor" opacity="0.6"/>
                    <path d="M12 18L8 20L12 22L16 20L12 18Z" fill="currentColor" opacity="0.4"/>
                    <circle cx="12" cy="7" r="1.5" fill="white"/>
                    <circle cx="8" cy="15" r="1" fill="white"/>
                    <circle cx="16" cy="15" r="1" fill="white"/>
                    <circle cx="12" cy="18" r="1" fill="white"/>
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-300 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-1 -left-1 h-1.5 w-1.5 bg-emerald-300 rounded-full animate-bounce"></div>
              </div>
              
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-emerald-600 via-blue-600 to-purple-600 bg-clip-text text-transparent">
                  FamHub
                </h1>
                <p className="text-lg text-gray-600 dark:text-gray-300 font-medium">Family Management System</p>
              </div>
            </div>

            {/* Login form */}
            <div className="card hover-lift">
              <div className="card-header">
                <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                  {t('auth.login')}
                </h2>
              </div>

              <div className="card-body">
                {/* Error Message - Outside form for better visibility */}
                {error && (
                  <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-fadeIn">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setError('')}
                        className="ml-4 text-red-400 hover:text-red-600 dark:hover:text-red-200 transition-colors"
                        aria-label="Dismiss error"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">

                  <div>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className="form-input w-full px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                      placeholder={t('common.enterEmail')}
                      value={formData.email}
                      onChange={handleChange}
                    />
                  </div>

                  <div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        required
                        className="form-input w-full px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                        placeholder={t('common.enterPassword')}
                        value={formData.password}
                        onChange={handleChange}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading || !formData.email || !formData.password}
                    className="btn-primary w-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <>
                        <LoadingSpinner size="sm" />
                        <span className="ml-2">Signing in...</span>
                      </>
                    ) : (
                      t('auth.loginButton')
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Last Login Info */}
            {lastLoginInfo && (
              <div className="mt-6 animate-fadeIn">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircleIcon className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-green-800 dark:text-green-300">
                        Login successful!
                      </p>
                      <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                        Last login: {lastLoginInfo.date} at {lastLoginInfo.time}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Password Change Modal */}
      <PasswordChangeModal
        isOpen={showPasswordChangeModal}
        onSuccess={handlePasswordChangeSuccess}
        onError={handlePasswordChangeError}
      />
    </div>
  );
};

export default LoginPage;