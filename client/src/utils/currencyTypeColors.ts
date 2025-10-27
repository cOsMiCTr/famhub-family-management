// Consistent color mapping for currency types across the app
export const getCurrencyTypeColor = (type: string): { bg: string; text: string } => {
  const colors: { [key: string]: { bg: string; text: string } } = {
    fiat: {
      bg: 'bg-blue-100 dark:bg-blue-900',
      text: 'text-blue-800 dark:text-blue-300'
    },
    cryptocurrency: {
      bg: 'bg-orange-100 dark:bg-orange-900',
      text: 'text-orange-800 dark:text-orange-300'
    },
    precious_metal: {
      bg: 'bg-yellow-100 dark:bg-yellow-900',
      text: 'text-yellow-800 dark:text-yellow-300'
    }
  };
  
  return colors[type] || {
    bg: 'bg-gray-100 dark:bg-gray-700',
    text: 'text-gray-800 dark:text-gray-300'
  };
};

export const getCurrencyTypeLabel = (type: string): string => {
  const labels: { [key: string]: string } = {
    fiat: 'Fiat',
    cryptocurrency: 'Crypto',
    precious_metal: 'Metal'
  };
  
  return labels[type] || type;
};

