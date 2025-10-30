import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { 
  CheckCircleIcon, 
  XCircleIcon,
  SparklesIcon,
  BanknotesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface Module {
  module_key: string;
  name: string;
  description: string | null;
  category: 'free' | 'premium';
  display_order: number;
  is_active: boolean;
}

interface ModuleActivation {
  id: number;
  user_id: number;
  module_key: string;
  activated_at: string;
  expires_at: string;
  activation_order: number;
  is_active: boolean;
  token_used: number;
}

interface TokenAccount {
  balance: number;
  totalPurchased: number;
}

interface UserModuleManagementProps {
  userId: number;
  onClose: () => void;
  onUpdate?: () => void;
}

const UserModuleManagement: React.FC<UserModuleManagementProps> = ({ 
  userId, 
  onClose, 
  onUpdate 
}) => {
  const { t } = useTranslation();
  const [modules, setModules] = useState<Module[]>([]);
  const [userModules, setUserModules] = useState<string[]>([]);
  const [activeModules, setActiveModules] = useState<ModuleActivation[]>([]);
  const [tokenAccount, setTokenAccount] = useState<TokenAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [grantTokenAmount, setGrantTokenAmount] = useState('');
  const [editBalance, setEditBalance] = useState(false);
  const [newBalance, setNewBalance] = useState('');

  useEffect(() => {
    loadData();
  }, [userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [modulesResponse, userModulesResponse] = await Promise.all([
        apiService.get('/admin/modules'),
        apiService.get(`/admin/users/${userId}/modules`)
      ]);

      setModules(modulesResponse.data || []);
      setUserModules(userModulesResponse.data.modules || []);
      setActiveModules(userModulesResponse.data.activeModules || []);

      // Fetch token account for this user
      try {
        const tokenResponse = await apiService.get(`/admin/users/${userId}/tokens`);
        if (tokenResponse.data) {
          setTokenAccount({
            balance: tokenResponse.data.balance || 0,
            totalPurchased: tokenResponse.data.totalPurchased || 0
          });
        }
      } catch (err) {
        // Token account might not exist yet
        setTokenAccount(null);
      }
    } catch (error: any) {
      console.error('Error loading module data:', error);
      setError(error.response?.data?.error || 'Failed to load module data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGrantModule = async (moduleKey: string) => {
    try {
      setIsSaving(true);
      setError('');
      await apiService.post(`/admin/users/${userId}/modules/${moduleKey}/grant`, {
        reason: 'Admin grant'
      });
      setMessage(`Module ${moduleKey} granted successfully`);
      await loadData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error granting module:', error);
      setError(error.response?.data?.error || 'Failed to grant module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRevokeModule = async (moduleKey: string) => {
    try {
      setIsSaving(true);
      setError('');
      await apiService.post(`/admin/users/${userId}/modules/${moduleKey}/revoke`);
      setMessage(`Module ${moduleKey} revoked successfully`);
      await loadData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error revoking module:', error);
      setError(error.response?.data?.error || 'Failed to revoke module');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSetBalance = async () => {
    const balance = parseFloat(newBalance);
    if (isNaN(balance) || balance < 0) {
      setError('Please enter a valid non-negative balance');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await apiService.put(`/admin/users/${userId}/tokens/balance`, {
        balance,
        reason: 'Admin balance adjustment'
      });
      setMessage(`Token balance set to ${balance}`);
      setNewBalance('');
      setEditBalance(false);
      await loadData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error setting token balance:', error);
      setError(error.response?.data?.error || 'Failed to set token balance');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGrantTokens = async () => {
    const amount = parseFloat(grantTokenAmount);
    if (!amount || amount <= 0) {
      setError('Please enter a valid token amount');
      return;
    }

    try {
      setIsSaving(true);
      setError('');
      await apiService.post(`/admin/users/${userId}/tokens/grant`, {
        amount,
        reason: 'Admin grant'
      });
      setMessage(`${amount} tokens granted successfully`);
      setGrantTokenAmount('');
      await loadData();
      onUpdate?.();
    } catch (error: any) {
      console.error('Error granting tokens:', error);
      setError(error.response?.data?.error || 'Failed to grant tokens');
    } finally {
      setIsSaving(false);
    }
  };

  const getModuleStatus = (moduleKey: string) => {
    const hasAccess = userModules.includes(moduleKey);
    const activation = activeModules.find(ma => ma.module_key === moduleKey && ma.is_active);
    const expiresAt = activation ? new Date(activation.expires_at) : null;
    const isExpired = expiresAt && expiresAt < new Date();

    return {
      hasAccess,
      isActive: activation && !isExpired,
      expiresAt,
      isExpired
    };
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
          <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <LoadingSpinner />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const premiumModules = modules.filter(m => m.category === 'premium');
  const freeModules = modules.filter(m => m.category === 'free');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                  Module Management
                </h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Manage user's module access and token account
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Messages */}
            {error && (
              <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
              </div>
            )}
            
            {message && (
              <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <p className="text-green-700 dark:text-green-300 text-sm">{message}</p>
              </div>
            )}

            {/* Token Account */}
            <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-blue-900 dark:text-blue-200 flex items-center">
                  <BanknotesIcon className="h-5 w-5 mr-2" />
                  Token Account
                </h4>
                {!editBalance && (
                  <button
                    onClick={() => {
                      setEditBalance(true);
                      setNewBalance(tokenAccount ? parseFloat(tokenAccount.balance.toString()).toFixed(2) : '0');
                      setError('');
                      setMessage('');
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
                  >
                    Edit Balance
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 mb-3">
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Current Balance</p>
                  {editBalance ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newBalance}
                        onChange={(e) => setNewBalance(e.target.value)}
                        className="w-32 px-2 py-1 border border-blue-300 dark:border-blue-700 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="0.00"
                        autoFocus
                      />
                      <span className="text-sm text-blue-900 dark:text-blue-100">tokens</span>
                      <button
                        onClick={handleSetBalance}
                        disabled={isSaving || !newBalance}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium disabled:opacity-50"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => {
                          setEditBalance(false);
                          setNewBalance('');
                        }}
                        disabled={isSaving}
                        className="px-3 py-1 bg-gray-400 hover:bg-gray-500 text-white rounded text-xs font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                      {tokenAccount ? parseFloat(tokenAccount.balance.toString()).toFixed(2) : 'N/A'} tokens
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Total Purchased</p>
                  <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    {tokenAccount ? parseFloat(tokenAccount.totalPurchased.toString()).toFixed(2) : 'N/A'} tokens
                  </p>
                </div>
              </div>
              {!editBalance && (
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={grantTokenAmount}
                    onChange={(e) => setGrantTokenAmount(e.target.value)}
                    placeholder="Token amount to grant"
                    className="flex-1 px-3 py-2 border border-blue-300 dark:border-blue-700 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <button
                    onClick={handleGrantTokens}
                    disabled={isSaving || !grantTokenAmount}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Grant Tokens
                  </button>
                </div>
              )}
            </div>

            {/* Premium Modules */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Premium Modules
              </h4>
              <div className="space-y-2">
                {premiumModules.map((module) => {
                  const status = getModuleStatus(module.module_key);
                  return (
                    <div
                      key={module.module_key}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {module.name}
                          </h5>
                          {status.isActive && (
                            <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                          )}
                          {status.hasAccess && status.isExpired && (
                            <XCircleIcon className="h-5 w-5 text-red-500 ml-2" />
                          )}
                        </div>
                        {module.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {module.description}
                          </p>
                        )}
                        {status.isActive && status.expiresAt && (
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                            Expires: {formatDate(status.expiresAt.toISOString())}
                          </p>
                        )}
                      </div>
                      <div className="ml-4">
                        {status.hasAccess && !status.isExpired ? (
                          <button
                            onClick={() => handleRevokeModule(module.module_key)}
                            disabled={isSaving}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm font-medium disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrantModule(module.module_key)}
                            disabled={isSaving}
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-sm font-medium disabled:opacity-50"
                          >
                            Grant
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Free Modules (info only) */}
            {freeModules.length > 0 && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                  Free Modules
                </h4>
                <div className="space-y-2">
                  {freeModules.map((module) => (
                    <div
                      key={module.module_key}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                    >
                      <div className="flex-1">
                        <div className="flex items-center">
                          <h5 className="text-sm font-medium text-gray-900 dark:text-white">
                            {module.name}
                          </h5>
                          <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                        </div>
                        {module.description && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {module.description}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">Always Active</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-md text-sm font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserModuleManagement;

