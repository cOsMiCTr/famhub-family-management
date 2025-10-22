import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'dots' | 'pulse' | 'bounce';
  className?: string;
  fullScreen?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  variant = 'default',
  className = '',
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const containerClasses = fullScreen 
    ? 'flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900' 
    : 'flex items-center justify-center';

  if (variant === 'dots') {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className="flex space-x-1">
          <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
          <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
          <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
        </div>
      </div>
    );
  }

  if (variant === 'pulse') {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className={`${sizeClasses[size]} bg-blue-500 rounded-full animate-pulse`}></div>
      </div>
    );
  }

  if (variant === 'bounce') {
    return (
      <div className={`${containerClasses} ${className}`}>
        <div className={`${sizeClasses[size]} bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-bounce`}></div>
      </div>
    );
  }

  return (
    <div className={`${containerClasses} ${className}`}>
      <div className="relative">
        {/* Outer ring */}
        <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-gray-200 dark:border-gray-700`}></div>
        {/* Inner spinning ring */}
        <div className={`${sizeClasses[size]} animate-spin rounded-full border-2 border-transparent border-t-blue-500 absolute top-0 left-0`} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
        {/* Center dot */}
        <div className={`${sizeClasses[size]} bg-blue-500 rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 animate-pulse`} style={{ width: '25%', height: '25%' }}></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;
