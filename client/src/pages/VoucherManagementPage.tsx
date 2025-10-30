import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import apiService from '../services/api';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  TicketIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

interface VoucherCode {
  id: number;
  code: string;
  description: string | null;
  discount_percentage: number;
  discount_amount: number;
  minimum_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

interface VoucherStats {
  totalUses: number;
  totalDiscountGiven: number;
  totalRevenue: number;
  recentUsages: any[];
}

const VoucherManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const [vouchers, setVouchers] = useState<VoucherCode[]>([]);
  const [filteredVouchers, setFilteredVouchers] = useState<VoucherCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherCode | null>(null);
  const [voucherStats, setVoucherStats] = useState<VoucherStats | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    discount_percentage: 0,
    discount_amount: 0,
    minimum_purchase: '',
    max_uses: '',
    valid_from: new Date().toISOString().split('T')[0],
    valid_until: '',
    is_active: true
  });

  useEffect(() => {
    loadVouchers();
  }, []);

  useEffect(() => {
    filterVouchers();
  }, [vouchers, searchTerm, filterActive]);

  const loadVouchers = async () => {
    try {
      setIsLoading(true);
      setError('');
      const filters: any = {};
      if (filterActive !== null) {
        filters.isActive = filterActive;
      }
      if (searchTerm) {
        filters.search = searchTerm;
      }
      
      const queryParams = new URLSearchParams();
      if (filterActive !== null) {
        queryParams.append('isActive', filterActive.toString());
      }
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      const response = await apiService.get(`/admin/vouchers?${queryParams.toString()}`);
      setVouchers(response.data || []);
    } catch (err: any) {
      console.error('Error loading vouchers:', err);
      setError(err.response?.data?.error || 'Failed to load voucher codes');
    } finally {
      setIsLoading(false);
    }
  };

  const filterVouchers = () => {
    let filtered = [...vouchers];

    if (searchTerm) {
      filtered = filtered.filter(v =>
        v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (v.description && v.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (filterActive !== null) {
      filtered = filtered.filter(v => v.is_active === filterActive);
    }

    setFilteredVouchers(filtered);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setError('');
      
      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        description: formData.description.trim() || null,
        discount_percentage: formData.discount_percentage || 0,
        discount_amount: formData.discount_amount || 0,
        minimum_purchase: formData.minimum_purchase ? parseFloat(formData.minimum_purchase) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null
      };

      await apiService.post('/admin/vouchers', payload);
      setMessage('Voucher code created successfully');
      setShowCreateModal(false);
      resetForm();
      await loadVouchers();
    } catch (err: any) {
      console.error('Error creating voucher:', err);
      setError(err.response?.data?.error || 'Failed to create voucher code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVoucher) return;

    try {
      setIsLoading(true);
      setError('');
      
      const payload: any = {
        description: formData.description.trim() || null,
        discount_percentage: formData.discount_percentage || 0,
        discount_amount: formData.discount_amount || 0,
        minimum_purchase: formData.minimum_purchase ? parseFloat(formData.minimum_purchase) : null,
        max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
        valid_from: new Date(formData.valid_from).toISOString(),
        valid_until: formData.valid_until ? new Date(formData.valid_until).toISOString() : null,
        is_active: formData.is_active
      };

      await apiService.put(`/admin/vouchers/${selectedVoucher.id}`, payload);
      setMessage('Voucher code updated successfully');
      setShowEditModal(false);
      setSelectedVoucher(null);
      resetForm();
      await loadVouchers();
    } catch (err: any) {
      console.error('Error updating voucher:', err);
      setError(err.response?.data?.error || 'Failed to update voucher code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to deactivate this voucher code?')) {
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await apiService.delete(`/admin/vouchers/${id}`);
      setMessage(response.data?.message || 'Voucher code deactivated successfully');
      await loadVouchers();
    } catch (err: any) {
      console.error('Error deleting voucher:', err);
      setError(err.response?.data?.error || 'Failed to deactivate voucher code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewStats = async (voucher: VoucherCode) => {
    try {
      setIsLoading(true);
      const response = await apiService.get(`/admin/vouchers/${voucher.id}/stats`);
      setVoucherStats(response.data);
      setSelectedVoucher(voucher);
      setShowStatsModal(true);
    } catch (err: any) {
      console.error('Error loading stats:', err);
      setError(err.response?.data?.error || 'Failed to load statistics');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      code: '',
      description: '',
      discount_percentage: 0,
      discount_amount: 0,
      minimum_purchase: '',
      max_uses: '',
      valid_from: new Date().toISOString().split('T')[0],
      valid_until: '',
      is_active: true
    });
  };

  const openEditModal = (voucher: VoucherCode) => {
    setSelectedVoucher(voucher);
    setFormData({
      code: voucher.code,
      description: voucher.description || '',
      discount_percentage: voucher.discount_percentage,
      discount_amount: parseFloat(voucher.discount_amount.toString()),
      minimum_purchase: voucher.minimum_purchase ? voucher.minimum_purchase.toString() : '',
      max_uses: voucher.max_uses ? voucher.max_uses.toString() : '',
      valid_from: new Date(voucher.valid_from).toISOString().split('T')[0],
      valid_until: voucher.valid_until ? new Date(voucher.valid_until).toISOString().split('T')[0] : '',
      is_active: voucher.is_active
    });
    setShowEditModal(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No expiration';
    return new Date(dateString).toLocaleDateString();
  };

  const isVoucherValid = (voucher: VoucherCode) => {
    const now = new Date();
    const validFrom = new Date(voucher.valid_from);
    const validUntil = voucher.valid_until ? new Date(voucher.valid_until) : null;
    
    if (!voucher.is_active) return false;
    if (validFrom > now) return false;
    if (validUntil && validUntil < now) return false;
    if (voucher.max_uses && voucher.used_count >= voucher.max_uses) return false;
    
    return true;
  };

  if (isLoading && vouchers.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Voucher Management</h1>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            Create and manage voucher codes for token purchases
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium flex items-center"
        >
          <PlusIcon className="h-5 w-5 mr-2" />
          Create Voucher
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}
      {message && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-sm text-green-700 dark:text-green-300">{message}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by code or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setFilterActive(null)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filterActive === null
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilterActive(true)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filterActive === true
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Active
              </button>
              <button
                onClick={() => setFilterActive(false)}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  filterActive === false
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Vouchers Table */}
      <div className="card">
        <div className="card-body">
          {filteredVouchers.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
              No voucher codes found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Description
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Discount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Usage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Valid Until
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredVouchers.map((voucher) => (
                    <tr key={voucher.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <TicketIcon className="h-5 w-5 text-purple-500 mr-2" />
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {voucher.code}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {voucher.description || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900 dark:text-white">
                          {voucher.discount_percentage > 0
                            ? `${voucher.discount_percentage}%`
                            : voucher.discount_amount > 0
                            ? `$${parseFloat(voucher.discount_amount.toString()).toFixed(2)}`
                            : 'No discount'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {voucher.used_count}{voucher.max_uses ? ` / ${voucher.max_uses}` : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatDate(voucher.valid_until)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isVoucherValid(voucher) ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                            Valid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                            <XCircleIcon className="h-4 w-4 mr-1" />
                            Invalid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleViewStats(voucher)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View Statistics"
                          >
                            <ChartBarIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => openEditModal(voucher)}
                            className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                            title="Edit"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(voucher.id)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="Deactivate"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowCreateModal(false)}></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleCreate}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <TicketIcon className="h-6 w-6 text-purple-500 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Create Voucher Code</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Code *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="WELCOME2024"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        placeholder="Welcome discount for new users"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Discount Percentage (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.discount_percentage}
                          onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Discount Amount ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.discount_amount}
                          onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Minimum Purchase ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.minimum_purchase}
                          onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"


                          placeholder="Optional"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Uses
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.max_uses}
                          onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="Unlimited if empty"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valid From *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.valid_from}
                          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valid Until
                        </label>
                        <input
                          type="date"
                          value={formData.valid_until}
                          onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                          placeholder="No expiration if empty"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Create'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      resetForm();
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedVoucher && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowEditModal(false)}></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleEdit}>
                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                  <div className="flex items-center mb-4">
                    <TicketIcon className="h-6 w-6 text-purple-500 mr-2" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Voucher Code: {selectedVoucher.code}</h3>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Description
                      </label>
                      <input
                        type="text"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Discount Percentage (%)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={formData.discount_percentage}
                          onChange={(e) => setFormData({ ...formData, discount_percentage: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Discount Amount ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.discount_amount}
                          onChange={(e) => setFormData({ ...formData, discount_amount: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Minimum Purchase ($)
                        </label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.minimum_purchase}
                          onChange={(e) => setFormData({ ...formData, minimum_purchase: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Uses
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={formData.max_uses}
                          onChange={(e) => setFormData({ ...formData, max_uses: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valid From *
                        </label>
                        <input
                          type="date"
                          required
                          value={formData.valid_from}
                          onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Valid Until
                        </label>
                        <input
                          type="date"
                          value={formData.valid_until}
                          onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.is_active}
                          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                          className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                        />
                        <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {isLoading ? <LoadingSpinner size="sm" /> : 'Update'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedVoucher(null);
                      resetForm();
                    }}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 sm:mt-0 sm:w-auto sm:text-sm"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stats Modal */}
      {showStatsModal && selectedVoucher && voucherStats && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowStatsModal(false)}></div>
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center mb-4">
                  <ChartBarIcon className="h-6 w-6 text-blue-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Statistics: {selectedVoucher.code}</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-blue-600 dark:text-blue-400">Total Uses</p>
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{voucherStats.totalUses}</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                    <p className="text-sm text-green-600 dark:text-green-400">Discount Given</p>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">${voucherStats.totalDiscountGiven.toFixed(2)}</p>
                  </div>
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                    <p className="text-sm text-purple-600 dark:text-purple-400">Total Revenue</p>
                    <p className="text-2xl font-bold text-purple-900 dark:text-purple-100">${voucherStats.totalRevenue.toFixed(2)}</p>
                  </div>
                </div>
                {voucherStats.recentUsages && voucherStats.recentUsages.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Recent Usages</h4>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {voucherStats.recentUsages.map((usage: any) => (
                        <div key={usage.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{usage.user_email || 'Unknown User'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(usage.used_at).toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {usage.tokens_purchased} tokens
                            </p>
                            <p className="text-xs text-green-600 dark:text-green-400">
                              Saved ${parseFloat(usage.discount_applied).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowStatsModal(false);
                    setSelectedVoucher(null);
                    setVoucherStats(null);
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 sm:w-auto sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VoucherManagementPage;

