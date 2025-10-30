import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { exchangeRateService } from '../services/exchangeRateService';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { requireModule } from '../middleware/moduleAuth';
import { getActiveCurrencyCodes } from '../utils/currencyHelpers';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);
// Apply module protection - assets module required
router.use(requireModule('assets'));

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

  // Get shared ownership distributions for personal view calculations
  let userOwnershipMap: { [key: number]: number } = {};
  let userMemberId: number | null = null;
  
  if (household_view !== 'true') {
    // Get user's household member ID
    const userMemberResult = await query(
      'SELECT id FROM household_members WHERE user_id = $1',
      [req.user.id]
    );
    
    if (userMemberResult.rows.length > 0) {
      userMemberId = userMemberResult.rows[0].id;
      const assetIds = assetsResult.rows.map(a => a.id);
      
      if (assetIds.length > 0) {
        // Fetch shared ownership for all assets
        const sharedOwnershipResult = await query(
          `SELECT asset_id, ownership_percentage
           FROM shared_ownership_distribution
           WHERE asset_id = ANY($1::int[]) AND household_member_id = $2`,
          [assetIds, userMemberId]
        );
        
        // Build ownership map: asset_id -> ownership_percentage
        sharedOwnershipResult.rows.forEach(row => {
          userOwnershipMap[row.asset_id] = parseFloat(row.ownership_percentage);
        });
      }
    }
  }

  // Get exchange rates
  const exchangeRates = await exchangeRateService.getAllExchangeRates();
  const userCurrency = req.user.main_currency || 'USD';

  // Calculate totals by category and currency
  const categoryTotals: { [key: string]: { [key: string]: number } } = {};
  const currencyTotals: { [key: string]: number } = {};
  let totalValueInMainCurrency = 0;
  let assetsWithOwnership = 0;

  for (const asset of assetsResult.rows) {
    let ownershipPercentage = 100; // Default: user owns 100%
    let includeAsset = true;

    // In Personal View, calculate actual ownership percentage
    if (household_view !== 'true') {
      if (asset.user_id === req.user.id) {
        // User is primary owner - 100% ownership
        ownershipPercentage = 100;
      } else if (userMemberId && userOwnershipMap[asset.id]) {
        // User has shared ownership - use their percentage
        ownershipPercentage = userOwnershipMap[asset.id];
      } else {
        // User has no ownership - exclude this asset
        includeAsset = false;
      }
    }

    // Skip assets where user has no ownership in Personal View
    if (!includeAsset) {
      continue;
    }

    assetsWithOwnership++;
    const categoryName = asset.category_name_en;
    const assetCurrency = asset.currency;
    const fullAssetValue = parseFloat(asset.current_value || asset.amount);
    
    // Calculate user's actual value based on ownership percentage
    const userAssetValue = fullAssetValue * (ownershipPercentage / 100);

    // Initialize category totals
    if (!categoryTotals[categoryName]) {
      categoryTotals[categoryName] = {};
    }

    // Add to category totals (user's portion)
    if (!categoryTotals[categoryName][assetCurrency]) {
      categoryTotals[categoryName][assetCurrency] = 0;
    }
    categoryTotals[categoryName][assetCurrency] += userAssetValue;

    // Add to currency totals (user's portion)
    if (!currencyTotals[assetCurrency]) {
      currencyTotals[assetCurrency] = 0;
    }
    currencyTotals[assetCurrency] += userAssetValue;

    // Convert to main currency (user's portion)
    if (assetCurrency === userCurrency) {
      totalValueInMainCurrency += userAssetValue;
    } else {
      const rate = exchangeRates.find(r => r.from_currency === assetCurrency && r.to_currency === userCurrency);
      if (rate) {
        totalValueInMainCurrency += userAssetValue * rate.rate;
      }
    }
  }

  // Calculate ROI for assets with purchase price (only for assets user owns)
  const assetsWithROI = [];
  for (const asset of assetsResult.rows) {
    if (!asset.purchase_price || parseFloat(asset.purchase_price) <= 0) {
      continue;
    }

    let ownershipPercentage = 100;
    let includeAsset = true;

    // In Personal View, check ownership
    if (household_view !== 'true') {
      if (asset.user_id === req.user.id) {
        ownershipPercentage = 100;
      } else if (userMemberId && userOwnershipMap[asset.id]) {
        ownershipPercentage = userOwnershipMap[asset.id];
      } else {
        includeAsset = false;
      }
    }

    if (includeAsset) {
      assetsWithROI.push({ asset, ownershipPercentage });
    }
  }

  const totalROI = assetsWithROI.reduce((sum, { asset, ownershipPercentage }) => {
    const purchasePrice = parseFloat(asset.purchase_price);
    const currentValue = parseFloat(asset.current_value || asset.amount);
    // ROI is the same percentage regardless of ownership share
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

  // Calculate allocation by category type (only user's portion)
  const typeTotals: { [key: string]: number } = {};
  for (const asset of assetsResult.rows) {
    let ownershipPercentage = 100;
    let includeAsset = true;

    // In Personal View, calculate actual ownership percentage
    if (household_view !== 'true') {
      if (asset.user_id === req.user.id) {
        ownershipPercentage = 100;
      } else if (userMemberId && userOwnershipMap[asset.id]) {
        ownershipPercentage = userOwnershipMap[asset.id];
      } else {
        includeAsset = false;
      }
    }

    if (!includeAsset) {
      continue;
    }

    const categoryType = asset.category_type || 'other';
    const fullAssetValue = parseFloat(asset.current_value || asset.amount);
    const userAssetValue = fullAssetValue * (ownershipPercentage / 100);
    
    // Convert to main currency (user's portion)
    if (asset.currency === userCurrency) {
      typeTotals[categoryType] = (typeTotals[categoryType] || 0) + userAssetValue;
    } else {
      const rate = exchangeRates.find(r => r.from_currency === asset.currency && r.to_currency === userCurrency);
      if (rate) {
        typeTotals[categoryType] = (typeTotals[categoryType] || 0) + (userAssetValue * rate.rate);
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
      total_assets: assetsWithOwnership, // Count only assets user owns
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
    household_member_id,
    household_view = false 
  } = req.query;

  const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
  const conditions = [];
  const params = [];
  let paramCount = 1;

  // Get user's household member ID for Personal View and member filtering
  console.log('🔍 DEBUG: Starting asset query');
  console.log('🔍 DEBUG: User ID:', req.user.id);
  console.log('🔍 DEBUG: Query params:', { page, limit, category_id, currency, start_date, end_date, status, ownership_type, household_member_id, household_view });
  
  // Deep debug: Check what assets exist for this user
  const allAssetsDebug = await query(
    `SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type, a.household_id
     FROM assets a
     WHERE a.user_id = $1 OR a.household_id IN (SELECT household_id FROM users WHERE id = $1)
     ORDER BY a.id`,
    [req.user.id]
  );
  console.log('🔍 DEBUG: All assets user has access to (by user_id or household):', allAssetsDebug.rows.length);
  allAssetsDebug.rows.forEach((asset: any) => {
    console.log(`  Asset ${asset.id}: "${asset.name}", user_id=${asset.user_id}, member_id=${asset.household_member_id}, type=${asset.ownership_type}, household_id=${asset.household_id}`);
  });
  
  // Deep debug: Check shared ownership for user's household
  const userHousehold = await query('SELECT household_id FROM users WHERE id = $1', [req.user.id]);
  const householdId = userHousehold.rows[0]?.household_id;
  console.log('🔍 DEBUG: User household_id:', householdId);
  
  if (householdId) {
    const sharedOwnershipDebug = await query(
      `SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.user_id, hm.name, a.user_id as asset_user_id, a.name as asset_name
       FROM shared_ownership_distribution sod
       JOIN household_members hm ON sod.household_member_id = hm.id
       JOIN assets a ON sod.asset_id = a.id
       WHERE a.household_id = $1`,
      [householdId]
    );
    console.log('🔍 DEBUG: Shared ownership in user household:', sharedOwnershipDebug.rows.length);
    sharedOwnershipDebug.rows.forEach((row: any) => {
      console.log(`  Asset ${row.asset_id} "${row.asset_name}": member_id=${row.household_member_id} (user_id=${row.user_id}, name="${row.name}"), ${row.ownership_percentage}%, asset_user_id=${row.asset_user_id}`);
    });
    
    // Check which shared assets the user SHOULD see (via user_id lookup)
    const userSharedAssets = await query(
      `SELECT DISTINCT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
       FROM assets a
       JOIN shared_ownership_distribution sod ON sod.asset_id = a.id
       JOIN household_members hm ON sod.household_member_id = hm.id
       WHERE hm.user_id = $1 AND sod.ownership_percentage > 0`,
      [req.user.id]
    );
    console.log('🔍 DEBUG: Assets where user has shared ownership (via household_members.user_id):', userSharedAssets.rows.length);
    userSharedAssets.rows.forEach((asset: any) => {
      console.log(`  Asset ${asset.id}: "${asset.name}", user_id=${asset.user_id}, member_id=${asset.household_member_id}, type=${asset.ownership_type}`);
    });
  }
  
  const userMemberResult = await query(
    'SELECT id FROM household_members WHERE user_id = $1',
    [req.user.id]
  );
  const userMemberId = userMemberResult.rows.length > 0 ? userMemberResult.rows[0].id : null;
  console.log('🔍 DEBUG: User Member ID:', userMemberId);
  
  // Deep debug: Check what members exist
  if (householdId) {
    const allMembersDebug = await query(
      `SELECT id, name, user_id FROM household_members WHERE household_id = $1`,
      [householdId]
    );
    console.log('🔍 DEBUG: All household members:', allMembersDebug.rows.length);
    allMembersDebug.rows.forEach((member: any) => {
      console.log(`  Member ${member.id}: "${member.name}", user_id=${member.user_id}${member.user_id === req.user.id ? ' <-- THIS IS THE USER' : ''}`);
    });
    
    // Check if user has any member record
    const userAsMember = await query(
      `SELECT id, name, user_id FROM household_members WHERE user_id = $1`,
      [req.user.id]
    );
    console.log('🔍 DEBUG: User as household_member records:', userAsMember.rows.length);
    userAsMember.rows.forEach((member: any) => {
      console.log(`  Member ${member.id}: "${member.name}", user_id=${member.user_id}`);
    });
  }

  // Check if filtering by a specific member
  const memberId = household_member_id ? parseInt(household_member_id as string) : null;
  console.log('🔍 DEBUG: Filtering by member ID:', memberId);

  // Build query conditions
  console.log('🔍 DEBUG: Building conditions, household_view:', household_view);
  if (household_view === 'true' && req.user.household_id) {
    console.log('🔍 DEBUG: Using household view');
    conditions.push(`a.household_id = $${paramCount++}`);
    params.push(req.user.household_id);
  } else if (memberId && !isNaN(memberId)) {
    console.log('🔍 DEBUG: Filtering by member, memberId:', memberId);
    // When filtering by a specific member, show assets where:
    // 1. The selected member is the primary owner (household_member_id), OR
    // 2. The selected member has shared ownership (in shared_ownership_distribution)
    // AND the user also has ownership (for Personal View):
    //    - User is primary owner (user_id), OR
    //    - User's household member is primary owner (household_member_id), OR
    //    - User has shared ownership
    const memberCondition = `(a.household_member_id = $${paramCount++} OR EXISTS (
      SELECT 1 FROM shared_ownership_distribution 
      WHERE asset_id = a.id 
      AND household_member_id = $${paramCount++}
      AND ownership_percentage >= 1
    ))`;
    
    if (userMemberId) {
      // User has a household member record - check all ownership types
      const userCondition = `(a.user_id = $${paramCount++} 
        OR a.household_member_id = $${paramCount++} 
        OR EXISTS (
          SELECT 1 FROM shared_ownership_distribution sod 
          WHERE sod.asset_id = a.id 
          AND sod.household_member_id = $${paramCount++}
          AND sod.ownership_percentage > 0
        ))`;
      conditions.push(`${memberCondition} AND ${userCondition}`);
      params.push(memberId); // member filter: member is primary owner
      params.push(memberId); // member filter: member has shared ownership
      params.push(req.user.id); // user filter: user is primary owner
      params.push(userMemberId); // user filter: user's member is primary owner
      params.push(userMemberId); // user filter: user has shared ownership
      console.log('🔍 DEBUG: Member filter condition added (with userMemberId)');
      console.log('🔍 DEBUG: Member condition:', memberCondition);
      console.log('🔍 DEBUG: User condition:', userCondition);
    } else {
      // User has no household member record
      // For member filter: The selected member has ownership (via household_member_id or shared_ownership_distribution)
      // AND the user has ownership:
      //   1. User is primary owner (a.user_id), OR
      //   2. Asset is in user's household and user created it (asset ownership via user_id is sufficient)
      // Note: We can't check shared ownership via household_members.user_id because user has no member record
      // So we rely on a.user_id being the creator/owner, which gives them access to household assets
      const userCondition = `a.user_id = $${paramCount++}`;
      conditions.push(`${memberCondition} AND ${userCondition}`);
      params.push(memberId); // member filter: member is primary owner
      params.push(memberId); // member filter: member has shared ownership
      params.push(req.user.id); // user filter: user is primary owner (creator)
      console.log('🔍 DEBUG: Member filter condition added (no userMemberId, user must be asset creator)');
      console.log('🔍 DEBUG: Member condition:', memberCondition);
      console.log('🔍 DEBUG: User condition:', userCondition);
      console.log('🔍 DEBUG: NOTE - User has no household_member record, so we check a.user_id only');
    }
  } else {
    // Personal view: show assets where user is owner OR user is in shared ownership
    console.log('🔍 DEBUG: Using Personal View (no member filter)');
    if (userMemberId) {
      // Include assets where:
      // 1. User is the primary owner (by user_id), OR
      // 2. User's household member is the primary owner (by household_member_id), OR
      // 3. User is part of shared ownership distribution
      const personalViewCondition = `(a.user_id = $${paramCount++} 
        OR a.household_member_id = $${paramCount++} 
        OR EXISTS (
          SELECT 1 FROM shared_ownership_distribution sod 
          WHERE sod.asset_id = a.id 
          AND sod.household_member_id = $${paramCount++}
          AND sod.ownership_percentage > 0
        ))`;
      conditions.push(personalViewCondition);
      params.push(req.user.id);
      params.push(userMemberId);
      params.push(userMemberId);
      console.log('🔍 DEBUG: Personal View condition:', personalViewCondition);
    } else {
      // User has no household member record
      // Show assets where:
      // 1. User is primary owner (a.user_id = user.id), OR
      // 2. Asset is in user's household (via household_id) - this gives user access to household assets
      //    AND asset has shared ownership (meaning it's a shared asset the user should see)
      // Since user has no household_member record, we check household_id instead
      if (householdId) {
        const personalViewCondition = `(a.user_id = $${paramCount++} 
          OR (a.household_id = $${paramCount++} AND EXISTS (
            SELECT 1 FROM shared_ownership_distribution sod 
            WHERE sod.asset_id = a.id 
            AND sod.ownership_percentage > 0
          )))`;
        conditions.push(personalViewCondition);
        params.push(req.user.id);
        params.push(householdId);
        console.log('🔍 DEBUG: Personal View condition (no userMemberId, checking household_id for shared assets):', personalViewCondition);
      } else {
        // No household_id either - only show assets user owns
        const personalViewCondition = `a.user_id = $${paramCount++}`;
        conditions.push(personalViewCondition);
        params.push(req.user.id);
        console.log('🔍 DEBUG: Personal View condition (no userMemberId, no household_id):', personalViewCondition);
      }
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

  // Debug: Log the query and parameters for troubleshooting
  console.log('📋 Assets query conditions count:', conditions.length);
  console.log('📋 Assets query params:', params);
  console.log('📋 Assets query params count:', params.length);
  console.log('📋 Full WHERE clause:', whereClause);
  console.log('📋 User ID:', req.user.id);
  console.log('📋 User Member ID:', userMemberId);
  console.log('📋 Filtering by member:', household_member_id);
  
  // Log each condition separately
  conditions.forEach((condition, index) => {
    console.log(`📋 Condition ${index + 1}:`, condition.substring(0, 200));
  });

  // Get assets with pagination
  let assetsResult;
  try {
    const finalParams = [...params, parseInt(limit as string), offset];
    const querySql = `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
              ac.category_type, ac.icon, hm.name as member_name, u.email as user_email
       FROM assets a
       JOIN asset_categories ac ON a.category_id = ac.id
       LEFT JOIN household_members hm ON a.household_member_id = hm.id
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.date DESC, a.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`;
    console.log('📋 Final SQL Query:', querySql.substring(0, 500));
    console.log('📋 Final Query Params:', finalParams);
    
    assetsResult = await query(querySql, finalParams);
    
    console.log('📋 Assets returned:', assetsResult.rows.length);
    console.log('📋 All returned asset IDs:', assetsResult.rows.map((a: any) => a.id));
    if (assetsResult.rows.length > 0) {
      assetsResult.rows.forEach((asset: any, index: number) => {
        console.log(`📋 Asset ${index + 1}:`, {
          id: asset.id,
          name: asset.name,
          user_id: asset.user_id,
          household_member_id: asset.household_member_id,
          ownership_type: asset.ownership_type
        });
      });
    } else {
      console.log('📋 NO ASSETS RETURNED - This is the problem!');
      
      // Debug: Check what should be returned
      console.log('📋 DEBUG: Checking what assets SHOULD be returned...');
      
      // Test member condition alone
      if (memberId && !isNaN(memberId)) {
        const memberOnlyTest = await query(
          `SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
           FROM assets a
           WHERE (a.household_member_id = $1 OR EXISTS (
             SELECT 1 FROM shared_ownership_distribution 
             WHERE asset_id = a.id 
             AND household_member_id = $1
             AND ownership_percentage >= 1
           ))`,
          [memberId]
        );
        console.log(`📋 DEBUG: Assets where member ${memberId} has ownership (without user filter):`, memberOnlyTest.rows.length);
        memberOnlyTest.rows.forEach((a: any) => {
          console.log(`  - Asset ${a.id}: ${a.name}, user_id=${a.user_id}, member_id=${a.household_member_id}`);
        });
      }
      
      // Test user condition alone
      if (userMemberId) {
        const userOnlyTest = await query(
          `SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
           FROM assets a
           WHERE (a.user_id = $1 OR a.household_member_id = $2 OR EXISTS (
             SELECT 1 FROM shared_ownership_distribution sod 
             WHERE sod.asset_id = a.id 
             AND sod.household_member_id = $2
             AND sod.ownership_percentage > 0
           ))`,
          [req.user.id, userMemberId]
        );
        console.log(`📋 DEBUG: Assets where user ${req.user.id} has ownership (with userMemberId):`, userOnlyTest.rows.length);
        userOnlyTest.rows.forEach((a: any) => {
          console.log(`  - Asset ${a.id}: ${a.name}, user_id=${a.user_id}, member_id=${a.household_member_id}`);
        });
      } else {
        const userOnlyTest = await query(
          `SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
           FROM assets a
           WHERE (a.user_id = $1 OR EXISTS (
             SELECT 1 FROM shared_ownership_distribution sod 
             JOIN household_members hm ON sod.household_member_id = hm.id
             WHERE sod.asset_id = a.id 
             AND hm.user_id = $1
             AND sod.ownership_percentage > 0
           ))`,
          [req.user.id]
        );
        console.log(`📋 DEBUG: Assets where user ${req.user.id} has ownership (no userMemberId):`, userOnlyTest.rows.length);
        userOnlyTest.rows.forEach((a: any) => {
          console.log(`  - Asset ${a.id}: ${a.name}, user_id=${a.user_id}, member_id=${a.household_member_id}`);
        });
      }
    }
  } catch (error) {
    console.error('❌ Error in assets query:', error);
    throw error;
  }

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
  
  console.log('📋 Asset IDs to fetch shared ownership for:', assetIds);
  
  if (assetIds.length > 0) {
    try {
      const sharedOwnershipResult = await query(
        `SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.name as member_name, hm.relationship
         FROM shared_ownership_distribution sod
         JOIN household_members hm ON sod.household_member_id = hm.id
         WHERE sod.asset_id = ANY($1::int[])`,
        [assetIds]
      );

      console.log('📋 Shared ownership records found:', sharedOwnershipResult.rows.length);
      
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
      
      console.log('📋 Shared ownership map:', Object.keys(sharedOwnershipMap).length, 'assets with shared ownership');
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