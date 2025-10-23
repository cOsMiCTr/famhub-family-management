import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, ClipboardDocumentIcon, CheckIcon, ExclamationTriangleIcon, QrCodeIcon } from '@heroicons/react/24/outline';
import LoadingSpinner from './LoadingSpinner';
import apiService from '../services/api';

interface UserGenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any) => void;
  households: any[];
}

const UserGenerationModal: React.FC<UserGenerationModalProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  households 
}) => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: '',
    household_id: '',
    role: 'user',
    can_view_contracts: false,
    can_view_income: false,
    can_edit: false
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedUser, setGeneratedUser] = useState<any>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.createUser(formData);
      setGeneratedUser(response);
      onSuccess(response.user);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    if (error) {
      setError('');
    }
  };

  const copyPassword = async () => {
    if (generatedUser?.temporary_password) {
      try {
        await navigator.clipboard.writeText(generatedUser.temporary_password);
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      } catch (err) {
        console.error('Failed to copy password:', err);
      }
    }
  };

  const downloadPassword = () => {
    if (generatedUser?.temporary_password) {
      const content = `User Credentials
================

Email: ${generatedUser.user.email}
Temporary Password: ${generatedUser.temporary_password}
Role: ${generatedUser.user.role}
Household: ${generatedUser.user.household_name}

IMPORTANT: This password is shown only once. Please provide it to the user securely.

Generated on: ${new Date().toLocaleString()}`;

      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-credentials-${generatedUser.user.email}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const handleClose = () => {
    setFormData({
      email: '',
      household_id: '',
      role: 'user',
      can_view_contracts: false,
      can_view_income: false,
      can_edit: false
    });
    setGeneratedUser(null);
    setError('');
    setCopiedPassword(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        {/* Modal */}
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 sm:mx-0 sm:h-10 sm:w-10">
                <svg className="h-6 w-6 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Create New User
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Generate a new user account with temporary credentials.
                  </p>
                </div>
                
                {/* Error Message */}
                {error && (
                  <div className="mt-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                      <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                    </div>
                  </div>
                )}

                {/* Generated User Display */}
                {generatedUser ? (
                  <div className="mt-6 space-y-4">
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <CheckIcon className="h-5 w-5 text-green-500 mr-2" />
                        <h4 className="text-sm font-medium text-green-800 dark:text-green-200">
                          User Created Successfully
                        </h4>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div><strong>Email:</strong> {generatedUser.user.email}</div>
                        <div><strong>Role:</strong> {generatedUser.user.role}</div>
                        <div><strong>Household:</strong> {generatedUser.user.household_name}</div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                      <div className="flex items-center mb-3">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500 mr-2" />
                        <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                          Temporary Password
                        </h4>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <code className="flex-1 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded text-sm font-mono">
                          {generatedUser.temporary_password}
                        </code>
                        <button
                          type="button"
                          onClick={copyPassword}
                          className="flex items-center px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                        >
                          {copiedPassword ? (
                            <>
                              <CheckIcon className="h-4 w-4 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-2">
                        ⚠️ This password is shown only once. Please provide it to the user securely.
                      </p>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        type="button"
                        onClick={downloadPassword}
                        className="flex-1 flex items-center justify-center px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded text-sm"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download
                      </button>
                    </div>
                  </div>
                ) : (
                  /* User Creation Form */
                  <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        required
                        className="form-input"
                        placeholder="user@example.com"
                        value={formData.email}
                        onChange={handleChange}
                      />
                    </div>

                    <div>
                      <label className="form-label">Household</label>
                      <select
                        name="household_id"
                        required
                        className="form-input"
                        value={formData.household_id}
                        onChange={handleChange}
                      >
                        <option value="">Select a household</option>
                        {households.map((household) => (
                          <option key={household.id} value={household.id}>
                            {household.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Role</label>
                      <select
                        name="role"
                        className="form-input"
                        value={formData.role}
                        onChange={handleChange}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="form-label">Permissions</label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="can_view_contracts"
                            checked={formData.can_view_contracts}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Can view contracts
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="can_view_income"
                            checked={formData.can_view_income}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Can view income
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="can_edit"
                            checked={formData.can_edit}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                            Can edit
                          </span>
                        </label>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {generatedUser ? (
              <button
                type="button"
                onClick={handleClose}
                className="btn-primary sm:ml-3 sm:w-auto w-full"
              >
                Close
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary sm:ml-3 sm:w-auto w-full"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || !formData.email || !formData.household_id}
                  onClick={handleSubmit}
                  className="btn-primary sm:ml-3 sm:w-auto w-full disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span className="ml-2">Creating User...</span>
                    </>
                  ) : (
                    'Create User'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserGenerationModal;
