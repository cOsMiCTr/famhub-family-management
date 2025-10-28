import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';

interface ExchangeRateConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedCurrencies: string[]) => void;
  availableCurrencies: string[];
  currentSelection: string[];
}

const ExchangeRateConfigModal: React.FC<ExchangeRateConfigModalProps> = ({
  isOpen,
  onClose,
  onSave,
  availableCurrencies,
  currentSelection
}) => {
  const { t } = useTranslation();
  const [selectedCurrencies, setSelectedCurrencies] = useState<string[]>(currentSelection);

  useEffect(() => {
    if (isOpen) {
      // Filter currentSelection to only include available currencies
      const filteredSelection = currentSelection.filter(c => availableCurrencies.includes(c));
      console.log('🔍 Modal opened with selection:', {
        original: currentSelection,
        filtered: filteredSelection,
        available: availableCurrencies
      });
      setSelectedCurrencies(filteredSelection);
    }
  }, [isOpen, currentSelection, availableCurrencies]);

  const handleCurrencyToggle = (currency: string) => {
    setSelectedCurrencies(prev => {
      if (prev.includes(currency)) {
        return prev.filter(c => c !== currency);
      } else if (prev.length < 6) {
        return [...prev, currency];
      }
      return prev;
    });
  };

  const handleSave = () => {
    onSave(selectedCurrencies);
    onClose();
  };

  const currencyNames: { [key: string]: string } = {
    // Fiat
    'USD': 'US Dollar',
    'EUR': 'Euro',
    'GBP': 'British Pound',
    'TRY': 'Turkish Lira',
    'CNY': 'Chinese Yuan',
    'JPY': 'Japanese Yen',
    'CAD': 'Canadian Dollar',
    'AUD': 'Australian Dollar',
    'CHF': 'Swiss Franc',
    // Metals
    'GOLD': 'Gold',
    'SILVER': 'Silver',
    'PLATINUM': 'Platinum',
    'PALLADIUM': 'Palladium',
    // Cryptocurrencies
    'BTC': 'Bitcoin',
    'ETH': 'Ethereum',
    'BNB': 'Binance Coin',
    'ADA': 'Cardano',
    'SOL': 'Solana',
    'DOT': 'Polkadot',
    'MATIC': 'Polygon',
    'AVAX': 'Avalanche',
    'LINK': 'Chainlink',
    'UNI': 'Uniswap'
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('dashboard.configureRates')}
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            {t('dashboard.selectCurrencies')} (max 6)
          </p>

          <div className="space-y-3 max-h-64 overflow-y-auto">
            {availableCurrencies.sort().map(currency => (
              <label
                key={currency}
                className="flex items-center space-x-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedCurrencies.includes(currency)}
                  onChange={() => handleCurrencyToggle(currency)}
                  disabled={!selectedCurrencies.includes(currency) && selectedCurrencies.length >= 6}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded disabled:opacity-50"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {currency} - {currencyNames[currency] || currency}
                </span>
                {selectedCurrencies.includes(currency) && (
                  <CheckIcon className="h-4 w-4 text-green-500" />
                )}
              </label>
            ))}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSave}
              disabled={selectedCurrencies.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExchangeRateConfigModal;
