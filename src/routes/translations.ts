import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createNotFoundError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Get all translations (public endpoint for frontend loading)
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
    const searchCondition = ` AND (translation_key ILIKE $${paramCount} OR en ILIKE $${paramCount})`;
    whereClause += whereClause ? searchCondition : ` WHERE (translation_key ILIKE $${paramCount} OR en ILIKE $${paramCount})`;
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

// Re-seed translations from seedTranslations.ts (PUBLIC - no auth required for seeding)
router.post('/reseed', asyncHandler(async (req, res) => {
  console.log('🌱 Re-seeding translations...');
  
  try {
    const { default: seedTranslations } = await import('../migrations/seedTranslations');
    await seedTranslations();
    
    res.json({
      message: 'Translations re-seeded successfully'
    });
  } catch (error: any) {
    console.error('❌ Failed to re-seed translations:', error);
    res.status(500).json({
      error: 'Failed to re-seed translations',
      details: error.message
    });
  }
}));

// Apply authentication and admin middleware to management routes
router.use(authenticateToken);
router.use(requireAdmin);

// Get translation categories
router.get('/categories', asyncHandler(async (req, res) => {
  const categoriesResult = await query(
    'SELECT DISTINCT category FROM translations WHERE category IS NOT NULL ORDER BY category'
  );

  res.json({
    categories: categoriesResult.rows.map(row => row.category)
  });
}));

// Test endpoint to debug bulk update
router.post('/test-bulk', asyncHandler(async (req, res) => {
  console.log('=== BULK UPDATE DEBUG ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  
  const { translations } = req.body;
  
  if (!Array.isArray(translations)) {
    return res.status(400).json({ error: 'Translations must be an array' });
  }
  
  console.log('Translations array length:', translations.length);
  
  for (let i = 0; i < translations.length; i++) {
    const translation = translations[i];
    console.log(`\n--- Translation ${i + 1} ---`);
    console.log('ID:', translation.id, 'Type:', typeof translation.id);
    console.log('EN:', translation.en, 'Type:', typeof translation.en);
    console.log('DE:', translation.de, 'Type:', typeof translation.de);
    console.log('TR:', translation.tr, 'Type:', typeof translation.tr);
    
    // Test individual update
    try {
      const testQuery = `
        UPDATE translations 
        SET en = $1, de = $2, tr = $3, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $4 
        RETURNING id, en, de, tr
      `;
      
      const result = await query(testQuery, [
        translation.en || '',
        translation.de || '',
        translation.tr || '',
        translation.id
      ]);
      
      console.log('✅ Update successful:', result.rows[0]);
    } catch (error) {
      console.log('❌ Update failed:', error);
    }
  }
  
  res.json({ message: 'Debug test completed', translations: translations.length });
}));

// Create new translation
router.post('/', [
  body('translation_key').notEmpty().withMessage('Translation key is required'),
  body('category').notEmpty().withMessage('Category is required'),
  body('en').notEmpty().withMessage('English translation is required'),
  body('de').optional().isString(),
  body('tr').optional().isString()
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { translation_key, category, en, de, tr } = req.body;

  // Check if key already exists
  const existing = await query(
    'SELECT id FROM translations WHERE translation_key = $1',
    [translation_key]
  );

  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'Translation key already exists' });
  }

  const result = await query(
    `INSERT INTO translations (translation_key, category, en, de, tr)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [translation_key, category, en, de || '', tr || '']
  );

  res.status(201).json({
    message: 'Translation created successfully',
    translation: result.rows[0]
  });
}));

// Bulk update translations - MUST come before /:id route
router.put('/bulk', [
  body('translations').isArray().withMessage('Translations must be an array'),
  body('translations.*.id').isInt().withMessage('Translation ID must be an integer'),
  body('translations.*.en').optional().isString().withMessage('English translation must be a string'),
  body('translations.*.de').optional().isString().withMessage('German translation must be a string'),
  body('translations.*.tr').optional().isString().withMessage('Turkish translation must be a string')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.log('Validation errors:', errors.array());
    throw createValidationError('Invalid input data');
  }

  const { translations } = req.body;
  console.log('Bulk update request:', JSON.stringify(req.body, null, 2));
  
  const updatedTranslations = [];

  for (const translation of translations) {
    const { id, en, de, tr } = translation;
    
    console.log(`Processing translation ID ${id}:`, { en, de, tr });

    // Validate ID is a number
    const translationId = parseInt(id);
    if (isNaN(translationId)) {
      console.log(`Skipping invalid ID: ${id}`);
      continue;
    }

    // Check if translation exists
    const existingTranslation = await query(
      'SELECT id FROM translations WHERE id = $1',
      [translationId]
    );

    if (existingTranslation.rows.length === 0) {
      console.log(`Translation ID ${translationId} not found, skipping`);
      continue;
    }

    // Simple update with only provided fields
    try {
      // Build dynamic update query to only update provided fields
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
        console.log(`No fields to update for translation ID ${translationId}`);
        continue;
      }

      updates.push(`updated_at = CURRENT_TIMESTAMP`);
      params.push(translationId);

      const result = await query(
        `UPDATE translations 
         SET ${updates.join(', ')} 
         WHERE id = $${paramCount} 
         RETURNING id, translation_key, category, en, de, tr, created_at, updated_at`,
        params
      );

      console.log(`✅ Updated translation ID ${translationId}:`, result.rows[0]);
      updatedTranslations.push(result.rows[0]);
    } catch (error) {
      console.log(`❌ Failed to update translation ID ${translationId}:`, error);
    }
  }

  console.log(`Bulk update completed: ${updatedTranslations.length} translations updated`);

  res.json({
    message: `${updatedTranslations.length} translations updated successfully`,
    translations: updatedTranslations
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
