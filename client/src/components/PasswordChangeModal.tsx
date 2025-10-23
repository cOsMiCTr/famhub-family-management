import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EyeIcon, EyeSlashIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import PasswordStrength from './PasswordStrength';
import { PasswordService } from '../services/passwordService';
import apiService from '../services/api';

interface PasswordChangeModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  onError: (error: string) => void;
}

const PasswordChangeModal: React.FC<PasswordChangeModalProps> = ({ isOpen, onSuccess, onError }) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors([]);

    try {
      // Validate passwords match
      if (formData.new_password !== formData.confirm_password) {
        setErrors(['Passwords do not match']);
        setIsLoading(false);
        return;
      }

      // Validate password complexity
      const complexityCheck = PasswordService.validatePasswordComplexity(formData.new_password);
      if (!complexityCheck.isValid) {
        setErrors(complexityCheck.errors);
        setIsLoading(false);
        return;
      }

      // Call API to change password
      await apiService.changePasswordFirstLogin(formData);
      
      // Success - close modal and notify parent
      onSuccess();
      
      // Reset form
      setFormData({
        current_password: '',
        new_password: '',
        confirm_password: ''
      });
      
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Failed to change password';
      onError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" />
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Change Password Required
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      You must change your password before continuing. Please choose a strong password.
                    </p>
                  </div>
                  
                  {/* Error Messages */}
                  {errors.length > 0 && (
                    <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                      <div className="flex">
                        <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                        <div>
                          <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                            Password Requirements Not Met
                          </h4>
                          <ul className="mt-1 text-sm text-red-700 dark:text-red-300 list-disc list-inside">
                            {errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Form Fields */}
                  <div className="mt-6 space-y-4">
                    {/* Current Password */}
                    <div>
                      <label className="form-label">Current Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          name="current_password"
                          required
                          className="form-input pr-12"
                          placeholder={t('common.enterCurrentPassword')}
                          value={formData.current_password}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('current')}
                        >
                          {showPasswords.current ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* New Password */}
                    <div>
                      <label className="form-label">New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          name="new_password"
                          required
                          className="form-input pr-12"
                          placeholder={t('common.enterNewPassword')}
                          value={formData.new_password}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('new')}
                        >
                          {showPasswords.new ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {formData.new_password && (
                        <div className="mt-2">
                          <PasswordStrength password={formData.new_password} />
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="form-label">Confirm New Password</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          name="confirm_password"
                          required
                          className="form-input pr-12"
                          placeholder={t('common.confirmNewPassword')}
                          value={formData.confirm_password}
                          onChange={handleChange}
                        />
                        <button
                          type="button"
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                          onClick={() => togglePasswordVisibility('confirm')}
                        >
                          {showPasswords.confirm ? (
                            <EyeSlashIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          ) : (
                            <EyeIcon className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                          )}
                        </button>
                      </div>
                      
                      {/* Password Match Indicator */}
                      {formData.confirm_password && (
                        <div className="mt-1 flex items-center space-x-2">
                          {formData.new_password === formData.confirm_password ? (
                            <>
                              <CheckCircleIcon className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600 dark:text-green-400">
                                Passwords match
                              </span>
                            </>
                          ) : (
                            <>
                              <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                              <span className="text-sm text-red-600 dark:text-red-400">
                                Passwords do not match
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading || !formData.current_password || !formData.new_password || !formData.confirm_password}
                className="btn-primary sm:ml-3 sm:w-auto w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <LoadingSpinner size="sm" />
                    <span className="ml-2">Changing Password...</span>
                  </>
                ) : (
                  'Change Password'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PasswordChangeModal;
