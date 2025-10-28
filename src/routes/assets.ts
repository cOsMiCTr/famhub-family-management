import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { exchangeRateService } from '../services/exchangeRateService';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { getActiveCurrencyCodes } from '../utils/currencyHelpers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Configure multer for photo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../public/uploads/assets');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `asset-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get asset categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categoriesResult = await query(
    'SELECT * FROM asset_categories ORDER BY is_default DESC, name_en ASC'
  );

  res.json(categoriesResult.rows);
}));

// Create asset entry
router.post('/', [
  body('name').trim().notEmpty().withMessage('Asset name is required'),
  body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
  // Currency validation will be done in the handler
  body('category_id').isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('date').isISO8601().withMessage('Valid date required'),
  body('household_member_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Valid household member ID required'),
  body('purchase_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid purchase date required'),
  body('purchase_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid purchase price required'),
  // purchase_currency will be validated in handler
  body('current_value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid current value required'),
  body('valuation_method').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }).withMessage('Valuation method too long'),
  body('ownership_type').optional({ nullable: true, checkFalsy: true }).isIn(['single', 'shared']).withMessage('Invalid ownership type'),
  body('ownership_percentage').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
  body('status').optional().isIn(['active', 'sold', 'transferred', 'inactive']).withMessage('Invalid status'),
  body('location').optional().isLength({ max: 500 }).withMessage('Location too long'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { 
    name, amount, currency, category_id, description, date, household_member_id,
    purchase_date, purchase_price, purchase_currency, current_value, valuation_method,
    ownership_type, ownership_percentage, status, location, notes
  } = req.body;

  // Use user's household
  const householdId = req.user.household_id;
  if (!householdId) {
    throw createValidationError('User must be assigned to a household');
  }

  // Validate currency codes
  const validCurrencyCodes = await getActiveCurrencyCodes();
  if (!validCurrencyCodes.includes(currency)) {
    throw createValidationError(`Invalid currency: ${currency}`);
  }
  if (purchase_currency && !validCurrencyCodes.includes(purchase_currency)) {
    throw createValidationError(`Invalid purchase currency: ${purchase_currency}`);
  }

  // Verify category exists
  const categoryResult = await query(
    'SELECT id FROM asset_categories WHERE id = $1',
    [category_id]
  );

  if (categoryResult.rows.length === 0) {
    throw createNotFoundError('Asset category');
  }

  // Verify household member exists if specified
  if (household_member_id) {
    const memberResult = await query(
      'SELECT id FROM household_members WHERE id = $1 AND household_id = $2',
      [household_member_id, householdId]
    );

    if (memberResult.rows.length === 0) {
      throw createNotFoundError('Household member');
    }
  }

  // Create asset entry
  const assetResult = await query(
    `INSERT INTO assets (
      user_id, household_id, household_member_id, name, amount, currency, 
      category_id, description, date, purchase_date, purchase_price, 
      purchase_currency, current_value, last_valuation_date, valuation_method,
      ownership_type, ownership_percentage, status, location, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *`,
    [
      req.user.id, householdId, household_member_id || null, name, amount, currency,
      category_id, description || null, date, purchase_date || null, purchase_price || null,
      purchase_currency || null, current_value || amount, current_value ? new Date().toISOString().split('T')[0] : null, valuation_method || null,
      ownership_type || 'single', ownership_percentage || 100.00, status || 'active', location || null, notes || null
    ]
  );

  const asset = assetResult.rows[0];

  // Handle shared ownership distribution if applicable
  if (ownership_type === 'shared' && req.body.shared_ownership_percentages) {
    const sharedPercentages = req.body.shared_ownership_percentages;
    
    for (const [memberId, percentage] of Object.entries(sharedPercentages)) {
      const percentageValue = typeof percentage === 'number' ? percentage : parseFloat(percentage as string);
      
      if (percentageValue > 0) {
        await query(
          `INSERT INTO shared_ownership_distribution (asset_id, household_member_id, ownership_percentage)
           VALUES ($1, $2, $3)`,
          [asset.id, parseInt(memberId), percentageValue]
        );
      }
    }
  }

  // Create valuation history entries
  // If purchase_price exists, create two entries: purchase price first, then current value
  if (purchase_price && purchase_date) {
    // First entry: purchase price at purchase date
    await query(
      `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [asset.id, purchase_date, purchase_price, currency, valuation_method || 'Manual', req.user.id]
    );
    
    // Second entry: current value at current date
    const currentValue = current_value || amount;
    await query(
      `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [asset.id, new Date().toISOString().split('T')[0], currentValue, currency, valuation_method || 'Manual', req.user.id]
    );
  } else {
    // Single entry: current value
    const initialValue = current_value || amount;
    const valuationDate = purchase_date || date;
    await query(
      `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [asset.id, valuationDate, initialValue, currency, valuation_method || 'Manual', req.user.id]
    );
  }

  // Get category and member names for response
  const [categoryNameResult, memberNameResult] = await Promise.all([
    query('SELECT name_en, name_de, name_tr FROM asset_categories WHERE id = $1', [category_id]),
    household_member_id ? query('SELECT name FROM household_members WHERE id = $1', [household_member_id]) : Promise.resolve({ rows: [] })
  ]);

  res.status(201).json({
    message: 'Asset created successfully',
    asset: {
      ...asset,
      category_name: categoryNameResult.rows[0],
      member_name: memberNameResult.rows[0]?.name || null
    }
  });
}));

// Get asset summary with currency conversion (MUST BE BEFORE /:id ROUTE)
router.get('/summary', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { 
    start_date, 
    end_date, 
    category_id,
    status = 'active',
    household_view = false
  } = req.query;

  const conditions = ['a.status = $1'];
  const params = [status];
  let paramCount = 2;

  // Build query conditions
  if (household_view === 'true' && req.user.household_id) {
    conditions.push(`a.household_id = $${paramCount++}`);
    params.push(req.user.household_id);
  } else {
    // Personal view: show assets where user is owner OR user is in shared ownership
    // Get user's household member ID
    const userMemberResult = await query(
      'SELECT id FROM household_members WHERE user_id = $1',
      [req.user.id]
    );
    
    if (userMemberResult.rows.length > 0) {
      const userMemberId = userMemberResult.rows[0].id;
      // Include assets where:
      // 1. User is the primary owner, OR
      // 2. User is part of shared ownership distribution
      conditions.push(`(a.user_id = $${paramCount++} OR EXISTS (
        SELECT 1 FROM shared_ownership_distribution 
        WHERE asset_id = a.id AND household_member_id = $${paramCount}
      ))`);
      params.push(req.user.id);
      params.push(userMemberId);
    } else {
      // Fallback if no household member record - only show assets user owns
      conditions.push(`a.user_id = $${paramCount++}`);
      params.push(req.user.id);
    }
  }

  if (start_date) {
    conditions.push(`a.date >= $${paramCount++}`);
    params.push(start_date);
  }

  if (end_date) {
    conditions.push(`a.date <= $${paramCount++}`);
    params.push(end_date);
  }

  if (category_id) {
    conditions.push(`a.category_id = $${paramCount++}`);
    params.push(category_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // Get assets with category information
  const assetsResult = await query(
    `SELECT a.*, ac.name_en as category_name_en, ac.category_type, ac.icon
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     ${whereClause}
     ORDER BY a.current_value DESC`,
    params
  );

  // Get exchange rates
  const exchangeRates = await exchangeRateService.getAllExchangeRates();
  const userCurrency = req.user.main_currency || 'USD';

  // Calculate totals by category and currency
  const categoryTotals: { [key: string]: { [key: string]: number } } = {};
  const currencyTotals: { [key: string]: number } = {};
  let totalValueInMainCurrency = 0;

  for (const asset of assetsResult.rows) {
    const categoryName = asset.category_name_en;
    const assetCurrency = asset.currency;
    const assetValue = parseFloat(asset.current_value || asset.amount);

    // Initialize category totals
    if (!categoryTotals[categoryName]) {
      categoryTotals[categoryName] = {};
    }

    // Add to category totals
    if (!categoryTotals[categoryName][assetCurrency]) {
      categoryTotals[categoryName][assetCurrency] = 0;
    }
    categoryTotals[categoryName][assetCurrency] += assetValue;

    // Add to currency totals
    if (!currencyTotals[assetCurrency]) {
      currencyTotals[assetCurrency] = 0;
    }
    currencyTotals[assetCurrency] += assetValue;

    // Convert to main currency
    if (assetCurrency === userCurrency) {
      totalValueInMainCurrency += assetValue;
    } else {
      const rate = exchangeRates.find(r => r.from_currency === assetCurrency && r.to_currency === userCurrency);
      if (rate) {
        totalValueInMainCurrency += assetValue * rate.rate;
      }
    }
  }

  // Calculate ROI for assets with purchase price
  const assetsWithROI = assetsResult.rows.filter(asset => asset.purchase_price && asset.purchase_price > 0);
  const totalROI = assetsWithROI.reduce((sum, asset) => {
    const purchasePrice = parseFloat(asset.purchase_price);
    const currentValue = parseFloat(asset.current_value || asset.amount);
    return sum + ((currentValue - purchasePrice) / purchasePrice) * 100;
  }, 0);
  const averageROI = assetsWithROI.length > 0 ? totalROI / assetsWithROI.length : 0;

  // Calculate allocation by category
  const allocationByCategory = Object.entries(categoryTotals).map(([categoryName, currencies]) => {
    const categoryTotal = Object.values(currencies).reduce((sum, val) => sum + val, 0);
    return {
      category_name: categoryName,
      total_value: categoryTotal,
      percentage: totalValueInMainCurrency > 0 ? (categoryTotal / totalValueInMainCurrency) * 100 : 0
    };
  }).sort((a, b) => b.total_value - a.total_value);

  // Calculate allocation by category type
  const typeTotals: { [key: string]: number } = {};
  for (const asset of assetsResult.rows) {
    const categoryType = asset.category_type || 'other';
    const assetValue = parseFloat(asset.current_value || asset.amount);
    
    // Convert to main currency
    if (asset.currency === userCurrency) {
      typeTotals[categoryType] = (typeTotals[categoryType] || 0) + assetValue;
    } else {
      const rate = exchangeRates.find(r => r.from_currency === asset.currency && r.to_currency === userCurrency);
      if (rate) {
        typeTotals[categoryType] = (typeTotals[categoryType] || 0) + (assetValue * rate.rate);
      }
    }
  }

  const allocationByType = Object.entries(typeTotals).map(([type, totalValue]) => ({
    type,
    total_value: totalValue,
    percentage: totalValueInMainCurrency > 0 ? (totalValue / totalValueInMainCurrency) * 100 : 0
  })).sort((a, b) => b.total_value - a.total_value);

  res.json({
    summary: {
      total_assets: assetsResult.rows.length,
      total_value_main_currency: totalValueInMainCurrency,
      main_currency: userCurrency,
      average_roi: averageROI,
      assets_with_roi: assetsWithROI.length
    },
    category_totals: categoryTotals,
    currency_totals: currencyTotals,
    allocation_by_category: allocationByCategory,
    allocation_by_type: allocationByType,
    assets: assetsResult.rows
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
    status,
    ownership_type,
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
    // Personal view: show assets where user is owner OR user is in shared ownership
    // Get user's household member ID
    const userMemberResult = await query(
      'SELECT id FROM household_members WHERE user_id = $1',
      [req.user.id]
    );
    
    if (userMemberResult.rows.length > 0) {
      const userMemberId = userMemberResult.rows[0].id;
      // Include assets where:
      // 1. User is the primary owner, OR
      // 2. User is part of shared ownership distribution
      conditions.push(`(a.user_id = $${paramCount++} OR EXISTS (
        SELECT 1 FROM shared_ownership_distribution 
        WHERE asset_id = a.id AND household_member_id = $${paramCount}
      ))`);
      params.push(req.user.id);
      params.push(userMemberId);
    } else {
      // Fallback if no household member record - only show assets user owns
      conditions.push(`a.user_id = $${paramCount++}`);
      params.push(req.user.id);
    }
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

  if (status) {
    conditions.push(`a.status = $${paramCount++}`);
    params.push(status);
  }

  if (ownership_type) {
    conditions.push(`a.ownership_type = $${paramCount++}`);
    params.push(ownership_type);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get assets with pagination
  const assetsResult = await query(
    `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.category_type, ac.icon, hm.name as member_name, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     LEFT JOIN household_members hm ON a.household_member_id = hm.id
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

  // Get shared ownership distributions for all assets
  const assetIds = assetsResult.rows.map(a => a.id);
  let sharedOwnershipMap: { [key: number]: any[] } = {};
  
  if (assetIds.length > 0) {
    try {
      const sharedOwnershipResult = await query(
        `SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.name as member_name, hm.relationship
         FROM shared_ownership_distribution sod
         JOIN household_members hm ON sod.household_member_id = hm.id
         WHERE sod.asset_id = ANY($1::int[])`,
        [assetIds]
      );

      // Group by asset_id
      sharedOwnershipResult.rows.forEach(row => {
        if (!sharedOwnershipMap[row.asset_id]) {
          sharedOwnershipMap[row.asset_id] = [];
        }
        sharedOwnershipMap[row.asset_id].push({
          household_member_id: row.household_member_id,
          ownership_percentage: parseFloat(row.ownership_percentage),
          member_name: row.member_name,
          relationship: row.relationship
        });
      });
    } catch (error) {
      console.error('Error fetching shared ownership:', error);
      // Continue without shared ownership data if there's an error
    }
  }

  // Attach shared ownership to each asset
  let assetsWithOwnership = assetsResult.rows.map(asset => ({
    ...asset,
    shared_ownership: sharedOwnershipMap[asset.id] || []
  }));

  // For assets with shared ownership but no distribution entries yet, 
  // get all household members and create default distribution
  for (const asset of assetsWithOwnership) {
    if (asset.ownership_type === 'shared' && 
        (!asset.shared_ownership || asset.shared_ownership.length === 0)) {
      
      try {
        // Get all household members
        const membersResult = await query(
          `SELECT id, name, relationship FROM household_members 
           WHERE household_id = $1 ORDER BY name`,
          [asset.household_id]
        );

        if (membersResult.rows.length > 0) {
          // Calculate equal distribution
          const percentagePerMember = Math.floor(100 / membersResult.rows.length);
          const remainder = 100 % membersResult.rows.length;

          asset.shared_ownership = membersResult.rows.map((member: any, index: number) => ({
            household_member_id: member.id,
            ownership_percentage: percentagePerMember + (index === 0 ? remainder : 0),
            member_name: member.name,
            relationship: member.relationship
          }));

          // Insert into database
          for (const owner of asset.shared_ownership) {
            await query(
              `INSERT INTO shared_ownership_distribution (asset_id, household_member_id, ownership_percentage)
               VALUES ($1, $2, $3)
               ON CONFLICT (asset_id, household_member_id) DO NOTHING`,
              [asset.id, owner.household_member_id, owner.ownership_percentage]
            );
          }
        }
      } catch (error) {
        console.error('Error creating default distribution for asset:', asset.id, error);
        // Continue without default distribution
      }
    }
  }

  res.json({
    assets: assetsWithOwnership,
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
            ac.category_type, ac.icon, hm.name as member_name, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     LEFT JOIN household_members hm ON a.household_member_id = hm.id
     JOIN users u ON a.user_id = u.id
     WHERE a.id = $1`,
    [id]
  );

  if (assetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const asset = assetResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  // Get shared ownership distribution
  const sharedOwnershipResult = await query(
    `SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.name as member_name, hm.relationship
     FROM shared_ownership_distribution sod
     JOIN household_members hm ON sod.household_member_id = hm.id
     WHERE sod.asset_id = $1`,
    [id]
  );

  const assetWithOwnership = {
    ...asset,
    shared_ownership: sharedOwnershipResult.rows.map(row => ({
      household_member_id: row.household_member_id,
      ownership_percentage: parseFloat(row.ownership_percentage),
      member_name: row.member_name,
      relationship: row.relationship
    }))
  };

  res.json({
    asset: assetWithOwnership
  });
}));

// Update asset
router.put('/:id', [
  body('name').optional().trim().notEmpty().withMessage('Asset name cannot be empty'),
  body('amount').optional().isFloat({ min: 0 }).withMessage('Valid amount required'),
  // currency will be validated in handler
  body('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  body('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }).withMessage('Description too long'),
  body('date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid date required'),
  body('household_member_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Valid household member ID required'),
  body('purchase_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid purchase date required'),
  body('purchase_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid purchase price required'),
  // purchase_currency will be validated in handler
  body('current_value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid current value required'),
  body('valuation_method').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }).withMessage('Valuation method too long'),
  body('ownership_type').optional({ nullable: true, checkFalsy: true }).isIn(['single', 'shared']).withMessage('Invalid ownership type'),
  body('ownership_percentage').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
  body('status').optional({ nullable: true, checkFalsy: true }).isIn(['active', 'sold', 'transferred', 'inactive']).withMessage('Invalid status'),
  body('location').optional().isLength({ max: 500 }).withMessage('Location too long'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;
  const updateData = req.body;

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

  // Validate currency codes if provided
  if (updateData.currency || updateData.purchase_currency) {
    const validCurrencyCodes = await getActiveCurrencyCodes();
    if (updateData.currency && !validCurrencyCodes.includes(updateData.currency)) {
      throw createValidationError(`Invalid currency: ${updateData.currency}`);
    }
    if (updateData.purchase_currency && !validCurrencyCodes.includes(updateData.purchase_currency)) {
      throw createValidationError(`Invalid purchase currency: ${updateData.purchase_currency}`);
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  const allowedFields = [
    'name', 'amount', 'currency', 'category_id', 'description', 'date',
    'household_member_id', 'purchase_date', 'purchase_price', 'purchase_currency',
    'current_value', 'valuation_method', 'ownership_type', 'ownership_percentage',
    'status', 'location', 'notes'
  ];

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updateFields.push(`${field} = $${paramCount++}`);
      updateValues.push(updateData[field]);
    }
  }

  if (updateFields.length === 0) {
    throw createValidationError('No valid fields to update');
  }

  // If current_value is being updated, update last_valuation_date
  if (updateData.current_value !== undefined) {
    updateFields.push(`last_valuation_date = $${paramCount++}`);
    updateValues.push(new Date().toISOString().split('T')[0]);
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);

  const result = await query(
    `UPDATE assets SET ${updateFields.join(', ')} WHERE id = $${paramCount++} RETURNING *`,
    [...updateValues, id]
  );

  // Handle shared ownership distribution if being updated
  if (updateData.ownership_type === 'shared' && updateData.shared_ownership_percentages) {
    // Delete existing shared ownership entries
    await query('DELETE FROM shared_ownership_distribution WHERE asset_id = $1', [id]);
    
    const sharedPercentages = updateData.shared_ownership_percentages;
    for (const [memberId, percentage] of Object.entries(sharedPercentages)) {
      const percentageValue = typeof percentage === 'number' ? percentage : parseFloat(percentage as string);
      if (percentageValue > 0) {
        await query(
          `INSERT INTO shared_ownership_distribution (asset_id, household_member_id, ownership_percentage)
           VALUES ($1, $2, $3)`,
          [id, parseInt(memberId), percentageValue]
        );
      }
    }
  } else if (updateData.ownership_type && updateData.ownership_type !== 'shared') {
    // If ownership type is changing away from shared, delete all shared ownership entries
    await query('DELETE FROM shared_ownership_distribution WHERE asset_id = $1', [id]);
  }

  // Update or create valuation history entries
  const hasHistory = await query('SELECT COUNT(*) as count FROM asset_valuation_history WHERE asset_id = $1', [id]);
  const historyCount = parseInt(hasHistory.rows[0].count);

  if (updateData.purchase_price !== undefined || updateData.purchase_date !== undefined || updateData.current_value !== undefined || updateData.amount !== undefined) {
    if (historyCount === 0) {
      // No history exists, create new entries based on updated data
      const purchasePrice = updateData.purchase_price !== undefined ? updateData.purchase_price : existingAsset.purchase_price;
      const purchaseDate = updateData.purchase_date !== undefined ? updateData.purchase_date : existingAsset.purchase_date;
      const currentValue = updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : existingAsset.current_value || existingAsset.amount);
      const currency = updateData.currency || existingAsset.currency;

      if (purchasePrice && purchaseDate) {
        // Create two entries: purchase price first, then current value
        await query(
          `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, purchaseDate, purchasePrice, currency, existingAsset.valuation_method || 'Manual', req.user.id]
        );
        await query(
          `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, new Date().toISOString().split('T')[0], currentValue, currency, existingAsset.valuation_method || 'Manual', req.user.id]
        );
      } else {
        // Single entry
        await query(
          `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, existingAsset.date, currentValue, currency, existingAsset.valuation_method || 'Manual', req.user.id]
        );
      }
    } else {
      // Update existing valuations
      const valuations = await query(
        'SELECT id FROM asset_valuation_history WHERE asset_id = $1 ORDER BY valuation_date ASC, created_at ASC',
        [id]
      );

      // If only one entry exists and purchase price is being added, create a second entry
      if (historyCount === 1 && updateData.purchase_price && updateData.purchase_date) {
        const currentValue = updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : existingAsset.current_value || existingAsset.amount);
        const currency = updateData.currency || existingAsset.currency;
        // Update first entry with purchase info
        await query(
          `UPDATE asset_valuation_history SET value = $1, valuation_date = $2 WHERE id = $3`,
          [updateData.purchase_price, updateData.purchase_date, valuations.rows[0].id]
        );
        // Create second entry with current value
        await query(
          `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [id, new Date().toISOString().split('T')[0], currentValue, currency, existingAsset.valuation_method || 'Manual', req.user.id]
        );
      } else {
        // Update first entry (oldest)
        const valuationDate = updateData.purchase_date || existingAsset.purchase_date || existingAsset.date || new Date().toISOString().split('T')[0];
        const value = updateData.purchase_price !== undefined ? updateData.purchase_price : (updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : null));
        
        if (value !== null && value !== undefined) {
          await query(
            `UPDATE asset_valuation_history 
             SET value = $1, currency = $2, valuation_method = $3, valuation_date = $4
             WHERE id = $5`,
            [
              value,
              updateData.currency || existingAsset.currency,
              existingAsset.valuation_method || 'Manual',
              valuationDate,
              valuations.rows[0].id
            ]
          );
        }

        // If second entry exists, update it with current value
        if (valuations.rows.length === 2) {
          const currentValue = updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : null);
          if (currentValue !== null && currentValue !== undefined) {
            await query(
              `UPDATE asset_valuation_history 
               SET value = $1, currency = $2, valuation_method = $3
               WHERE id = $4`,
              [
                currentValue,
                updateData.currency || existingAsset.currency,
                existingAsset.valuation_method || 'Manual',
                valuations.rows[1].id
              ]
            );
          }
        }
      }
    }
  }

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

// Get asset valuation history
router.get('/:id/history', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;

  // Check if asset exists and user can access it
  const assetResult = await query('SELECT * FROM assets WHERE id = $1', [id]);

  if (assetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const asset = assetResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  const historyResult = await query(
    `SELECT avh.*, u.email as created_by_email
     FROM asset_valuation_history avh
     LEFT JOIN users u ON avh.created_by = u.id
     WHERE avh.asset_id = $1
     ORDER BY avh.valuation_date DESC, avh.created_at DESC`,
    [id]
  );

  res.json({
    asset_id: id,
    history: historyResult.rows
  });
}));

// Delete valuation entry
router.delete('/valuation/:valuationId', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { valuationId } = req.params;

  // Get the valuation entry and check access
  const valuationResult = await query(
    `SELECT avh.*, a.user_id, a.household_id
     FROM asset_valuation_history avh
     JOIN assets a ON avh.asset_id = a.id
     WHERE avh.id = $1`,
    [valuationId]
  );

  if (valuationResult.rows.length === 0) {
    throw createNotFoundError('Valuation entry');
  }

  const valuation = valuationResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && valuation.user_id !== req.user.id) {
    throw new Error('Access denied to this valuation');
  }

  // Delete the valuation entry
  await query(
    'DELETE FROM asset_valuation_history WHERE id = $1',
    [valuationId]
  );

  res.json({
    message: 'Valuation entry deleted successfully',
    deleted_id: valuationId
  });
}));

// Add valuation entry
router.post('/:id/valuation', [
  body('value').isFloat({ min: 0 }).withMessage('Valid value required'),
  body('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
  body('valuation_date').isISO8601().withMessage('Valid valuation date required'),
  body('valuation_method').optional().isLength({ max: 50 }).withMessage('Valuation method too long'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;
  const { value, currency, valuation_date, valuation_method, notes } = req.body;

  // Check if asset exists and user can access it
  const assetResult = await query('SELECT * FROM assets WHERE id = $1', [id]);

  if (assetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const asset = assetResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  // Create valuation history entry
  const historyResult = await query(
    `INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`,
    [id, valuation_date, value, currency, valuation_method || 'Manual', notes || null, req.user.id]
  );

  // Update asset's current value and last valuation date
  await query(
    `UPDATE assets SET current_value = $1, last_valuation_date = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`,
    [value, valuation_date, id]
  );

  res.status(201).json({
    message: 'Valuation added successfully',
    valuation: historyResult.rows[0]
  });
}));

// Upload photo
router.post('/:id/photo', upload.single('photo'), asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { id } = req.params;

  if (!req.file) {
    throw createValidationError('No photo file provided');
  }

  // Check if asset exists and user can access it
  const assetResult = await query('SELECT * FROM assets WHERE id = $1', [id]);

  if (assetResult.rows.length === 0) {
    throw createNotFoundError('Asset');
  }

  const asset = assetResult.rows[0];

  // Check permissions
  if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
    throw new Error('Access denied to this asset');
  }

  // Delete old photo if exists
  if (asset.photo_url) {
    const oldPhotoPath = path.join(__dirname, '../../public', asset.photo_url);
    if (fs.existsSync(oldPhotoPath)) {
      fs.unlinkSync(oldPhotoPath);
    }
  }

  // Update asset with new photo URL
  const photoUrl = `/uploads/assets/${req.file.filename}`;
  await query(
    'UPDATE assets SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
    [photoUrl, id]
  );

  res.json({
    message: 'Photo uploaded successfully',
    photo_url: photoUrl
  });
}));

export default router;