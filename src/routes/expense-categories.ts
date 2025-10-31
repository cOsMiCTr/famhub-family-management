import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = express.Router();

// Public route - Get all expense categories with expense counts
router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT ec.*, 
              COALESCE(expense_counts.count, 0) as expense_count,
              ec.parent_category_id
       FROM expense_categories ec
       LEFT JOIN (
         SELECT category_id, COUNT(*) as count
         FROM expenses
         GROUP BY category_id
       ) expense_counts ON ec.id = expense_counts.category_id
       ORDER BY ec.is_default DESC, ec.parent_category_id NULLS FIRST, ec.display_order ASC, ec.name_en ASC`
    );

    // Organize into hierarchical structure
    const categories = result.rows;
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map of all categories
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, subcategories: [] });
    });

    // Second pass: build hierarchy
    categories.forEach(cat => {
      if (cat.parent_category_id) {
        const parent = categoryMap.get(cat.parent_category_id);
        if (parent) {
          parent.subcategories.push(categoryMap.get(cat.id));
        }
      } else {
        rootCategories.push(categoryMap.get(cat.id));
      }
    });

    res.json(rootCategories);
  } catch (error) {
    console.error('Error fetching expense categories:', error);
    res.status(500).json({ error: 'Failed to fetch expense categories' });
  }
});

// GET /api/expense-categories/:id/subcategories
// Get subcategories for a specific category
router.get('/:id/subcategories', async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    
    const result = await query(
      `SELECT ec.*, 
              COALESCE(expense_counts.count, 0) as expense_count
       FROM expense_categories ec
       LEFT JOIN (
         SELECT category_id, COUNT(*) as count
         FROM expenses
         GROUP BY category_id
       ) expense_counts ON ec.id = expense_counts.category_id
       WHERE ec.parent_category_id = $1
       ORDER BY ec.display_order ASC, ec.name_en ASC`,
      [categoryId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching subcategories:', error);
    res.status(500).json({ error: 'Failed to fetch subcategories' });
  }
});

// Admin-only routes
router.use(authenticateToken);
router.use(requireAdmin);

// Create new expense category (admin only)
router.post('/',
  [
    body('name_en').trim().notEmpty().withMessage('English name is required'),
    body('name_de').trim().notEmpty().withMessage('German name is required'),
    body('name_tr').trim().notEmpty().withMessage('Turkish name is required'),
    body('category_type').optional().isIn(['gift', 'credit', 'bill', 'tax', 'insurance', 'subscription', 'school', 'bausparvertrag', 'other']),
    body('has_custom_form').optional().isBoolean(),
    body('requires_asset_link').optional().isBoolean(),
    body('requires_member_link').optional().isBoolean(),
    body('allows_multiple_members').optional().isBoolean()
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
        category_type,
        has_custom_form,
        requires_asset_link,
        requires_member_link,
        allows_multiple_members,
        parent_category_id,
        display_order
      } = req.body;

      // Validate parent_category_id if provided
      if (parent_category_id) {
        const parentCheck = await query('SELECT id FROM expense_categories WHERE id = $1', [parent_category_id]);
        if (parentCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Parent category not found' });
        }
      }

      const result = await query(
        `INSERT INTO expense_categories 
         (name_en, name_de, name_tr, is_default, category_type, has_custom_form, 
          requires_asset_link, requires_member_link, allows_multiple_members, parent_category_id, display_order)
         VALUES ($1, $2, $3, false, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          name_en, 
          name_de, 
          name_tr,
          category_type || null,
          has_custom_form || false,
          requires_asset_link || false,
          requires_member_link || false,
          allows_multiple_members || false,
          parent_category_id || null,
          display_order || 0
        ]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating expense category:', error);
      res.status(500).json({ error: 'Failed to create expense category' });
    }
  }
);

// Update expense category (admin only)
router.put('/:id',
  [
    param('id').isInt().withMessage('Invalid category ID'),
    body('name_en').optional().trim().notEmpty(),
    body('name_de').optional().trim().notEmpty(),
    body('name_tr').optional().trim().notEmpty(),
    body('category_type').optional().isIn(['gift', 'credit', 'bill', 'tax', 'insurance', 'subscription', 'school', 'bausparvertrag', 'other']),
    body('has_custom_form').optional().isBoolean(),
    body('requires_asset_link').optional().isBoolean(),
    body('requires_member_link').optional().isBoolean(),
    body('allows_multiple_members').optional().isBoolean(),
    body('parent_category_id').optional().isInt(),
    body('display_order').optional().isInt()
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
        category_type,
        has_custom_form,
        requires_asset_link,
        requires_member_link,
        allows_multiple_members,
        parent_category_id,
        display_order
      } = req.body;

      // Validate parent_category_id if provided (and not self)
      if (parent_category_id !== undefined) {
        if (parent_category_id === parseInt(categoryId)) {
          return res.status(400).json({ error: 'Category cannot be its own parent' });
        }
        if (parent_category_id !== null) {
          const parentCheck = await query('SELECT id FROM expense_categories WHERE id = $1', [parent_category_id]);
          if (parentCheck.rows.length === 0) {
            return res.status(400).json({ error: 'Parent category not found' });
          }
        }
      }

      // Check if category exists
      const checkResult = await query('SELECT * FROM expense_categories WHERE id = $1', [categoryId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense category not found' });
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
      if (category_type !== undefined) {
        updateFields.push(`category_type = $${valueIndex++}`);
        updateValues.push(category_type || null);
      }
      if (has_custom_form !== undefined) {
        updateFields.push(`has_custom_form = $${valueIndex++}`);
        updateValues.push(has_custom_form);
      }
      if (requires_asset_link !== undefined) {
        updateFields.push(`requires_asset_link = $${valueIndex++}`);
        updateValues.push(requires_asset_link);
      }
      if (requires_member_link !== undefined) {
        updateFields.push(`requires_member_link = $${valueIndex++}`);
        updateValues.push(requires_member_link);
      }
      if (allows_multiple_members !== undefined) {
        updateFields.push(`allows_multiple_members = $${valueIndex++}`);
        updateValues.push(allows_multiple_members);
      }
      if (parent_category_id !== undefined) {
        updateFields.push(`parent_category_id = $${valueIndex++}`);
        updateValues.push(parent_category_id || null);
      }
      if (display_order !== undefined) {
        updateFields.push(`display_order = $${valueIndex++}`);
        updateValues.push(display_order);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateValues.push(categoryId);

      const result = await query(
        `UPDATE expense_categories 
         SET ${updateFields.join(', ')}
         WHERE id = $${valueIndex}
         RETURNING *`,
        updateValues
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating expense category:', error);
      res.status(500).json({ error: 'Failed to update expense category' });
    }
  }
);

// Delete expense category (admin only)
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
      const checkResult = await query('SELECT * FROM expense_categories WHERE id = $1', [categoryId]);
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense category not found' });
      }

      if (checkResult.rows[0].is_default) {
        return res.status(400).json({ error: 'Cannot delete default expense category' });
      }

      // Check for dependencies
      const expenseCheck = await query(
        'SELECT COUNT(*) as count FROM expenses WHERE category_id = $1',
        [categoryId]
      );

      const expenseCount = parseInt(expenseCheck.rows[0].count);

      if (expenseCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete category with assigned expense entries',
          dependencies: { expenses: expenseCount }
        });
      }

      // Delete category
      await query('DELETE FROM expense_categories WHERE id = $1', [categoryId]);

      res.json({ message: 'Expense category deleted successfully' });
    } catch (error) {
      console.error('Error deleting expense category:', error);
      res.status(500).json({ error: 'Failed to delete expense category' });
    }
  }
);

export default router;

