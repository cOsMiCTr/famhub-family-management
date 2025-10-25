import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, PlusIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { formatCurrency, formatDate } from '../utils/assetUtils';

interface ValuationEntry {
  id: number;
  valuation_date: string;
  value: number;
  currency: string;
  valuation_method: string;
  notes?: string;
  created_by_email?: string;
}

interface ValuationHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  assetId: number;
  assetName: string;
  onAddValuation: (valuationData: any) => Promise<void>;
}

const ValuationHistoryModal: React.FC<ValuationHistoryModalProps> = ({
  isOpen,
  onClose,
  assetId,
  assetName,
  onAddValuation
}) => {
  const { t } = useTranslation();
  const [history, setHistory] = useState<ValuationEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addFormData, setAddFormData] = useState({
    value: '',
    currency: 'USD',
    valuation_date: new Date().toISOString().split('T')[0],
    valuation_method: 'manual',
    notes: ''
  });
  const [addFormErrors, setAddFormErrors] = useState<string[]>([]);

  // Fetch valuation history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/assets/${assetId}/history`);
      if (!response.ok) throw new Error('Failed to fetch valuation history');
      
      const data = await response.json();
      setHistory(data.history);
    } catch (error) {
      console.error('Failed to fetch valuation history:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, assetId]);

  const handleAddValuation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const errors: string[] = [];
    if (!addFormData.value || parseFloat(addFormData.value) <= 0) {
      errors.push('Valid value is required');
    }
    if (!addFormData.valuation_date) {
      errors.push('Valuation date is required');
    }
    
    if (errors.length > 0) {
      setAddFormErrors(errors);
      return;
    }

    try {
      await onAddValuation({
        ...addFormData,
        value: parseFloat(addFormData.value)
      });
      
      // Reset form and close
      setAddFormData({
        value: '',
        currency: 'USD',
        valuation_date: new Date().toISOString().split('T')[0],
        valuation_method: 'manual',
        notes: ''
      });
      setAddFormErrors([]);
      setShowAddForm(false);
      
      // Refresh history
      await fetchHistory();
    } catch (error) {
      setAddFormErrors([error instanceof Error ? error.message : 'Failed to add valuation']);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setAddFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (addFormErrors.length > 0) {
      setAddFormErrors([]);
    }
  };

  // Calculate value change percentage
  const calculateChangePercentage = (current: number, previous: number): number => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                {t('assets.valuationHistory')} - {assetName}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Add Valuation Button */}
            <div className="mb-4">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                {t('assets.addValuation')}
              </button>
            </div>

            {/* Add Valuation Form */}
            {showAddForm && (
              <div className="mb-6 p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Add New Valuation</h4>
                
                {addFormErrors.length > 0 && (
                  <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
                    <div className="text-sm text-red-700 dark:text-red-300">
                      <ul className="list-disc list-inside space-y-1">
                        {addFormErrors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <form onSubmit={handleAddValuation} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Value *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      name="value"
                      value={addFormData.value}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={addFormData.currency}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="TRY">TRY</option>
                      <option value="GOLD">GOLD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valuation Date *
                    </label>
                    <input
                      type="date"
                      name="valuation_date"
                      value={addFormData.valuation_date}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Valuation Method
                    </label>
                    <select
                      name="valuation_method"
                      value={addFormData.valuation_method}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="manual">Manual</option>
                      <option value="market">Market Value</option>
                      <option value="appraisal">Appraisal</option>
                      <option value="estimate">Estimate</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      value={addFormData.notes}
                      onChange={handleInputChange}
                      rows={2}
                      className="mt-1 block w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="md:col-span-2 flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Add Valuation
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Valuation History Table */}
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : history.length === 0 ? (
              <div className="text-center py-8">
                <ChartBarIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No valuation history</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Add your first valuation to start tracking value changes.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Value
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Change
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Notes
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {history.map((entry, index) => {
                      const previousEntry = index < history.length - 1 ? history[index + 1] : null;
                      const changePercentage = previousEntry 
                        ? calculateChangePercentage(entry.value, previousEntry.value)
                        : 0;

                      return (
                        <tr key={entry.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                            {formatDate(entry.valuation_date)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                            {formatCurrency(entry.value, entry.currency)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">
                            {previousEntry && (
                              <span className={`${
                                changePercentage > 0 
                                  ? 'text-green-600 dark:text-green-400' 
                                  : changePercentage < 0 
                                  ? 'text-red-600 dark:text-red-400'
                                  : 'text-gray-600 dark:text-gray-400'
                              }`}>
                                {changePercentage > 0 ? '+' : ''}{changePercentage.toFixed(1)}%
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {entry.valuation_method}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                            {entry.notes || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValuationHistoryModal;
