import express, { Request, Response } from 'express';
import { body, param } from 'express-validator';
import { pool } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validationResult } from 'express-validator';

const router = express.Router();

// GET /api/currencies - List all currencies (with optional filters)
// Returns all currencies (active and inactive) for authenticated users
router.get('/', authenticateToken, asyncHandler(async (req: Request, res: Response) => {
  const { type, active } = req.query;
  
  let query = 'SELECT * FROM currencies WHERE 1=1';
  const params: any[] = [];
  let paramIndex = 1;
  
  if (type) {
    query += ` AND currency_type = $${paramIndex}`;
    params.push(type);
    paramIndex++;
  }
  
  // Default to active=true if not specified, so all users see active currencies
  if (active !== undefined) {
    query += ` AND is_active = $${paramIndex}`;
    params.push(active === 'true');
    paramIndex++;
  } else {
    // By default, show active currencies for regular listing
    query += ` AND is_active = $${paramIndex}`;
    params.push(true);
    paramIndex++;
  }
  
  query += ' ORDER BY display_order ASC, code ASC';
  
  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// GET /api/currencies/active - List only active currencies (public endpoint)
router.get('/active', asyncHandler(async (req: Request, res: Response) => {
  const { type } = req.query;
  
  let query = 'SELECT * FROM currencies WHERE is_active = true';
  const params: any[] = [];
  
  if (type) {
    query += ' AND currency_type = $1';
    params.push(type);
  }
  
  query += ' ORDER BY display_order ASC, code ASC';
  
  const result = await pool.query(query, params);
  res.json(result.rows);
}));

// GET /api/currencies/:id - Get single currency
router.get('/:id', authenticateToken, [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const result = await pool.query('SELECT * FROM currencies WHERE id = $1', [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Currency not found' });
  }
  
  res.json(result.rows[0]);
}));

// POST /api/currencies - Create new currency (admin only)
router.post('/', [authenticateToken, requireAdmin], [
  body('code').trim().notEmpty().isLength({ min: 3, max: 10 }).matches(/^[A-Z0-9]+$/).withMessage('Valid currency code required (3-10 uppercase alphanumeric characters)'),
  body('name').trim().notEmpty().isLength({ max: 100 }).withMessage('Currency name is required (max 100 characters)'),
  body('name_de').optional().trim().isLength({ max: 100 }),
  body('name_tr').optional().trim().isLength({ max: 100 }),
  body('symbol').trim().notEmpty().isLength({ max: 10 }).withMessage('Symbol is required (max 10 characters)'),
  body('currency_type').isIn(['fiat', 'cryptocurrency', 'precious_metal']).withMessage('Invalid currency type'),
  body('is_active').optional().isBoolean(),
  body('display_order').optional().isInt()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { code, name, name_de, name_tr, symbol, currency_type, is_active = true, display_order = 0 } = req.body;
  
  // Check if code already exists
  const existingCheck = await pool.query('SELECT id FROM currencies WHERE code = $1', [code]);
  if (existingCheck.rows.length > 0) {
    return res.status(409).json({ error: 'Currency code already exists' });
  }
  
  // Get the next display order if not provided
  let finalDisplayOrder = display_order;
  if (display_order === 0) {
    const maxOrderResult = await pool.query('SELECT MAX(display_order) as max_order FROM currencies WHERE currency_type = $1', [currency_type]);
    finalDisplayOrder = (maxOrderResult.rows[0].max_order || 0) + 1;
  }
  
  const result = await pool.query(`
    INSERT INTO currencies (code, name, name_de, name_tr, symbol, currency_type, is_active, display_order)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *
  `, [code.toUpperCase(), name, name_de || null, name_tr || null, symbol, currency_type, is_active, finalDisplayOrder]);
  
  res.status(201).json(result.rows[0]);
}));

// PUT /api/currencies/:id - Update currency (admin only)
router.put('/:id', [authenticateToken, requireAdmin], [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required'),
  body('name').optional().trim().notEmpty().isLength({ max: 100 }),
  body('name_de').optional().trim().isLength({ max: 100 }),
  body('name_tr').optional().trim().isLength({ max: 100 }),
  body('symbol').optional().trim().notEmpty().isLength({ max: 10 }),
  body('currency_type').optional().isIn(['fiat', 'cryptocurrency', 'precious_metal']),
  body('is_active').optional().isBoolean(),
  body('display_order').optional().isInt()
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  const { name, name_de, name_tr, symbol, currency_type, is_active, display_order } = req.body;
  
  // Check if currency exists
  const existingCheck = await pool.query('SELECT id FROM currencies WHERE id = $1', [id]);
  if (existingCheck.rows.length === 0) {
    return res.status(404).json({ error: 'Currency not found' });
  }
  
  // Build update query dynamically
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;
  
  if (name !== undefined) {
    updates.push(`name = $${paramIndex}`);
    values.push(name);
    paramIndex++;
  }
  if (name_de !== undefined) {
    updates.push(`name_de = $${paramIndex}`);
    values.push(name_de);
    paramIndex++;
  }
  if (name_tr !== undefined) {
    updates.push(`name_tr = $${paramIndex}`);
    values.push(name_tr);
    paramIndex++;
  }
  if (symbol !== undefined) {
    updates.push(`symbol = $${paramIndex}`);
    values.push(symbol);
    paramIndex++;
  }
  if (currency_type !== undefined) {
    updates.push(`currency_type = $${paramIndex}`);
    values.push(currency_type);
    paramIndex++;
  }
  if (is_active !== undefined) {
    updates.push(`is_active = $${paramIndex}`);
    values.push(is_active);
    paramIndex++;
  }
  if (display_order !== undefined) {
    updates.push(`display_order = $${paramIndex}`);
    values.push(display_order);
    paramIndex++;
  }
  
  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  
  if (updates.length === 1) { // Only updated_at was added
    return res.status(400).json({ error: 'No fields to update' });
  }
  
  values.push(id);
  const query = `UPDATE currencies SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
  
  const result = await pool.query(query, values);
  res.json(result.rows[0]);
}));

// PATCH /api/currencies/:id/toggle - Toggle active status (admin only)
router.patch('/:id/toggle', [authenticateToken, requireAdmin], [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  
  const result = await pool.query(`
    UPDATE currencies 
    SET is_active = NOT is_active, updated_at = CURRENT_TIMESTAMP 
    WHERE id = $1 
    RETURNING *
  `, [id]);
  
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'Currency not found' });
  }
  
  res.json(result.rows[0]);
}));

// DELETE /api/currencies/:id - Delete currency (admin only)
router.delete('/:id', [authenticateToken, requireAdmin], [
  param('id').isInt({ min: 1 }).withMessage('Valid ID required')
], asyncHandler(async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  const { id } = req.params;
  
  // Check if currency is in use in assets or income tables
  const assetsCheck = await pool.query('SELECT COUNT(*) as count FROM assets WHERE currency = (SELECT code FROM currencies WHERE id = $1)', [id]);
  const incomeCheck = await pool.query('SELECT COUNT(*) as count FROM income WHERE currency = (SELECT code FROM currencies WHERE id = $1)', [id]);
  
  const assetsCount = parseInt(assetsCheck.rows[0].count);
  const incomeCount = parseInt(incomeCheck.rows[0].count);
  
  if (assetsCount > 0 || incomeCount > 0) {
    return res.status(409).json({ 
      error: 'Cannot delete currency because it is in use',
      usage: {
        assets: assetsCount,
        income: incomeCount
      }
    });
  }
  
  await pool.query('DELETE FROM currencies WHERE id = $1', [id]);
  res.status(204).send();
}));

export default router;

