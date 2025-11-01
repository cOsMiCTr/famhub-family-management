import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Public route - Get all income categories with income counts
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT ic.*, 
              COALESCE(income_counts.count, 0) as income_count
       FROM income_categories ic
       LEFT JOIN (
         SELECT category_id, COUNT(*) as count
         FROM income
         GROUP BY category_id
       ) income_counts ON ic.id = income_counts.category_id
       ORDER BY ic.is_default DESC, ic.name_en ASC`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching income categories:', error);
    res.status(500).json({ error: 'Failed to fetch income categories' });
  }
});

// Admin-only routes
router.use(authenticateToken);
router.use(requireAdmin);

// Create new income category (admin only)
router.post('/',
  [
    body('name_en').trim().notEmpty().withMessage('English name is required'),
    body('name_de').trim().notEmpty().withMessage('German name is required'),
    body('name_tr').trim().notEmpty().withMessage('Turkish name is required'),
    body('allow_sharing_with_external_persons').optional().isBoolean(),
    body('field_requirements').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { 
        name_en, 
        name_de, 
        name_tr,
        allow_sharing_with_external_persons,
        field_requirements
      } = req.body;

      // Prepare field_requirements JSON
      const fieldRequirementsJson = field_requirements && typeof field_requirements === 'object' 
        ? JSON.stringify(field_requirements) 
        : null;

      const result = await query(
        `INSERT INTO income_categories (name_en, name_de, name_tr, is_default, allow_sharing_with_external_persons, field_requirements)
         VALUES ($1, $2, $3, false, $4, $5)
         RETURNING *`,
        [
          name_en, 
          name_de, 
          name_tr,
          allow_sharing_with_external_persons !== undefined ? allow_sharing_with_external_persons : true,
          fieldRequirementsJson
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating income category:', error);
      res.status(500).json({ error: 'Failed to create income category' });
    }
  }
);

// Update income category (admin only)
router.put('/:id',
  [
    param('id').isInt().withMessage('Invalid category ID'),
    body('name_en').optional().trim().notEmpty(),
    body('name_de').optional().trim().notEmpty(),
    body('name_tr').optional().trim().notEmpty(),
    body('allow_sharing_with_external_persons').optional().isBoolean(),
    body('field_requirements').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const categoryId = req.params.id;
      const { 
        name_en, 
        name_de, 
        name_tr,
        allow_sharing_with_external_persons,
        field_requirements
      } = req.body;

      // Check if category exists
      const checkResult = await query('SELECT * FROM income_categories WHERE id = $1', [categoryId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Income category not found' });
      }

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      if (name_en !== undefined) {
        updateFields.push(`name_en = $${valueIndex++}`);
        updateValues.push(name_en);
      }
      if (name_de !== undefined) {
        updateFields.push(`name_de = $${valueIndex++}`);
        updateValues.push(name_de);
      }
      if (name_tr !== undefined) {
        updateFields.push(`name_tr = $${valueIndex++}`);
        updateValues.push(name_tr);
      }
      if (allow_sharing_with_external_persons !== undefined) {
        updateFields.push(`allow_sharing_with_external_persons = $${valueIndex++}`);
        updateValues.push(allow_sharing_with_external_persons);
      }
      if (field_requirements !== undefined) {
        const fieldRequirementsJson = field_requirements && typeof field_requirements === 'object' 
          ? JSON.stringify(field_requirements) 
          : null;
        updateFields.push(`field_requirements = $${valueIndex++}`);
        updateValues.push(fieldRequirementsJson);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateValues.push(categoryId);

      const result = await query(
        `UPDATE income_categories 
         SET ${updateFields.join(', ')}
         WHERE id = $${valueIndex}
         RETURNING *`,
        updateValues
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating income category:', error);
      res.status(500).json({ error: 'Failed to update income category' });
    }
  }
);

// Delete income category (admin only)
router.delete('/:id',
  [param('id').isInt().withMessage('Invalid category ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const categoryId = req.params.id;

      // Check if category exists and is not default
      const checkResult = await query('SELECT * FROM income_categories WHERE id = $1', [categoryId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Income category not found' });
      }

      if (checkResult.rows[0].is_default) {
        return res.status(400).json({ error: 'Cannot delete default income category' });
      }

      // Check for dependencies
      const incomeCheck = await query(
        'SELECT COUNT(*) as count FROM income WHERE category_id = $1',
        [categoryId]
      );

      const incomeCount = parseInt(incomeCheck.rows[0].count);

      if (incomeCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete category with assigned income entries',
          dependencies: { income: incomeCount }
        });
      }

      // Delete category
      await query('DELETE FROM income_categories WHERE id = $1', [categoryId]);

      res.json({ message: 'Income category deleted successfully' });
    } catch (error) {
      console.error('Error deleting income category:', error);
      res.status(500).json({ error: 'Failed to delete income category' });
    }
  }
);

export default router;

