import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import ExpenseAssetSelector from './ExpenseAssetSelector';
import ExpenseMemberMultiSelect from './ExpenseMemberMultiSelect';
import { apiService } from '../services/api';

interface ExpenseInsuranceFormProps {
  coverageType?: string;
  linkedAssetId?: number;
  linkedMemberIds: number[];
  insuranceCompany?: string;
  insuranceNumber?: string;
  recurringPaymentDate?: string;
  vehicleAssetId?: number;
  onChange: (data: Record<string, any>) => void;
  onLinkedAssetChange?: (assetId: number | null) => void;
  onLinkedMembersChange?: (memberIds: number[]) => void;
  members?: Array<{id: number; first_name: string; last_name: string}>;
  insuranceSuggestions?: Array<{name: string}>;
  error?: string;
}

const ExpenseInsuranceForm: React.FC<ExpenseInsuranceFormProps> = ({
  coverageType = '',
  linkedAssetId,
  linkedMemberIds = [],
  insuranceCompany = '',
  insuranceNumber = '',
  recurringPaymentDate = '',
  vehicleAssetId,
  onChange,
  onLinkedAssetChange,
  onLinkedMembersChange,
  members = [],
  insuranceSuggestions = [],
  error
}) => {
  const { t } = useTranslation();
  const [coverageTypeError, setCoverageTypeError] = useState<string>('');
  const [vehicles, setVehicles] = useState<Array<{id: number; name: string; location?: string}>>([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  // Load vehicles for car insurance
  useEffect(() => {
    if (coverageType === 'car_insurance') {
      loadVehicles();
    }
  }, [coverageType]);

  const loadVehicles = async () => {
    try {
      setLoadingVehicles(true);
      const response = await apiService.get('/expenses/linkable-vehicles');
      setVehicles(response.data || response || []);
    } catch (err) {
      console.error('Error loading vehicles:', err);
    } finally {
      setLoadingVehicles(false);
    }
  };

  const handleCoverageTypeChange = (newType: string) => {
    setCoverageTypeError('');
    const updates: any = { coverage_type: newType };
    
    if (newType === 'property_insurance') {
      if (onLinkedAssetChange && linkedAssetId) {
        // Keep existing asset link
      } else if (newType !== coverageType) {
        // Clear asset link if switching from different type
        if (onLinkedAssetChange) onLinkedAssetChange(null);
      }
    } else if (newType === 'car_insurance') {
      updates.vehicle_asset_id = vehicleAssetId;
    } else if (newType === 'family_insurance') {
      if (onLinkedMembersChange) {
        // Keep existing members or start fresh
      }
    }
    
    onChange(updates);
  };

  const handleAssetChange = (assetId: number | null) => {
    if (coverageType === 'property_insurance' && !assetId) {
      setCoverageTypeError(t('expenses.propertyRequired') || 'Property is required for property insurance');
    } else {
      setCoverageTypeError('');
    }
    if (onLinkedAssetChange) {
      onLinkedAssetChange(assetId);
    }
    onChange({ linked_asset_id: assetId || undefined });
  };

  const handleVehicleChange = (vehicleId: number | null) => {
    onChange({ vehicle_asset_id: vehicleId || undefined });
  };

  const handleMembersChange = (memberIds: number[]) => {
    if (onLinkedMembersChange) {
      onLinkedMembersChange(memberIds);
    }
    onChange({ linked_member_ids: memberIds });
  };

  const handleInputChange = (field: string, value: string) => {
    onChange({ [field]: value || undefined });
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          {t('expenses.insuranceDescription') || 'Select the type of insurance and provide relevant details.'}
        </p>
      </div>

      {/* Coverage Type (Subcategory) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.coverageType') || 'Coverage Type'} <span className="text-red-500">*</span>
        </label>
        <select
          value={coverageType}
          onChange={(e) => handleCoverageTypeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          required
        >
          <option value="">{t('expenses.selectCoverageType') || 'Select coverage type...'}</option>
          <option value="health_insurance">{t('expenses.insuranceTypes.health') || 'Health Insurance'}</option>
          <option value="life_insurance">{t('expenses.insuranceTypes.life') || 'Life Insurance'}</option>
          <option value="property_insurance">{t('expenses.insuranceTypes.property') || 'Property Insurance'}</option>
          <option value="car_insurance">{t('expenses.insuranceTypes.car') || 'Car Insurance'}</option>
          <option value="family_insurance">{t('expenses.insuranceTypes.family') || 'Family Insurance'}</option>
          <option value="general_insurance">{t('expenses.insuranceTypes.general') || 'General Insurance'}</option>
        </select>
        {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </div>

      {/* Insurance Company (with autocomplete suggestions) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.insuranceCompany') || 'Insurance Company'}
        </label>
        <div className="relative">
          <input
            type="text"
            list="insurance-companies"
            value={insuranceCompany}
            onChange={(e) => handleInputChange('insurance_company', e.target.value)}
            placeholder={t('expenses.typeToSearch') || 'Type to search or enter new...'}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          {insuranceSuggestions.length > 0 && (
            <datalist id="insurance-companies">
              {insuranceSuggestions.map((suggestion, idx) => (
                <option key={idx} value={suggestion.name} />
              ))}
            </datalist>
          )}
        </div>
      </div>

      {/* Insurance Number */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.insuranceNumber') || 'Insurance Number / Policy Number'}
        </label>
        <input
          type="text"
          value={insuranceNumber}
          onChange={(e) => handleInputChange('insurance_number', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
      </div>

      {/* Recurring Payment Date */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {t('expenses.recurringPaymentDate') || 'Recurring Payment Date'}
        </label>
        <input
          type="date"
          value={recurringPaymentDate}
          onChange={(e) => handleInputChange('recurring_payment_date', e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        />
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {t('expenses.paymentDateHint') || 'The day of the month when payment is due'}
        </p>
      </div>

      {/* Conditional: Property Insurance - Real Estate Selector */}
      {coverageType === 'property_insurance' && (
        <div>
          <ExpenseAssetSelector
            value={linkedAssetId}
            onChange={handleAssetChange}
            required={true}
            error={coverageTypeError}
          />
        </div>
      )}

      {/* Conditional: Car Insurance - Vehicle Selector */}
      {coverageType === 'car_insurance' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('expenses.selectVehicle') || 'Select Vehicle'} <span className="text-red-500">*</span>
          </label>
          {loadingVehicles ? (
            <div className="text-sm text-gray-500">{t('common.loading') || 'Loading...'}</div>
          ) : vehicles.length === 0 ? (
            <div className="text-sm text-gray-500">{t('expenses.noVehiclesAvailable') || 'No vehicles available'}</div>
          ) : (
            <select
              value={vehicleAssetId || ''}
              onChange={(e) => handleVehicleChange(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="">{t('expenses.selectVehicle') || 'Select a vehicle...'}</option>
              {vehicles.map((vehicle) => (
                <option key={vehicle.id} value={vehicle.id}>
                  {vehicle.name} {vehicle.location ? `(${vehicle.location})` : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Conditional: Family Insurance - Member Multi-Select */}
      {coverageType === 'family_insurance' && (
        <ExpenseMemberMultiSelect
          value={linkedMemberIds}
          onChange={handleMembersChange}
          required={false}
        />
      )}
    </div>
  );
};

export default ExpenseInsuranceForm;

