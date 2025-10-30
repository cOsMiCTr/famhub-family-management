export interface HouseholdMember {
  id: number;
  name: string;
  relationship: string;
}

// Asset utility functions for formatting, calculations, and display

export interface SharedOwnership {
  household_member_id: number;
  ownership_percentage: number;
  member_name?: string;
  relationship?: string;
  role?: string;
}

export interface Asset {
  id: number;
  name: string;
  amount: number;
  currency: string;
  category_id: number;
  description?: string;
  date: string;
  household_member_id?: number;
  purchase_date?: string;
  purchase_price?: number;
  purchase_currency?: string;
  current_value?: number;
  last_valuation_date?: string;
  valuation_method?: string;
  ownership_type: string;
  ownership_percentage: number;
  status: string;
  location?: string;
  notes?: string;
  photo_url?: string;
  category_name_en: string;
  category_name_de: string;
  category_name_tr: string;
  category_type: string;
  icon?: string;
  member_name?: string;
  user_email: string;
  shared_ownership?: SharedOwnership[];
}

export interface AssetCategory {
  id: number;
  name_en: string;
  name_de: string;
  name_tr: string;
  category_type: string;
  icon?: string;
  requires_ticker: boolean;
  depreciation_enabled: boolean;
  is_default: boolean;
  asset_count: number;
  allowed_currency_types?: string[];
}

// Currency formatting
export const formatCurrency = (amount: number | string, currency: string): string => {
  // Ensure amount is a number
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  // Get currency symbol
  const symbols: { [key: string]: string } = {
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'TRY': '₺',
    'GOLD': 'Au',
    'BTC': '₿',
    'ETH': 'Ξ',
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
  
  const symbol = symbols[currency] || currency;
  
  // Format number with thousand separators using German standards (1.000,00)
  const formattedAmount = numericAmount.toLocaleString('de-DE', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
  
  return `${formattedAmount} ${symbol}`;
};

// Calculate ROI (Return on Investment)
export const calculateROI = (asset: Asset): number | null => {
  if (!asset.purchase_price || asset.purchase_price <= 0) return null;
  
  const purchasePrice = asset.purchase_price;
  const currentValue = asset.current_value || asset.amount;
  const roi = ((currentValue - purchasePrice) / purchasePrice) * 100;
  
  return roi;
};

// Calculate annualized return
export const calculateAnnualizedReturn = (asset: Asset): number | null => {
  if (!asset.purchase_price || asset.purchase_price <= 0 || !asset.purchase_date) return null;
  
  const purchasePrice = asset.purchase_price;
  const currentValue = asset.current_value || asset.amount;
  const purchaseDate = new Date(asset.purchase_date);
  const currentDate = new Date();
  
  const yearsDiff = (currentDate.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  if (yearsDiff <= 0) return null;
  
  const totalReturn = (currentValue - purchasePrice) / purchasePrice;
  const annualizedReturn = Math.pow(1 + totalReturn, 1 / yearsDiff) - 1;
  
  return annualizedReturn * 100;
};

// Helper function to get the icon component for a category
export const getCategoryIconComponent = (iconName: string | undefined, iconMap: any): any => {
  if (!iconName) return null;
  return iconMap[iconName] || iconMap['CubeTransparentIcon'];
};

// Get category name based on language
export const getCategoryName = (category: AssetCategory, language: string = 'en'): string => {
  switch (language) {
    case 'de': return category.name_de;
    case 'tr': return category.name_tr;
    default: return category.name_en;
  }
};

// Get status color classes
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'sold': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'transferred': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'inactive': return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Get ownership type color classes
export const getOwnershipColor = (type: string): string => {
  switch (type) {
    case 'single': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'shared': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
};

// Get ROI color classes
export const getROIColor = (roi: number): string => {
  if (roi > 0) return 'text-green-600 dark:text-green-400';
  if (roi < 0) return 'text-red-600 dark:text-red-400';
  return 'text-gray-600 dark:text-gray-400';
};

// Format date for display using German standards (DD.MM.YYYY)
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('de-DE', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

// Format date for input fields (YYYY-MM-DD)
export const formatDateForInput = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
};

// Get current date in input format
export const getCurrentDateForInput = (): string => {
  return new Date().toISOString().split('T')[0];
};

// Validate asset form data
export const validateAssetForm = (formData: any, currentStep?: number): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!formData.name || formData.name.trim() === '') {
    errors.push('Asset name is required');
  }

  // Only validate amount and currency if we're past step 3 (where they're entered)
  if (currentStep === undefined || currentStep >= 4) {
    if (!formData.amount || formData.amount <= 0) {
      errors.push('Valid amount is required');
    }

    if (!formData.currency) {
      errors.push('Currency is required');
    }
  }

  if (!formData.category_id) {
    errors.push('Category is required');
  }

  if (!formData.date) {
    errors.push('Date is required');
  }

  if (formData.purchase_price && formData.purchase_price <= 0) {
    errors.push('Purchase price must be greater than 0');
  }

  if (formData.current_value && formData.current_value <= 0) {
    errors.push('Current value must be greater than 0');
  }

  if (formData.ownership_percentage && (formData.ownership_percentage < 0 || formData.ownership_percentage > 100)) {
    errors.push('Ownership percentage must be between 0 and 100');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

// Get ownership display text
export const getOwnershipDisplayText = (type: string, percentage: number): string => {
  switch (type) {
    case 'single':
      return '100% Owned';
    case 'shared':
      return `${percentage}% Shared`;
    default:
      return 'Unknown';
  }
};

// Get status display text
export const getStatusDisplayText = (status: string): string => {
  switch (status) {
    case 'active':
      return 'Active';
    case 'sold':
      return 'Sold';
    case 'transferred':
      return 'Transferred';
    case 'inactive':
      return 'Inactive';
    default:
      return 'Unknown';
  }
};

// Get valuation method display text
export const getValuationMethodDisplayText = (method: string): string => {
  switch (method) {
    case 'market':
      return 'Market Value';
    case 'appraisal':
      return 'Appraisal';
    case 'estimate':
      return 'Estimate';
    case 'manual':
      return 'Manual';
    default:
      return method || 'Manual';
  }
};

// Calculate total value in main currency
export const calculateTotalValueInCurrency = (
  assets: Asset[], 
  targetCurrency: string, 
  exchangeRates: any[]
): number => {
  return assets.reduce((total, asset) => {
    const assetValue = asset.current_value || asset.amount;
    
    if (asset.currency === targetCurrency) {
      return total + assetValue;
    }
    
    const rate = exchangeRates.find(r => 
      r.from_currency === asset.currency && r.to_currency === targetCurrency
    );
    
    if (rate) {
      return total + (assetValue * rate.rate);
    }
    
    return total;
  }, 0);
};

// Get asset summary statistics
export const getAssetSummary = (assets: Asset[]) => {
  const totalAssets = assets.length;
  const totalValue = assets.reduce((sum, asset) => sum + (asset.current_value || asset.amount), 0);
  
  const assetsWithROI = assets.filter(asset => asset.purchase_price && asset.purchase_price > 0);
  const totalROI = assetsWithROI.reduce((sum, asset) => {
    const roi = calculateROI(asset);
    return sum + (roi || 0);
  }, 0);
  const averageROI = assetsWithROI.length > 0 ? totalROI / assetsWithROI.length : 0;
  
  return {
    totalAssets,
    totalValue,
    averageROI,
    assetsWithROI: assetsWithROI.length
  };
};

// Group assets by category
export const groupAssetsByCategory = (assets: Asset[], categories: AssetCategory[]) => {
  const grouped: { [key: string]: { category: AssetCategory; assets: Asset[]; totalValue: number } } = {};
  
  assets.forEach(asset => {
    const category = categories.find(c => c.id === asset.category_id);
    if (category) {
      const categoryName = getCategoryName(category);
      
      if (!grouped[categoryName]) {
        grouped[categoryName] = {
          category,
          assets: [],
          totalValue: 0
        };
      }
      
      grouped[categoryName].assets.push(asset);
      grouped[categoryName].totalValue += asset.current_value || asset.amount;
    }
  });
  
  return grouped;
};

// Filter assets based on search criteria
export const filterAssets = (
  assets: Asset[], 
  searchTerm: string, 
  categoryId?: string, 
  status?: string, 
  memberId?: string, 
  currency?: string
): Asset[] => {
  return assets.filter(asset => {
    // Search term filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        asset.name.toLowerCase().includes(searchLower) ||
        asset.description?.toLowerCase().includes(searchLower) ||
        asset.category_name_en.toLowerCase().includes(searchLower) ||
        asset.member_name?.toLowerCase().includes(searchLower) ||
        asset.location?.toLowerCase().includes(searchLower);
      
      if (!matchesSearch) return false;
    }
    
    // Category filter
    if (categoryId && asset.category_id.toString() !== categoryId) {
      return false;
    }
    
    // Status filter
    if (status && asset.status !== status) {
      return false;
    }
    
    // Member filter
    if (memberId && asset.household_member_id?.toString() !== memberId) {
      return false;
    }
    
    // Currency filter
    if (currency && asset.currency !== currency) {
      return false;
    }
    
    return true;
  });
};
