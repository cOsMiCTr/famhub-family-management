// Currency helper functions for formatting and display

export const getCurrencySymbol = (code: string): string => {
  const symbols: Record<string, string> = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'TRY': '₺',
    'JPY': '¥',
    'CHF': 'CHF',
    'CAD': 'C$',
    'AUD': 'A$',
    'CNY': '¥',
    'INR': '₹',
    'RUB': '₽',
    'BRL': 'R$',
    'MXN': '$',
    'KRW': '₩',
    'SEK': 'kr',
    'NOK': 'kr',
    'DKK': 'kr',
    'PLN': 'zł',
    'ZAR': 'R'
  };
  return symbols[code] || code;
};

export const formatCurrencyWithSymbol = (code: string, name: string): string => {
  const symbol = getCurrencySymbol(code);
  return `${name} (${symbol})`;
};

export const getCurrencyName = (code: string): string => {
  const names: Record<string, string> = {
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'TRY': 'Turkish Lira',
    'JPY': 'Japanese Yen',
    'CHF': 'Swiss Franc',
    'CAD': 'Canadian Dollar',
    'AUD': 'Australian Dollar',
    'CNY': 'Chinese Yuan',
    'INR': 'Indian Rupee',
    'RUB': 'Russian Ruble',
    'BRL': 'Brazilian Real',
    'MXN': 'Mexican Peso',
    'KRW': 'South Korean Won',
    'SEK': 'Swedish Krona',
    'NOK': 'Norwegian Krone',
    'DKK': 'Danish Krone',
    'PLN': 'Polish Zloty',
    'ZAR': 'South African Rand'
  };
  return names[code] || code;
};

