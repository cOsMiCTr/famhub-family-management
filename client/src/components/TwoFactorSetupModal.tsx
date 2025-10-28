import React, { useState, useEffect } from 'react';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import apiService from '../services/api';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (backupCodes: string[]) => void;
}

const TwoFactorSetupModal: React.FC<TwoFactorSetupModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1); // 1: Setup, 2: Verify, 3: Backup codes
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [manualKey, setManualKey] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && step === 1) {
      initializeSetup();
    }
  }, [isOpen, step]);

  const initializeSetup = async () => {
    try {
      setIsLoading(true);
      const response = await apiService.setupTwoFactor();
      setQrCodeUrl(response.qrCodeUrl);
      setManualKey(response.manualEntryKey);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to initialize 2FA setup');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    try {
      setIsLoading(true);
      const response = await apiService.verifyTwoFactor(verificationCode);
      setBackupCodes(response.backupCodes);
      setStep(3);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    onSuccess(backupCodes);
    onClose();
    // Reset modal
    setStep(1);
    setQrCodeUrl('');
    setManualKey('');
    setVerificationCode('');
    setBackupCodes([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-gray-500 opacity-75" onClick={onClose}></div>

        <div className="relative bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {step === 1 && 'Setup Two-Factor Authentication'}
              {step === 2 && 'Verify Setup'}
              {step === 3 && 'Backup Codes'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {/* Step 1: Setup */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Scan this QR code with Google Authenticator or a similar app to set up two-factor authentication.
              </p>

              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  {qrCodeUrl && (
                    <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 border border-gray-200 dark:border-gray-700 rounded" />
                  )}
                  <p className="mt-4 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Or enter this key manually:
                  </p>
                  <div className="mt-2 p-3 bg-gray-100 dark:bg-gray-700 rounded font-mono text-sm break-all text-center">
                    {manualKey}
                  </div>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={isLoading}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 2: Verify */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Enter the 6-digit code from your authenticator app to verify setup:
              </p>

              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                maxLength={6}
                placeholder="000000"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-center text-2xl tracking-widest font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              />

              <div className="flex space-x-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Back
                </button>
                <button
                  onClick={handleVerify}
                  disabled={isLoading || verificationCode.length !== 6}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify'}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Backup Codes */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center text-green-600 dark:text-green-400">
                <CheckIcon className="h-5 w-5 mr-2" />
                <span className="font-medium">Two-factor authentication enabled!</span>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded">
                <p className="text-sm text-yellow-800 dark:text-yellow-200 font-medium mb-2">
                  Important: Save these backup codes
                </p>
                <p className="text-xs text-yellow-700 dark:text-yellow-300">
                  If you lose access to your authenticator app, you can use these codes to log in. Store them in a safe place.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div
                    key={index}
                    className="p-3 bg-gray-100 dark:bg-gray-700 rounded text-center"
                  >
                    {code}
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                I've Saved These Codes
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TwoFactorSetupModal;

