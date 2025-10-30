import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useModuleContext } from '../contexts/ModuleContext';
import apiService from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { 
  BanknotesIcon,
  CheckCircleIcon,
  XCircleIcon,
  SparklesIcon,
  ClockIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

interface Module {
  module_key: string;
  name: string;
  description: string | null;
  category: 'free' | 'premium';
  isActive?: boolean;
  expiresAt?: string | null;
 …}

interface TokenAccount {
  balance: number;
  totalPurchased: number;
}

const TokenTab: React.FC = () => {
  const { t } = useTranslation();
  const { tokenAccount, availableModules, refreshModules, hasModule } = useModuleContext();
  const [modules, setModules] = useState<Module[]>([]);
  const [currentTokenAccount, setCurrentTokenAccount] = useState<TokenAccount | null>(tokenAccount);
  const [isLoading, setIsLoading] = useState(true);
  const [isActivating, setIsActivating] = useState<string | null>(null);
  const [isDeactivating, setIsDeactivating] = useState<string | null>(null);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [moduleToDeactivate, setModuleToDeactivate] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Refresh token balance and modules whenever the tab is opened
  useEffect(() => {
    refreshBalanceAndModules();
  }, []); // Run once when component mounts (when tab is opened)

  const refreshBalanceAndModules = async () => {
    try {
      // Refresh modules context (this also updates token account in context)
      await refreshModules();
      
      // Also directly fetch token account to ensure it's always fresh
      const tokenResponse = await apiService.get('/modules/token-account');
      if (tokenResponse.data) {
        setCurrentTokenAccount({
          balance: tokenResponse.data.balance || 0,
          totalPurchased: tokenResponse.data.totalPurchased || 0
        });
      }
      
      // Load modules list
      await loadModules();
    } catch (error: any) {
      console.error('Error refreshing balance:', error);
      // Still try to load modules even if balance fetch fails
      await loadModules();
    }
  };

  useEffect(() => {
    // Update local state when context tokenAccount changes
    if (tokenAccount) {
      setCurrentTokenAccount(tokenAccount);
    }
  }, [tokenAccount]);

  useEffect(() => {
    loadModules();
  }, [availableModules]);

  const loadModules = async () => {
    try {
      setIsLoading(true);
      // Use the available endpoint which returns full module details with status and expiration
      const response = await apiService.get('/modules/available');
      if (response.data && Array.isArray(response.data)) {
        setModules(response.data);
      } else {
        setError('Failed to load module data');
      }
    } catch (error: any) {
      console.error('Error loading modules:', error);
      setError(error.response?.data?.error || 'Failed to load modules');
      // Fallback to context modules if available
      if (availableModules && availableModules.length > 0) {
        setModules(availableModules);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateModule = async (moduleKey: string) => {
    try {
      setIsActivating(moduleKey);
      setError('');
      setMessage('');
      
      const response = await apiService.post(`/modules/${moduleKey}/activate`);
      
      if (response.data) {
        setMessage(`${moduleKey} module activated successfully!`);
        await refreshBalanceAndModules();
      }
    } catch (error: any) {
      console.error('Error activating module:', error);
      const errorMsg = error.response?.data?.error || 'Failed to activate module';
      if (error.response?.data?.code === 'INSUFFICIENT_TOKENS') {
        setError(`Insufficient tokens. You need 1 token but only have ${error.response.data.available || 0}.`);
      } else {
        setError(errorMsg);
      }
    } finally {
      setIsActivating(null);
    }
  };

  const handleDeactivateClick = (moduleKey: string) => {
    setModuleToDeactivate(moduleKey);
    setShowDeactivateConfirm(true);
    setError('');
    setMessage('');
  };

  const handleDeactivateModule = async () => {
    if (!moduleToDeactivate) return;

    try {
      setIsDeactivating(moduleToDeactivate);
      setError('');
      setMessage('');
      setShowDeactivateConfirm(false);
      
      const response = await apiService.post(`/modules/${moduleToDeactivate}/deactivate`);
      
      if (response.data) {
        if (response.data.refunded) {
          setMessage(`${moduleToDeactivate} module deactivated. ${response.data.refundAmount} tokens refunded.`);
        } else {
          setMessage(`${moduleToDeactivate} module deactivated. No refund (used for 15+ days).`);
        }
        await refreshBalanceAndModules();
      }
    } catch (error: any) {
      console.error('Error deactivating module:', error);
      setError(error.response?.data?.error || 'Failed to deactivate module');
    } finally {
      setIsDeactivating(null);
      setModuleToDeactivate(null);
    }
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const getModuleStatus = (module: Module) => {
    if (module.category === 'free') {
      return { isActive: true, canActivate: false, canDeactivate: false };
    }
    
    const isActive = module.isActive && hasModule(module.module_key);
    const expiresAt = module.expiresAt ? new Date(module.expiresAt) : null;
    const isExpired = expiresAt && expiresAt < new Date();
    
    return {
      isActive: isActive && !isExpired,
      canActivate: !isActive || isExpired,
      canDeactivate: isActive && !isExpired,
      expiresAt: module.expiresAt
    };
  };

  const premiumModules = modules.filter(m => m.category === 'premium');
  const freeModules = modules.filter(m => m.category === 'free');

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Token Account Balance */}
      <div className="card hover-lift animate-fadeIn bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center mb-2">
                <BanknotesIcon className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('modules.tokenAccount')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Use tokens to activate premium modules. 1 token = 1 module for 1 month.
              </p>
              <div className="flex items-baseline space-x-6">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('modules.currentBalance')}</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                    {currentTokenAccount ? parseFloat(currentTokenAccount.balance.toString()).toFixed(2) : (tokenAccount ? parseFloat(tokenAccount.balance.toString()).toFixed(2) : '0.00')} tokens
                  </p>
                </div>
                {(currentTokenAccount || tokenAccount) && (
                  <div>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{t('modules.totalPurchased')}</p>
                    <p className="text-xl font-semibold text-gray-700 dark:text-gray-300">
                      {parseFloat((currentTokenAccount || tokenAccount)!.totalPurchased.toString()).toFixed(2)} tokens
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-500 mr-2" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}
      
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
        </div>
      )}

      {/* Premium Modules */}
      <div className="card hover-lift animate-fadeIn">
        <div className="card-header">
          <div className="flex items-center">
            <SparklesIcon className="h-5 w-5 text-purple-500 mr-2" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('modules.premiumModules')}
            </h3>
          </div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Activate premium modules using your tokens. Each module costs 1 token and lasts 1 month.
          </p>
        </div>
        <div className="card-body">
          <div className="space-y-3">
            {premiumModules.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                No premium modules available.
              </p>
            ) : (
              premiumModules.map((module) => {
                const status = getModuleStatus(module);
                return (
                  <div
                    key={module.module_key}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
                  >
                    <div className="flex-1">
                      <div className="flex items-center">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {module.name}
                        </h4>
                        {status.isActive && (
                          <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                        )}
                      </div>
                      {module.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {module.description}
                        </p>
                      )}
                      {status.isActive && status.expiresAt && (
                        <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 flex items-center">
                          <ClockIcon className="h-3 w-3 mr-1" />
                          {t('modules.expires')}: {formatDate(status.expiresAt)}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Cost: 1 token/month
                      </p>
                    </div>
                    <div className="ml-4">
                      {status.canActivate ? (
                        <button
                          onClick={() => handleActivateModule(module.module_key)}
                          disabled={isActivating !== null || (!currentTokenAccount && !tokenAccount) || parseFloat((currentTokenAccount || tokenAccount)!.balance.toString()) < 1}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isActivating === module.module_key ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            t('modules.grant')
                          )}
                        </button>
                      ) : status.canDeactivate ? (
                        <button
                          onClick={() => handleDeactivateClick(module.module_key)}
                          disabled={isDeactivating !== null || showDeactivateConfirm}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-medium disabled:opacity-50"
                        >
                          {isDeactivating === module.module_key ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            t('modules.revoke')
                          )}
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Free Modules (Info Only) */}
      {freeModules.length > 0 && (
        <div className="card hover-lift animate-fadeIn">
          <div className="card-header">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('modules.freeModules')}
            </h3>
          </div>
          <div className="card-body">
            <div className="space-y-2">
              {freeModules.map((module) => (
                <div
                  key={module.module_key}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                >
                  <div className="flex items-center">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      {module.name}
                    </h4>
                    <CheckCircleIcon className="h-5 w-5 text-green-500 ml-2" />
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {t('modules.alwaysActive')}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Deactivate Confirmation Modal */}
      {showDeactivateConfirm && moduleToDeactivate && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowDeactivateConfirm(false)}></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="sm:flex sm:items-start">
                  <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 sm:mx-0 sm:h-10 sm:w-10">
                    <ExclamationTriangleIcon className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                      Deactivate Module
                    </h3>
                    <div className="mt-2">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Are you sure you want to deactivate <strong>{moduleToDeactivate}</strong>?
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                        You may receive a partial refund if the module was used for less than 15 days.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={handleDeactivateModule}
                  disabled={isDeactivating !== null}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDeactivating ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Deactivating...
                    </>
                  ) : (
                    'Deactivate'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDeactivateConfirm(false);
                    setModuleToDeactivate(null);
                  }}
                  disabled={isDeactivating !== null}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TokenTab;

