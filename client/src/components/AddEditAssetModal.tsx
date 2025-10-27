import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import { useCurrencyContext } from '../contexts/CurrencyContext';
import { XMarkIcon, PhotoIcon } from '@heroicons/react/24/outline';
import { 
  HomeIcon, 
  ChartBarIcon, 
  ChartPieIcon, 
  DocumentTextIcon, 
  CurrencyDollarIcon, 
  SparklesIcon, 
  TruckIcon, 
  PaintBrushIcon, 
  BanknotesIcon, 
  CubeTransparentIcon,
  BuildingOfficeIcon,
  BuildingOffice2Icon,
  BriefcaseIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  CameraIcon,
  MusicalNoteIcon,
  BookOpenIcon,
  AcademicCapIcon,
  HeartIcon,
  GiftIcon,
  StarIcon,
  FireIcon,
  BoltIcon,
  SunIcon,
  MoonIcon,
  GlobeAltIcon,
  MapIcon,
  ClockIcon,
  CalendarIcon,
  UserIcon,
  UsersIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  KeyIcon,
  CogIcon,
  WrenchScrewdriverIcon,
  ScissorsIcon,
  PencilIcon,
  ClipboardDocumentIcon,
  FolderIcon,
  ArchiveBoxIcon,
  ShoppingBagIcon,
  ShoppingCartIcon,
  CreditCardIcon,
  ReceiptPercentIcon,
  CalculatorIcon,
  PlusIcon,
  MinusIcon,
  CheckIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  QuestionMarkCircleIcon,
  LightBulbIcon,
  PuzzlePieceIcon,
  RocketLaunchIcon,
  BeakerIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  EyeSlashIcon,
  HandRaisedIcon,
  HandThumbUpIcon,
  HandThumbDownIcon,
  FaceSmileIcon,
  FaceFrownIcon,
  CakeIcon,
  CloudIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  ArrowRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import type { Asset, AssetCategory, HouseholdMember } from '../utils/assetUtils';
import { validateAssetForm } from '../utils/assetUtils';
import SearchableAssetCategorySelector from './SearchableAssetCategorySelector';

interface AddEditAssetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assetData: any) => Promise<void>;
  asset?: Asset | null;
  categories: AssetCategory[];
  members: HouseholdMember[];
}

const AddEditAssetModal: React.FC<AddEditAssetModalProps> = ({
  isOpen,
  onClose,
  onSave,
  asset,
  categories,
  members
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Step management
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5; // Increased to 5 to allow step 4 to be optional details and step 5 to be confirmation/submit
  
  const [formData, setFormData] = useState({
    name: '',
    amount: '',
    currency: user?.main_currency || 'USD',
    category_id: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    household_member_id: '',
    purchase_date: '',
    purchase_price: '',
    purchase_currency: user?.main_currency || 'USD',
    current_value: '',
    valuation_method: 'manual',
    ownership_type: 'single',
    ownership_percentage: '100',
    status: 'active',
    location: '',
    notes: ''
  });
  
  // For shared ownership - track percentages for each member
  const [sharedOwnershipPercentages, setSharedOwnershipPercentages] = useState<{[key: number]: number}>({});
  
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Get selected category details
  const selectedCategory = categories.find(cat => cat.id === parseInt(formData.category_id));
  
  // Get all currencies from context
  const { allCurrencies } = useCurrencyContext();
  
  // Filter currencies based on category's allowed_currency_types and active status
  const currencyOptions = useMemo(() => {
    if (!selectedCategory?.allowed_currency_types || !allCurrencies.length) {
      return allCurrencies
        .filter(c => c.is_active)
        .map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }));
    }
    
    // Filter currencies by allowed types and active status
    return allCurrencies
      .filter(c => c.is_active && selectedCategory.allowed_currency_types.includes(c.currency_type))
      .map(c => ({ value: c.code, label: `${c.name} (${c.symbol})` }));
  }, [selectedCategory, allCurrencies]);

  // Icon mapping for categories
  const getCategoryIcon = (iconName: string) => {
    const iconMap: {[key: string]: React.ComponentType<any>} = {
      'HomeIcon': HomeIcon,
      'ChartBarIcon': ChartBarIcon,
      'ChartPieIcon': ChartPieIcon,
      'DocumentTextIcon': DocumentTextIcon,
      'CurrencyDollarIcon': CurrencyDollarIcon,
      'SparklesIcon': SparklesIcon,
      'TruckIcon': TruckIcon,
      'PaintBrushIcon': PaintBrushIcon,
      'BanknotesIcon': BanknotesIcon,
      'CubeTransparentIcon': CubeTransparentIcon,
      'BuildingOfficeIcon': BuildingOfficeIcon,
      'BuildingOffice2Icon': BuildingOffice2Icon,
      'BriefcaseIcon': BriefcaseIcon,
      'ComputerDesktopIcon': ComputerDesktopIcon,
      'DevicePhoneMobileIcon': DevicePhoneMobileIcon,
      'CameraIcon': CameraIcon,
      'MusicalNoteIcon': MusicalNoteIcon,
      'BookOpenIcon': BookOpenIcon,
      'AcademicCapIcon': AcademicCapIcon,
      'HeartIcon': HeartIcon,
      'GiftIcon': GiftIcon,
      'StarIcon': StarIcon,
      'FireIcon': FireIcon,
      'BoltIcon': BoltIcon,
      'SunIcon': SunIcon,
      'MoonIcon': MoonIcon,
      'GlobeAltIcon': GlobeAltIcon,
      'MapIcon': MapIcon,
      'ClockIcon': ClockIcon,
      'CalendarIcon': CalendarIcon,
      'UserIcon': UserIcon,
      'UsersIcon': UsersIcon,
      'ShieldCheckIcon': ShieldCheckIcon,
      'LockClosedIcon': LockClosedIcon,
      'KeyIcon': KeyIcon,
      'CogIcon': CogIcon,
      'WrenchScrewdriverIcon': WrenchScrewdriverIcon,
      'ScissorsIcon': ScissorsIcon,
      'PencilIcon': PencilIcon,
      'ClipboardDocumentIcon': ClipboardDocumentIcon,
      'FolderIcon': FolderIcon,
      'ArchiveBoxIcon': ArchiveBoxIcon,
      'ShoppingBagIcon': ShoppingBagIcon,
      'ShoppingCartIcon': ShoppingCartIcon,
      'CreditCardIcon': CreditCardIcon,
      'ReceiptPercentIcon': ReceiptPercentIcon,
      'CalculatorIcon': CalculatorIcon,
      'PlusIcon': PlusIcon,
      'MinusIcon': MinusIcon,
      'CheckIcon': CheckIcon,
      'XCircleIcon': XCircleIcon,
      'ExclamationTriangleIcon': ExclamationTriangleIcon,
      'InformationCircleIcon': InformationCircleIcon,
      'QuestionMarkCircleIcon': QuestionMarkCircleIcon,
      'LightBulbIcon': LightBulbIcon,
      'PuzzlePieceIcon': PuzzlePieceIcon,
      'RocketLaunchIcon': RocketLaunchIcon,
      'BeakerIcon': BeakerIcon,
      'MagnifyingGlassIcon': MagnifyingGlassIcon,
      'EyeIcon': EyeIcon,
      'EyeSlashIcon': EyeSlashIcon,
      'HandRaisedIcon': HandRaisedIcon,
      'HandThumbUpIcon': HandThumbUpIcon,
      'HandThumbDownIcon': HandThumbDownIcon,
      'FaceSmileIcon': FaceSmileIcon,
      'FaceFrownIcon': FaceFrownIcon,
      'CakeIcon': CakeIcon,
      'CloudIcon': CloudIcon,
      'ArrowTrendingUpIcon': ArrowTrendingUpIcon,
      'ArrowTrendingDownIcon': ArrowTrendingDownIcon,
      'ArrowUpIcon': ArrowUpIcon,
      'ArrowDownIcon': ArrowDownIcon,
      'ArrowRightIcon': ArrowRightIcon,
      'ArrowLeftIcon': ArrowLeftIcon,
    };
    return iconMap[iconName] || CubeTransparentIcon;
  };

  // Reset form when modal opens/closes or asset changes
  useEffect(() => {
    if (isOpen) {
      if (asset) {
        setFormData({
          name: asset.name || '',
          amount: asset.amount?.toString() || '',
          currency: asset.currency || 'USD',
          category_id: asset.category_id?.toString() || '',
          description: asset.description || '',
          date: asset.date || new Date().toISOString().split('T')[0],
          household_member_id: asset.household_member_id?.toString() || '',
          purchase_date: asset.purchase_date || '',
          purchase_price: asset.purchase_price?.toString() || '',
          purchase_currency: asset.purchase_currency || 'USD',
          current_value: asset.current_value?.toString() || '',
          valuation_method: asset.valuation_method || 'manual',
          ownership_type: asset.ownership_type || 'single',
          ownership_percentage: asset.ownership_percentage?.toString() || '100',
          status: asset.status || 'active',
          location: asset.location || '',
          notes: asset.notes || ''
        });
      } else {
        setFormData({
          name: '',
          amount: '',
          currency: user?.main_currency || 'USD',
          category_id: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          household_member_id: '',
          purchase_date: '',
          purchase_price: '',
          purchase_currency: user?.main_currency || 'USD',
          current_value: '',
          valuation_method: 'manual',
          ownership_type: 'single',
          ownership_percentage: '100',
          status: 'active',
          location: '',
          notes: ''
        });
      }
      setErrors([]);
      
      // Load shared ownership percentages if asset has them
      if (asset && asset.shared_ownership && Array.isArray(asset.shared_ownership)) {
        const percentages: { [key: number]: number } = {};
        asset.shared_ownership.forEach(entry => {
          if (entry.household_member_id) {
            percentages[entry.household_member_id] = entry.ownership_percentage;
          }
        });
        setSharedOwnershipPercentages(percentages);
      } else {
        setSharedOwnershipPercentages({});
      }
      
      setCurrentStep(1);
    }
  }, [isOpen, asset]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const nextStep = () => {
    // Validate current step before proceeding
    const validation = validateAssetForm(formData, currentStep);
    
    if (canProceedToNext() && currentStep < totalSteps) {
      // If validation fails, set errors
      if (!validation.isValid) {
        setErrors(validation.errors);
      } else {
        // Clear errors and move to next step
        setErrors([]);
        setCurrentStep(currentStep + 1);
      }
    } else if (!canProceedToNext()) {
      // If can't proceed, validate and set errors
      if (!validation.isValid) {
        setErrors(validation.errors);
      }
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 1: // What is it?
        return formData.name && formData.category_id;
      case 2: // Who owns it?
        return formData.ownership_type === 'single' ? formData.household_member_id : 
               formData.ownership_type === 'shared' ? Object.keys(sharedOwnershipPercentages).length > 0 :
               true; // household shared
      case 3: // What's it worth?
        return formData.amount && formData.currency;
      case 4: // Optional details
        return true;
      case 5: // Confirmation - always allow to submit
        return true;
      default:
        return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const validation = validateAssetForm(formData, currentStep);
    if (!validation.isValid) {
      setErrors(validation.errors);
      return;
    }

    setLoading(true);
    try {
      // Convert string values to appropriate types
      const submitData = {
        ...formData,
        amount: parseFloat(formData.amount),
        category_id: parseInt(formData.category_id),
        household_member_id: formData.household_member_id ? parseInt(formData.household_member_id) : null,
        purchase_price: formData.purchase_price ? parseFloat(formData.purchase_price) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
        ownership_percentage: formData.ownership_type === 'shared' 
          ? Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0)
          : formData.ownership_percentage ? parseFloat(formData.ownership_percentage) : null,
        purchase_date: formData.purchase_date || null,
        description: formData.description || null,
        location: formData.location || null,
        notes: formData.notes || null,
        // Add shared ownership data if applicable
        ...(formData.ownership_type === 'shared' && {
          shared_ownership_percentages: sharedOwnershipPercentages
        })
      };

      await onSave(submitData);
      onClose();
    } catch (error) {
      setErrors([error instanceof Error ? error.message : t('assets.failedToSave')]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose}>
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">&#8203;</span>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    {asset ? t('assets.editAsset') : t('assets.addAsset')}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Step {currentStep} of {totalSteps}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mb-6">
                <div className="flex items-center">
                  {Array.from({ length: totalSteps }, (_, i) => (
                    <div key={i} className="flex items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        i + 1 <= currentStep 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                      }`}>
                        {i + 1}
                      </div>
                      {i < totalSteps - 1 && (
                        <div className={`w-12 h-1 mx-2 ${
                          i + 1 < currentStep ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
                        }`} />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {errors.length > 0 && (
                <div className="mb-4 bg-red-50 dark:bg-red-900 border border-red-200 dark:border-red-700 rounded-md p-4">
                  <div className="text-sm text-red-700 dark:text-red-300">
                    <ul className="list-disc list-inside space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Step Content */}
              <div className="min-h-[400px]">
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        What is it?
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Tell us about the asset you want to add.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Asset Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="e.g., My Car, Investment Portfolio, House"
                        className={`w-full border rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-lg ${
                          errors.includes('Asset name is required') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.includes('Asset name is required') && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{t('common.nameRequired')}</p>
                      )}
                    </div>

                    <SearchableAssetCategorySelector
                      categories={categories as any}
                      selectedCategoryId={formData.category_id}
                      onCategoryChange={(categoryId) => setFormData(prev => ({ ...prev, category_id: categoryId }))}
                      error={errors.includes('Category is required') ? t('common.categoryRequired') : undefined}
                      placeholder="Select a category"
                      getCategoryIcon={getCategoryIcon}
                    />
                  </div>
                )}

                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Who owns it?
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Choose the ownership type and assign owners.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Ownership Type
                      </label>
                      <div className="space-y-3">
                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="radio"
                            name="ownership_type"
                            value="single"
                            checked={formData.ownership_type === 'single'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Single Owner</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">One person owns this asset</div>
                          </div>
                        </label>

                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="radio"
                            name="ownership_type"
                            value="shared"
                            checked={formData.ownership_type === 'shared'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Shared Ownership</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">Multiple people own this asset</div>
                          </div>
                        </label>

                        <label className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700">
                          <input
                            type="radio"
                            name="ownership_type"
                            value="household"
                            checked={formData.ownership_type === 'household'}
                            onChange={handleInputChange}
                            className="mr-3"
                          />
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">Household Shared</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">All household members share equally</div>
                          </div>
                        </label>
                      </div>
                    </div>

                    {/* Single Owner Selection */}
                    {formData.ownership_type === 'single' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Owner
                        </label>
                        <select
                          name="household_member_id"
                          value={formData.household_member_id}
                          onChange={handleInputChange}
                          className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-3 px-4 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">Select owner</option>
                          {members && members.map && members.map(member => (
                            <option key={member.id} value={member.id}>
                              {member.name} ({member.relationship})
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Shared Ownership Distribution */}
                    {formData.ownership_type === 'shared' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                          Ownership Distribution
                        </label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-3 max-h-96 overflow-y-auto">
                          <div className="space-y-2">
                            {members && members.map && members.map(member => (
                              <div key={member.id}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex-1">
                                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                                      {member.name}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400">
                                      {member.relationship}
                                    </div>
                                  </div>
                                  <div className="w-20 text-right">
                                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                                      {sharedOwnershipPercentages[member.id] || 0}%
                                    </span>
                                  </div>
                                </div>
                                {/* Slider */}
                                <input
                                  type="range"
                                  min="0"
                                  max="100"
                                  step="1"
                                  value={sharedOwnershipPercentages[member.id] || 0}
                                  onChange={(e) => {
                                    const newValue = Math.round(parseFloat(e.target.value) || 0);
                                    const currentTotal = Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0);
                                    const currentValue = sharedOwnershipPercentages[member.id] || 0;
                                    
                                    // Calculate the difference
                                    const difference = newValue - currentValue;
                                    
                                    // Calculate sum of OTHER members (excluding current member)
                                    const otherMembersSum = currentTotal - currentValue;
                                    
                                    // If there's no other members or we're increasing to 100%, just set this value
                                    if (otherMembersSum <= 0 || newValue >= 100) {
                                      setSharedOwnershipPercentages(prev => ({
                                        ...prev,
                                        [member.id]: newValue
                                      }));
                                    } else {
                                      // Proportionally adjust other members
                                      const remaining = 100 - newValue;
                                      const newPercentages: { [key: number]: number } = {
                                        [member.id]: newValue
                                      };
                                      
                                      // Redistribute proportionally among other members
                                      let totalDistributed = 0;
                                      const memberIds = Object.keys(sharedOwnershipPercentages).map(id => parseInt(id));
                                      
                                      memberIds.forEach(otherMemberId => {
                                        if (otherMemberId !== member.id) {
                                          const oldPercentage = sharedOwnershipPercentages[otherMemberId] || 0;
                                          if (otherMembersSum > 0) {
                                            // Calculate proportional reduction
                                            const proportion = oldPercentage / otherMembersSum;
                                            const roundedValue = Math.round(remaining * proportion);
                                            newPercentages[otherMemberId] = roundedValue;
                                            totalDistributed += roundedValue;
                                          }
                                        }
                                      });
                                      
                                      // Ensure total equals 100% by adjusting the last member
                                      const finalRemaining = 100 - newValue - totalDistributed;
                                      if (finalRemaining !== 0 && memberIds.length > 1) {
                                        const lastMemberId = memberIds.find(id => id !== member.id);
                                        if (lastMemberId) {
                                          newPercentages[lastMemberId] = (newPercentages[lastMemberId] || 0) + finalRemaining;
                                        }
                                      }
                                      
                                      setSharedOwnershipPercentages(newPercentages);
                                    }
                                  }}
                                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                />
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
                            <div className="mb-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Ownership:</span>
                                <span className={`text-sm font-medium ${
                                  Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0) === 100
                                    ? 'text-green-600 dark:text-green-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}>
                                  {Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0).toFixed(1)}%
                                </span>
                              </div>
                              {/* Progress bar */}
                              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div 
                                  className={`h-2.5 rounded-full transition-all duration-300 ${
                                    Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0) === 100
                                      ? 'bg-green-600'
                                      : Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0) > 100
                                      ? 'bg-red-600'
                                      : 'bg-blue-600'
                                  }`}
                                  style={{ width: `${Math.min(Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0), 100)}%` }}
                                />
                              </div>
                            </div>
                            {Object.values(sharedOwnershipPercentages).reduce((sum, val) => sum + val, 0) !== 100 && (
                              <p className="text-xs text-orange-600 dark:text-orange-400">
                                Total must equal 100%
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        What's it worth?
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Enter the current value and optional purchase information.
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Current Value *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                            errors.includes('Valid amount is required') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                          placeholder="0.00"
                        />
                        {errors.includes('Valid amount is required') && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{t('common.amountRequired')}</p>
                        )}
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Currency *
                        </label>
                        <select
                          name="currency"
                          value={formData.currency}
                          onChange={handleInputChange}
                          className={`w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                            errors.includes('Currency is required') ? 'border-red-500 dark:border-red-500' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {currencyOptions.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                        {errors.includes('Currency is required') && (
                          <p className="mt-1 text-sm text-red-600 dark:text-red-400">{t('common.currencyRequired')}</p>
                        )}
                      </div>
                    </div>

                    <div className="border-t pt-6">
                      <h5 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                        Purchase Information (Optional)
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Purchase Price
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            name="purchase_price"
                            value={formData.purchase_price}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Purchase Date
                          </label>
                          <input
                            type="date"
                            name="purchase_date"
                            value={formData.purchase_date}
                            onChange={handleInputChange}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Additional Details (Optional)
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Add any additional information about this asset.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description
                      </label>
                      <textarea
                        name="description"
                        value={formData.description}
                        onChange={handleInputChange}
                        rows={3}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Additional details about this asset..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="e.g., Garage, Bank Account, Investment Platform"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Notes
                      </label>
                      <textarea
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        rows={2}
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        placeholder="Any additional notes..."
                      />
                    </div>
                  </div>
                )}

                {currentStep === 5 && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                        Review & Confirm
                      </h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                        Review your asset details and click "Add Asset" to save.
                      </p>
                    </div>

                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-3">
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Name:</span>
                        <span className="text-gray-900 dark:text-white">{formData.name}</span>
                      </div>
                      <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                        <span className="font-medium text-gray-700 dark:text-gray-300">Value:</span>
                        <span className="text-gray-900 dark:text-white">{formData.currency} {formData.amount}</span>
                      </div>
                      {formData.purchase_price && (
                        <div className="flex justify-between py-2 border-b border-gray-200 dark:border-gray-600">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Purchase Price:</span>
                          <span className="text-gray-900 dark:text-white">{formData.purchase_currency || formData.currency} {formData.purchase_price}</span>
                        </div>
                      )}
                      {formData.description && (
                        <div className="flex justify-between py-2">
                          <span className="font-medium text-gray-700 dark:text-gray-300">Description:</span>
                          <span className="text-gray-900 dark:text-white text-right">{formData.description}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Navigation */}
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {/* Debug info */}
              {(() => {
                console.log(`🔍 DEBUG: currentStep=${currentStep}, totalSteps=${totalSteps}, showSubmit=${currentStep === totalSteps}`);
                return null;
              })()}
              
              {currentStep >= totalSteps ? (
                <button
                  type="button"
                  disabled={loading}
                  onClick={(e) => {
                    console.log('🔍 DEBUG: Submit button clicked', { currentStep, totalSteps });
                    e.preventDefault();
                    const form = e.currentTarget.closest('form');
                    if (form) {
                      form.requestSubmit();
                    }
                  }}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                >
                  {loading ? t('assets.saving') : (asset ? t('assets.updateAsset') : t('assets.addAsset'))}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    console.log('🔍 DEBUG: Next button clicked', { currentStep, totalSteps });
                    nextStep();
                  }}
                  disabled={!canProceedToNext()}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              )}
              
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Previous
                </button>
              )}
              
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
              >
                {t('assets.cancel')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AddEditAssetModal;