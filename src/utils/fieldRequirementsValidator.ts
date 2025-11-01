/**
 * Field Requirements Validator
 * Validates entity data against category field requirements
 */

interface FieldRequirement {
  required?: boolean;
  conditional?: {
    field: string;
    value: any;
  };
  multiple_allowed?: boolean;
}

interface FieldRequirements {
  [key: string]: FieldRequirement | FieldRequirements;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates expense data against field requirements
 */
export function validateExpenseFieldRequirements(
  fieldRequirements: FieldRequirements | null,
  expenseData: any
): ValidationResult {
  const errors: string[] = [];

  if (!fieldRequirements) {
    return { valid: true, errors: [] };
  }

  // Validate top-level fields
  if (fieldRequirements.amount?.required && (!expenseData.amount || expenseData.amount <= 0)) {
    errors.push('Amount is required');
  }

  if (fieldRequirements.currency?.required && !expenseData.currency) {
    errors.push('Currency is required');
  }

  if (fieldRequirements.description?.required && (!expenseData.description || expenseData.description.trim() === '')) {
    errors.push('Description is required');
  }

  if (fieldRequirements.start_date?.required && !expenseData.start_date) {
    errors.push('Start date is required');
  }

  if (fieldRequirements.end_date?.required && !expenseData.end_date) {
    errors.push('End date is required');
  }

  // Conditional requirements
  if (fieldRequirements.frequency) {
    const freqReq = fieldRequirements.frequency as FieldRequirement;
    if (freqReq.conditional) {
      const condition = freqReq.conditional;
      if (expenseData[condition.field] === condition.value) {
        if (freqReq.required && !expenseData.frequency) {
          errors.push('Frequency is required when expense is recurring');
        }
      }
    }
  }

  if (fieldRequirements.linked_asset_id?.required && !expenseData.linked_asset_id) {
    errors.push('Asset link is required');
  }

  if (fieldRequirements.linked_member_ids?.required) {
    if (!expenseData.linked_member_ids || 
        !Array.isArray(expenseData.linked_member_ids) || 
        expenseData.linked_member_ids.length === 0) {
      errors.push('At least one household member link is required');
    }
    
    // Check multiple_allowed
    if (fieldRequirements.linked_member_ids.multiple_allowed === false && 
        expenseData.linked_member_ids && 
        expenseData.linked_member_ids.length > 1) {
      errors.push('Only one household member link is allowed');
    }
  }

  // Validate metadata fields if specified
  if (fieldRequirements.metadata && typeof fieldRequirements.metadata === 'object') {
    const metadataReqs = fieldRequirements.metadata as FieldRequirements;
    const metadata = expenseData.metadata || {};
    
    for (const [field, requirement] of Object.entries(metadataReqs)) {
      const req = requirement as FieldRequirement;
      if (req.required && !metadata[field]) {
        errors.push(`Metadata field "${field}" is required`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates income data against field requirements
 */
export function validateIncomeFieldRequirements(
  fieldRequirements: FieldRequirements | null,
  incomeData: any
): ValidationResult {
  const errors: string[] = [];

  if (!fieldRequirements) {
    return { valid: true, errors: [] };
  }

  if (fieldRequirements.amount?.required && (!incomeData.amount || incomeData.amount <= 0)) {
    errors.push('Amount is required');
  }

  if (fieldRequirements.currency?.required && !incomeData.currency) {
    errors.push('Currency is required');
  }

  if (fieldRequirements.description?.required && (!incomeData.description || incomeData.description.trim() === '')) {
    errors.push('Description is required');
  }

  if (fieldRequirements.start_date?.required && !incomeData.start_date) {
    errors.push('Start date is required');
  }

  if (fieldRequirements.end_date?.required && !incomeData.end_date) {
    errors.push('End date is required');
  }

  if (fieldRequirements.frequency) {
    const freqReq = fieldRequirements.frequency as FieldRequirement;
    if (freqReq.conditional) {
      const condition = freqReq.conditional;
      if (incomeData[condition.field] === condition.value) {
        if (freqReq.required && !incomeData.frequency) {
          errors.push('Frequency is required when income is recurring');
        }
      }
    }
  }

  if (fieldRequirements.household_member_id?.required && !incomeData.household_member_id) {
    errors.push('Household member is required');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates asset data against field requirements
 */
export function validateAssetFieldRequirements(
  fieldRequirements: FieldRequirements | null,
  assetData: any
): ValidationResult {
  const errors: string[] = [];

  if (!fieldRequirements) {
    return { valid: true, errors: [] };
  }

  if (fieldRequirements.name?.required && (!assetData.name || assetData.name.trim() === '')) {
    errors.push('Asset name is required');
  }

  if (fieldRequirements.category_id?.required && !assetData.category_id) {
    errors.push('Category is required');
  }

  if (fieldRequirements.value?.required && (!assetData.current_value || assetData.current_value <= 0)) {
    errors.push('Asset value is required');
  }

  if (fieldRequirements.currency?.required && !assetData.currency) {
    errors.push('Currency is required');
  }

  if (fieldRequirements.location?.required && (!assetData.location || assetData.location.trim() === '')) {
    errors.push('Location is required');
  }

  if (fieldRequirements.purchase_date?.required && !assetData.purchase_date) {
    errors.push('Purchase date is required');
  }

  if (fieldRequirements.purchase_price?.required && (!assetData.purchase_price || assetData.purchase_price <= 0)) {
    errors.push('Purchase price is required');
  }

  if (fieldRequirements.description?.required && (!assetData.description || assetData.description.trim() === '')) {
    errors.push('Description is required');
  }

  if (fieldRequirements.ownership_type?.required && !assetData.ownership_type) {
    errors.push('Ownership type is required');
  }

  // Conditional: ticker required for stocks
  if (fieldRequirements.ticker) {
    const tickerReq = fieldRequirements.ticker as FieldRequirement;
    if (tickerReq.conditional) {
      const condition = tickerReq.conditional;
      if (assetData[condition.field] === condition.value) {
        if (tickerReq.required && (!assetData.ticker || assetData.ticker.trim() === '')) {
          errors.push('Ticker symbol is required for stock assets');
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

