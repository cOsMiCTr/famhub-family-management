// Utility functions for consistent formatting across the app

/**
 * Format date in DD.MM.YYYY format
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

/**
 * Format currency in "400,00 €" format with symbols
 */
export const formatCurrency = (amount: number, currency: string): string => {
  const formattedAmount = new Intl.NumberFormat('de-DE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
  
  const currencySymbols: { [key: string]: string } = {
    'TRY': '₺',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'GOLD': 'Au',
    'BTC': '₿',
    'ETH': 'Ξ',
    'BNB': 'BNB',
    'XRP': 'XRP',
    'ADA': 'ADA',
    'SOL': 'SOL',
    'DOT': 'DOT',
    'DOGE': 'DOGE',
    'LTC': 'Ł',
    'USDT': 'USDT',
    'SILVER': 'Ag',
    'PLATINUM': 'Pt',
    'PALLADIUM': 'Pd'
  };
  
  return `${formattedAmount} ${currencySymbols[currency] || currency}`;
};

/**
 * Parse date from DD.MM.YYYY format to ISO string
 */
export const parseDate = (dateString: string): string => {
  const [day, month, year] = dateString.split('.');
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day)).toISOString().split('T')[0];
};

/**
 * Format date for input fields (YYYY-MM-DD)
 */
export const formatDateForInput = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};
