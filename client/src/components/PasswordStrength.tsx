import React from 'react';
import { PasswordService } from '../services/passwordService';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

const PasswordStrength: React.FC<PasswordStrengthProps> = ({ password, className = '' }) => {
  const strength = PasswordService.calculatePasswordStrength(password);
  const label = PasswordService.getPasswordStrengthLabel(strength);
  
  const getStrengthColor = (score: number) => {
    if (score < 25) return 'bg-red-500';
    if (score < 50) return 'bg-orange-500';
    if (score < 75) return 'bg-yellow-500';
    if (score < 90) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthTextColor = (score: number) => {
    if (score < 25) return 'text-red-600 dark:text-red-400';
    if (score < 50) return 'text-orange-600 dark:text-orange-400';
    if (score < 75) return 'text-yellow-600 dark:text-yellow-400';
    if (score < 90) return 'text-blue-600 dark:text-blue-400';
    return 'text-green-600 dark:text-green-400';
  };

  const requirements = [
    {
      text: 'At least 8 characters',
      met: password.length >= 8,
      icon: password.length >= 8 ? '✓' : '✗'
    },
    {
      text: 'One uppercase letter',
      met: /[A-Z]/.test(password),
      icon: /[A-Z]/.test(password) ? '✓' : '✗'
    },
    {
      text: 'One lowercase letter',
      met: /[a-z]/.test(password),
      icon: /[a-z]/.test(password) ? '✓' : '✗'
    },
    {
      text: 'One number',
      met: /[0-9]/.test(password),
      icon: /[0-9]/.test(password) ? '✓' : '✗'
    },
    {
      text: 'One special character',
      met: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      icon: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? '✓' : '✗'
    }
  ];

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Strength Meter */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Password Strength
          </span>
          <span className={`text-sm font-semibold ${getStrengthTextColor(strength)}`}>
            {label}
          </span>
        </div>
        
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getStrengthColor(strength)}`}
            style={{ width: `${strength}%` }}
          />
        </div>
        
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Score: {strength}/100
        </div>
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Requirements:
        </div>
        {requirements.map((req, index) => (
          <div
            key={index}
            className={`flex items-center space-x-2 text-sm ${
              req.met 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            <span className={`font-bold ${req.met ? 'text-green-500' : 'text-gray-400'}`}>
              {req.icon}
            </span>
            <span>{req.text}</span>
          </div>
        ))}
      </div>

      {/* Additional Tips */}
      {password.length > 0 && strength < 75 && (
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Tips for a stronger password:</strong>
            <ul className="mt-1 list-disc list-inside space-y-1">
              {password.length < 12 && <li>Use at least 12 characters</li>}
              {!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) && <li>Add special characters</li>}
              {!/(.)\1{2,}/.test(password) && <li>Avoid repeated characters</li>}
              <li>Use a mix of letters, numbers, and symbols</li>
              <li>Avoid common words or patterns</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default PasswordStrength;
