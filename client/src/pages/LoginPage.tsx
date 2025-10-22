import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import ThemeToggle from '../components/ThemeToggle';
import LoadingSpinner from '../components/LoadingSpinner';
import { EyeIcon, EyeSlashIcon, UserIcon, LockClosedIcon } from '@heroicons/react/24/outline';

const LoginPage: React.FC = () => {
  const { t } = useTranslation();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(formData.email, formData.password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || t('auth.invalidCredentials'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${isDark ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
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
        <div className="hidden lg:flex lg:w-1/2 lg:flex-col lg:justify-center lg:px-12">
          <div className="animate-fadeIn">
            <div className="flex items-center space-x-4 mb-8">
              <div className="h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-xl">
                <span className="text-white font-bold text-2xl">FH</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 dark:text-white">FamHub</h1>
                <p className="text-lg text-gray-600 dark:text-gray-300">Family Management System</p>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover-lift">
                <div className="h-12 w-12 bg-gradient-to-r from-green-400 to-blue-500 rounded-lg flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Multi-Household Support</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Manage multiple families with ease</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 p-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover-lift">
                <div className="h-12 w-12 bg-gradient-to-r from-purple-400 to-pink-500 rounded-lg flex items-center justify-center">
                  <LockClosedIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">Secure & Private</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">Your family data is protected</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="flex w-full lg:w-1/2 items-center justify-center px-4 sm:px-6 lg:px-8">
          <div className="w-full max-w-md">
            <div className="animate-slideIn">
              {/* Mobile logo */}
              <div className="lg:hidden text-center mb-8">
                <div className="flex items-center justify-center space-x-3 mb-4">
                  <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <span className="text-white font-bold text-lg">FH</span>
                  </div>
                  <span className="text-2xl font-bold text-gray-900 dark:text-white">FamHub</span>
                </div>
              </div>

              {/* Theme toggle */}
              <div className="flex justify-end mb-6">
                <ThemeToggle />
              </div>

              {/* Login form */}
              <div className="card hover-lift">
                <div className="card-header">
                  <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white">
                    {t('auth.login')}
                  </h2>
                  <p className="text-center text-gray-600 dark:text-gray-300 mt-2">
                    FamHub - Family Management System
                  </p>
                </div>

                <div className="card-body">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {error && (
                      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 animate-fadeIn">
                        <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                      </div>
                    )}

                    <div>
                      <label htmlFor="email" className="form-label">
                        {t('auth.email')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <UserIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          required
                          className="form-input pl-10"
                          placeholder={t('auth.email')}
                          value={formData.email}
                          onChange={handleChange}
                        />
                      </div>
                    </div>

                    <div>
                      <label htmlFor="password" className="form-label">
                        {t('auth.password')}
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <LockClosedIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          required
                          className="form-input pl-10 pr-10"
                          placeholder={t('auth.password')}
                          value={formData.password}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
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

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-primary w-full flex items-center justify-center"
                    >
                      {isLoading ? (
                        <LoadingSpinner size="sm" />
                      ) : (
                        t('auth.loginButton')
                      )}
                    </button>
                  </form>
                </div>

                <div className="card-footer">
                  <p className="text-center text-sm text-gray-600 dark:text-gray-300">
                    Don't have an account?{' '}
                    <Link
                      to="/register"
                      className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 transition-colors"
                    >
                      {t('auth.register')}
                    </Link>
                  </p>
                </div>
              </div>

              {/* Demo credentials */}
              <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">Demo Credentials:</h3>
                <div className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
                  <p><strong>Email:</strong> onurbaki@me.com</p>
                  <p><strong>Password:</strong> 1234</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;