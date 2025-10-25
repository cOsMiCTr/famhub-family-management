import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get all asset categories
router.get('/', asyncHandler(async (req, res) => {
  const categoriesResult = await query(
    `SELECT ac.*, COUNT(a.id) as asset_count
     FROM asset_categories ac
     LEFT JOIN assets a ON ac.id = a.category_id
     GROUP BY ac.id
     ORDER BY ac.is_default DESC, ac.name_en ASC`
  );

  res.json(categoriesResult.rows);
}));

// Create new asset category (Admin only)
router.post('/', requireAdmin, [
  body('name_en').trim().notEmpty().withMessage('English name is required'),
  body('name_de').trim().notEmpty().withMessage('German name is required'),
  body('name_tr').trim().notEmpty().withMessage('Turkish name is required'),
  body('type').isIn(['income', 'expense']).withMessage('Invalid type'),
  body('category_type').optional().isIn(['real_estate', 'stocks', 'etf', 'bonds', 'crypto', 'gold', 'vehicles', 'collectibles', 'cash', 'other']).withMessage('Invalid category type'),
  body('icon').optional().isLength({ max: 50 }).withMessage('Icon name too long'),
  body('requires_ticker').optional().isBoolean().withMessage('requires_ticker must be boolean'),
  body('depreciation_enabled').optional().isBoolean().withMessage('depreciation_enabled must be boolean'),
  body('is_default').optional().isBoolean().withMessage('is_default must be boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { 
    name_en, 
    name_de, 
    name_tr, 
    type, 
    category_type, 
    icon, 
    requires_ticker, 
    depreciation_enabled, 
    is_default 
  } = req.body;

  // Check if category with same name already exists
  const existingCategory = await query(
    'SELECT id FROM asset_categories WHERE name_en = $1 OR name_de = $2 OR name_tr = $3',
    [name_en, name_de, name_tr]
  );

  if (existingCategory.rows.length > 0) {
    throw createValidationError('Category with this name already exists');
  }

  const result = await query(
    `INSERT INTO asset_categories (name_en, name_de, name_tr, type, category_type, icon, requires_ticker, depreciation_enabled, is_default)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      name_en, 
      name_de, 
      name_tr, 
      type, 
      category_type || 'other', 
      icon || null, 
      requires_ticker || false, 
      depreciation_enabled || false, 
      is_default || false
    ]
  );

  res.status(201).json({
    message: 'Asset category created successfully',
    category: result.rows[0]
  });
}));

// Get asset category by ID
router.get('/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const categoryResult = await query(
    'SELECT * FROM asset_categories WHERE id = $1',
    [id]
  );

  if (categoryResult.rows.length === 0) {
    throw createNotFoundError('Asset category');
  }

  res.json({
    category: categoryResult.rows[0]
  });
}));

// Update asset category (Admin only)
router.put('/:id', requireAdmin, [
  body('name_en').optional().trim().notEmpty().withMessage('English name cannot be empty'),
  body('name_de').optional().trim().notEmpty().withMessage('German name cannot be empty'),
  body('name_tr').optional().trim().notEmpty().withMessage('Turkish name cannot be empty'),
  body('type').optional().isIn(['income', 'expense']).withMessage('Invalid type'),
  body('category_type').optional().isIn(['real_estate', 'stocks', 'etf', 'bonds', 'crypto', 'gold', 'vehicles', 'collectibles', 'cash', 'other']).withMessage('Invalid category type'),
  body('icon').optional().isLength({ max: 50 }).withMessage('Icon name too long'),
  body('requires_ticker').optional().isBoolean().withMessage('requires_ticker must be boolean'),
  body('depreciation_enabled').optional().isBoolean().withMessage('depreciation_enabled must be boolean'),
  body('is_default').optional().isBoolean().withMessage('is_default must be boolean')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { id } = req.params;
  const updateData = req.body;

  // Check if category exists
  const existingCategory = await query(
    'SELECT * FROM asset_categories WHERE id = $1',
    [id]
  );

  if (existingCategory.rows.length === 0) {
    throw createNotFoundError('Asset category');
  }

  // Check if new names conflict with existing categories (excluding current one)
  if (updateData.name_en || updateData.name_de || updateData.name_tr) {
    const conflictQuery = `
      SELECT id FROM asset_categories 
      WHERE id != $1 AND (
        ${updateData.name_en ? 'name_en = $2' : 'false'} OR
        ${updateData.name_de ? 'name_de = $3' : 'false'} OR
        ${updateData.name_tr ? 'name_tr = $4' : 'false'}
      )
    `;
    
    const conflictParams = [id];
    if (updateData.name_en) conflictParams.push(updateData.name_en);
    if (updateData.name_de) conflictParams.push(updateData.name_de);
    if (updateData.name_tr) conflictParams.push(updateData.name_tr);

    const conflictResult = await query(conflictQuery, conflictParams);
    
    if (conflictResult.rows.length > 0) {
      throw createValidationError('Category with this name already exists');
    }
  }

  // Build update query
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  const allowedFields = [
    'name_en', 'name_de', 'name_tr', 'type', 'category_type', 
    'icon', 'requires_ticker', 'depreciation_enabled', 'is_default'
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

  const result = await query(
    `UPDATE asset_categories SET ${updateFields.join(', ')} WHERE id = $${paramCount++} RETURNING *`,
    [...updateValues, id]
  );

  res.json({
    message: 'Asset category updated successfully',
    category: result.rows[0]
  });
}));

// Delete asset category (Admin only)
router.delete('/:id', requireAdmin, asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if category exists
  const categoryResult = await query(
    'SELECT * FROM asset_categories WHERE id = $1',
    [id]
  );

  if (categoryResult.rows.length === 0) {
    throw createNotFoundError('Asset category');
  }

  const category = categoryResult.rows[0];

  // Check if it's a default category
  if (category.is_default) {
    throw createValidationError('Cannot delete default category');
  }

  // Check if category has associated assets
  const assetsCount = await query(
    'SELECT COUNT(*) as count FROM assets WHERE category_id = $1',
    [id]
  );

  if (parseInt(assetsCount.rows[0].count) > 0) {
    throw createValidationError('Cannot delete category with associated assets');
  }

  await query('DELETE FROM asset_categories WHERE id = $1', [id]);

  res.json({
    message: 'Asset category deleted successfully'
  });
}));

export default router;
