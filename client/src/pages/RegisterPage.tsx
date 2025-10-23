import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import apiService from '../services/api';
import ThemeToggle from '../components/ThemeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const { completeRegistration } = useAuth();
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [formData, setFormData] = useState({
    token: '',
    password: '',
    confirmPassword: '',
    preferred_language: 'en',
    main_currency: 'USD',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [invitationInfo, setInvitationInfo] = useState<any>(null);

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      setFormData(prev => ({ ...prev, token }));
      validateInvitation(token);
    }
  }, [searchParams]);

  const validateInvitation = async (token: string) => {
    try {
      const response = await apiService.validateInvitation(token);
      setInvitationInfo(response);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid invitation token');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    try {
      await completeRegistration(formData);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
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

      <div className="relative flex min-h-screen">
        {/* Left side - Branding */}
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:items-center lg:px-12">
          <div className="animate-fadeIn text-center">
            <div className="mb-8">
              <div className="h-24 w-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl flex items-center justify-center shadow-2xl mx-auto mb-6 relative overflow-hidden">
                {/* Cool logo design */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-80"></div>
                <div className="relative z-10">
                  <svg className="h-12 w-12 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                    <path d="M2 17L12 22L22 17" />
                    <path d="M2 12L12 17L22 12" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 h-3 w-3 bg-yellow-400 rounded-full animate-pulse"></div>
                <div className="absolute -bottom-1 -left-1 h-2 w-2 bg-green-400 rounded-full animate-bounce"></div>
              </div>
              <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-2 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                FamHub
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-300 font-medium">Family Management System</p>
            </div>
          </div>
        </div>

        {/* Right side - Registration Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="animate-slideIn">
              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="h-16 w-16 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 opacity-80"></div>
                    <div className="relative z-10">
                      <svg className="h-8 w-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L2 7L12 12L22 7L12 2Z" />
                        <path d="M2 17L12 22L22 17" />
                        <path d="M2 12L12 17L22 12" />
                      </svg>
                    </div>
                    <div className="absolute -top-1 -right-1 h-2 w-2 bg-yellow-400 rounded-full animate-pulse"></div>
                    <div className="absolute -bottom-1 -left-1 h-1.5 w-1.5 bg-green-400 rounded-full animate-bounce"></div>
                  </div>
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                      FamHub
                    </h1>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Family Management System</p>
                  </div>
                </div>
              </div>

              {/* Theme toggle */}
              <div className="flex justify-end mb-6">
                <ThemeToggle />
              </div>

              {/* Registration form */}
              <div className="card hover-lift">
                <div className="card-header">
                  <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    {t('auth.completeRegistration')}
                  </h2>
                  <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
                    Complete your account setup
                  </p>
                </div>

                <div className="card-body">
                  {invitationInfo && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        <p><strong>Email:</strong> {invitationInfo.email}</p>
                        <p><strong>Household:</strong> {invitationInfo.household_name}</p>
                        <p><strong>Invited by:</strong> {invitationInfo.created_by}</p>
                      </div>
                    </div>
                  )}
                  
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-fadeIn">
                        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                      </div>
                    )}
                    
                    <div>
                      <label htmlFor="token" className="form-label">
                        {t('auth.invitationToken')}
                      </label>
                      <input
                        id="token"
                        name="token"
                        type="text"
                        required
                        value={formData.token}
                        onChange={handleChange}
                        className="form-input"
                        placeholder={t('auth.invitationToken')}
                      />
                    </div>
                    
                    <div>
                      <label htmlFor="password" className="form-label">
                        {t('auth.password')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={formData.password}
                          onChange={handleChange}
                          className="form-input pl-12 pr-12"
                          placeholder={t('common.enterPassword')}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center z-10"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="confirmPassword" className="form-label">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="confirmPassword"
                          name="confirmPassword"
                          type={showConfirmPassword ? 'text' : 'password'}
                          required
                          value={formData.confirmPassword}
                          onChange={handleChange}
                          className="form-input pl-12 pr-12"
                          placeholder={t('common.confirmPassword')}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-4 flex items-center z-10"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div>
                      <label htmlFor="preferred_language" className="form-label">
                        {t('settings.language')}
                      </label>
                      <select
                        id="preferred_language"
                        name="preferred_language"
                        value={formData.preferred_language}
                        onChange={handleChange}
                        className="form-input"
                      >
                        {languages.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.name}
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
                        value={formData.main_currency}
                        onChange={handleChange}
                        className="form-input"
                      >
                        {currencies.map((currency) => (
                          <option key={currency.code} value={currency.code}>
                            {currency.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full flex items-center justify-center"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        t('auth.createAccount')
                      )}
                    </button>
                  </form>
                </div>

                <div className="card-footer">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Already have an account?{' '}
                      <Link
                        to="/login"
                        className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        {t('auth.login')}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
