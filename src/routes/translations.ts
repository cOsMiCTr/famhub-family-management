import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get all translations
router.get('/', asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  
  let whereClause = '';
  const params: any[] = [];
  let paramCount = 1;

  if (category) {
    whereClause += ` WHERE category = $${paramCount}`;
    params.push(category);
    paramCount++;
  }

  if (search) {
    const searchCondition = ` AND (translation_key ILIKE $${paramCount} OR en ILIKE $${paramCount} OR de ILIKE $${paramCount} OR tr ILIKE $${paramCount})`;
    whereClause += whereClause ? searchCondition : ` WHERE (translation_key ILIKE $${paramCount} OR en ILIKE $${paramCount} OR de ILIKE $${paramCount} OR tr ILIKE $${paramCount})`;
    params.push(`%${search}%`);
  }

  const translationsResult = await query(
    `SELECT id, translation_key, category, en, de, tr, created_at, updated_at 
     FROM translations 
     ${whereClause}
     ORDER BY category, translation_key`,
    params
  );

  res.json({
    translations: translationsResult.rows
  });
}));

// Get translation categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categoriesResult = await query(
    'SELECT DISTINCT category FROM translations WHERE category IS NOT NULL ORDER BY category'
  );

  res.json({
    categories: categoriesResult.rows.map(row => row.category)
  });
}));

// Update a single translation
router.put('/:id', [
  body('en').optional().isString().withMessage('English translation must be a string'),
  body('de').optional().isString().withMessage('German translation must be a string'),
  body('tr').optional().isString().withMessage('Turkish translation must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { id } = req.params;
  const { en, de, tr } = req.body;

  // Check if translation exists
  const existingTranslation = await query(
    'SELECT id FROM translations WHERE id = $1',
    [id]
  );

  if (existingTranslation.rows.length === 0) {
    throw createNotFoundError('Translation');
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: any[] = [];
  let paramCount = 1;

  if (en !== undefined) {
    updates.push(`en = $${paramCount}`);
    params.push(en);
    paramCount++;
  }

  if (de !== undefined) {
    updates.push(`de = $${paramCount}`);
    params.push(de);
    paramCount++;
  }

  if (tr !== undefined) {
    updates.push(`tr = $${paramCount}`);
    params.push(tr);
    paramCount++;
  }

  if (updates.length === 0) {
    throw createValidationError('At least one translation field must be provided');
  }

  updates.push(`updated_at = CURRENT_TIMESTAMP`);
  params.push(id);

  const result = await query(
    `UPDATE translations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    params
  );

  res.json({
    message: 'Translation updated successfully',
    translation: result.rows[0]
  });
}));

// Bulk update translations
router.put('/bulk', [
  body('translations').isArray().withMessage('Translations must be an array'),
  body('translations.*.id').isInt().withMessage('Translation ID must be an integer'),
  body('translations.*.en').optional().isString().withMessage('English translation must be a string'),
  body('translations.*.de').optional().isString().withMessage('German translation must be a string'),
  body('translations.*.tr').optional().isString().withMessage('Turkish translation must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { translations } = req.body;
  const updatedTranslations = [];

  for (const translation of translations) {
    const { id, en, de, tr } = translation;

    // Check if translation exists
    const existingTranslation = await query(
      'SELECT id FROM translations WHERE id = $1',
      [id]
    );

    if (existingTranslation.rows.length === 0) {
      continue; // Skip non-existent translations
    }

    // Build update query dynamically
    const updates: string[] = [];
    const params: any[] = [];
    let paramCount = 1;

    if (en !== undefined) {
      updates.push(`en = $${paramCount}`);
      params.push(en);
      paramCount++;
    }

    if (de !== undefined) {
      updates.push(`de = $${paramCount}`);
      params.push(de);
      paramCount++;
    }

    if (tr !== undefined) {
      updates.push(`tr = $${paramCount}`);
      params.push(tr);
      paramCount++;
    }

    if (updates.length > 0) {
      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(id);

      const result = await query(
        `UPDATE translations SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`,
        params
      );

      updatedTranslations.push(result.rows[0]);
    }
  }

  res.json({
    message: `${updatedTranslations.length} translations updated successfully`,
    translations: updatedTranslations
  });
}));

// Sync translations from database to JSON files (for development)
router.post('/sync', asyncHandler(async (req, res) => {
  const translationsResult = await query(
    'SELECT translation_key, category, en, de, tr FROM translations ORDER BY category, translation_key'
  );

  // Group translations by category
  const translationsByCategory: any = {};
  
  translationsResult.rows.forEach(row => {
    if (!translationsByCategory[row.category]) {
      translationsByCategory[row.category] = {};
    }
    
    translationsByCategory[row.category][row.translation_key] = {
      en: row.en,
      de: row.de || row.en,
      tr: row.tr || row.en
    };
  });

  res.json({
    message: 'Translations synced successfully',
    translations: translationsByCategory
  });
}));

export default router;
