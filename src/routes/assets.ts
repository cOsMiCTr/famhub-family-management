import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { exchangeRateService } from '../services/exchangeRateService';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get asset categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categoriesResult = await query(
    'SELECT * FROM asset_categories ORDER BY is_default DESC, name_en ASC'
  );

  res.json({
    categories: categoriesResult.rows
  });
}));

// Create asset/income entry
router.post('/', [
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
  body('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('household_id').optional().isInt({ min: 1 }).withMessage('Valid household ID required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { amount, currency, category_id, description, date, household_id } = req.body;

  // Use user's household if not specified
  const finalHouseholdId = household_id || req.user.household_id;

  if (!finalHouseholdId) {
    throw createValidationError('Household ID required');
  }

  // Verify category exists
  const categoryResult = await query(
    'SELECT id FROM asset_categories WHERE id = $1',
    [category_id]
  );

  if (categoryResult.rows.length === 0) {
    throw createNotFoundError('Asset category');
  }

  // Create asset entry
  const assetResult = await query(
    `INSERT INTO assets (user_id, household_id, amount, currency, category_id, description, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [req.user.id, finalHouseholdId, amount, currency, category_id, description, date]
  );

  const asset = assetResult.rows[0];

  // Get category name for response
  const categoryNameResult = await query(
    'SELECT name_en, name_de, name_tr FROM asset_categories WHERE id = $1',
    [category_id]
  );

  const categoryName = categoryNameResult.rows[0];

  res.status(201).json({
    message: 'Asset created successfully',
    asset: {
      ...asset,
      category_name: categoryName
    }
  });
}));

// Get user's assets
router.get('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { 
    page = 1, 
    limit = 50, 
    category_id, 
    currency, 
    start_date, 
    end_date,
    household_view = false 
  } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions = [];
  const params = [];
  let paramCount = 1;

  // Build query conditions
  if (household_view === 'true' && req.user.household_id) {
    conditions.push(`a.household_id = $${paramCount++}`);
    params.push(req.user.household_id);
  } else {
    conditions.push(`a.user_id = $${paramCount++}`);
    params.push(req.user.id);
  }

  if (category_id) {
    conditions.push(`a.category_id = $${paramCount++}`);
    params.push(category_id);
  }

  if (currency) {
    conditions.push(`a.currency = $${paramCount++}`);
    params.push(currency);
  }

  if (start_date) {
    conditions.push(`a.date >= $${paramCount++}`);
    params.push(start_date);
  }

  if (end_date) {
    conditions.push(`a.date <= $${paramCount++}`);
    params.push(end_date);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get assets with pagination
  const assetsResult = await query(
    `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.type as category_type, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.date DESC, a.created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`,
    [...params, parseInt(limit as string), offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM assets a
     ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].total);

  res.json({
    assets: assetsResult.rows,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  });
}));

// Get household assets (if user has permission)
router.get('/household/:householdId', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { householdId } = req.params;
  const { 
    page = 1, 
    limit = 50, 
    category_id, 
    currency, 
    start_date, 
    end_date 
  } = req.query;

  // Check if user has permission to view this household
  if (req.user.role !== 'admin' && req.user.household_id !== parseInt(householdId)) {
    throw new Error('Access denied to this household');
  }

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions = ['a.household_id = $1'];
  const params = [householdId];
  let paramCount = 2;

  if (category_id) {
    conditions.push(`a.category_id = $${paramCount++}`);
    params.push(category_id);
  }

  if (currency) {
    conditions.push(`a.currency = $${paramCount++}`);
    params.push(currency);
  }

  if (start_date) {
    conditions.push(`a.date >= $${paramCount++}`);
    params.push(start_date);
  }

  if (end_date) {
    conditions.push(`a.date <= $${paramCount++}`);
    params.push(end_date);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get household assets
  const assetsResult = await query(
    `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.type as category_type, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.date DESC, a.created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`,
    [...params, parseInt(limit as string), offset]
  );

  // Get total count
  const countResult = await query(
    `SELECT COUNT(*) as total
     FROM assets a
     ${whereClause}`,
    params
  );

  const total = parseInt(countResult.rows[0].total);

  res.json({
    assets: assetsResult.rows,
    pagination: {
      page: parseInt(page as string),
      limit: parseInt(limit as string),
      total,
      pages: Math.ceil(total / parseInt(limit as string))
    }
  });
}));

// Get asset by ID
router.get('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;

  const assetResult = await query(
    `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.type as category_type, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     JOIN users u ON a.user_id = u.id
     WHERE a.id = $1`,
    [id]
  );

  if (assetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const asset = assetResult.rows[0];

  // Check if user can access this asset
  if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  res.json({
    asset
  });
}));

// Update asset
router.put('/:id', [
  body('amount').optional().isFloat({ min: 0 }).withMessage('Valid amount required'),
  body('currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
  body('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('date').optional().isISO8601().withMessage('Valid date required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;
  const { amount, currency, category_id, description, date } = req.body;

  // Check if asset exists and user can access it
  const existingAssetResult = await query(
    'SELECT * FROM assets WHERE id = $1',
    [id]
  );

  if (existingAssetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const existingAsset = existingAssetResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && existingAsset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (amount !== undefined) {
    updateFields.push(`amount = $${paramCount++}`);
    updateValues.push(amount);
  }

  if (currency !== undefined) {
    updateFields.push(`currency = $${paramCount++}`);
    updateValues.push(currency);
  }

  if (category_id !== undefined) {
    updateFields.push(`category_id = $${paramCount++}`);
    updateValues.push(category_id);
  }

  if (description !== undefined) {
    updateFields.push(`description = $${paramCount++}`);
    updateValues.push(description);
  }

  if (date !== undefined) {
    updateFields.push(`date = $${paramCount++}`);
    updateValues.push(date);
  }

  if (updateFields.length === 0) {
    throw createValidationError('No fields to update');
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(id);

  const result = await query(
    `UPDATE assets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    updateValues
  );

  res.json({
    message: 'Asset updated successfully',
    asset: result.rows[0]
  });
}));

// Delete asset
router.delete('/:id', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;

  // Check if asset exists and user can access it
  const existingAssetResult = await query(
    'SELECT * FROM assets WHERE id = $1',
    [id]
  );

  if (existingAssetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const existingAsset = existingAssetResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && existingAsset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  await query('DELETE FROM assets WHERE id = $1', [id]);

  res.json({
    message: 'Asset deleted successfully'
  });
}));

// Get asset summary with currency conversion
router.get('/summary/currency-conversion', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { main_currency = req.user.main_currency || 'USD' } = req.query;

  // Get user's assets grouped by currency
  const assetsResult = await query(
    `SELECT currency, SUM(amount) as total_amount, COUNT(*) as count
     FROM assets
     WHERE user_id = $1
     GROUP BY currency`,
    [req.user.id]
  );

  const currencyTotals = assetsResult.rows;
  const convertedTotals = [];

  // Convert each currency to main currency
  for (const currencyTotal of currencyTotals) {
    try {
      const convertedAmount = await exchangeRateService.convertCurrency(
        parseFloat(currencyTotal.total_amount),
        currencyTotal.currency,
        main_currency as string
      );

      convertedTotals.push({
        currency: currencyTotal.currency,
        original_amount: parseFloat(currencyTotal.total_amount),
        converted_amount: convertedAmount,
        count: parseInt(currencyTotal.count)
      });
    } catch (error) {
      console.error(`Failed to convert ${currencyTotal.currency} to ${main_currency}:`, error);
    }
  }

  // Calculate total in main currency
  const totalInMainCurrency = convertedTotals.reduce(
    (sum, item) => sum + item.converted_amount,
    0
  );

  res.json({
    main_currency,
    currency_breakdown: convertedTotals,
    total_in_main_currency: totalInMainCurrency,
    timestamp: new Date().toISOString()
  });
}));

export default router;
