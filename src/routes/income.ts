import express from 'express';
import { body, param, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Helper function to log income changes
async function logIncomeChange(
  incomeId: number,
  userId: number,
  changeType: 'created' | 'updated' | 'deleted',
  oldValues: any = null,
  newValues: any = null
) {
  try {
    await query(
      `INSERT INTO income_history (income_id, changed_by_user_id, change_type, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [incomeId, userId, changeType, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
    );
  } catch (error) {
    console.error('Error logging income change:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

// Get all income with filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { start_date, end_date, member_id, category_id, is_recurring } = req.query;

    // Get user's household_id
    const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
    const householdId = userResult.rows[0]?.household_id;

    if (!householdId) {
      return res.status(400).json({ error: 'User is not assigned to a household' });
    }

    // Build query with filters
    let queryText = `
      SELECT i.*, 
             ic.name_en as category_name_en,
             ic.name_de as category_name_de,
             ic.name_tr as category_name_tr,
             hm.name as member_name,
             hm.is_shared as member_is_shared,
             u.email as creator_email
      FROM income i
      LEFT JOIN income_categories ic ON i.category_id = ic.id
      LEFT JOIN household_members hm ON i.household_member_id = hm.id
      LEFT JOIN users u ON i.created_by_user_id = u.id
      WHERE i.household_id = $1
    `;
    
    const queryParams: any[] = [householdId];
    let paramIndex = 2;

    // Filter by date range (checks if income period overlaps with search range)
    if (start_date) {
      queryText += ` AND (i.end_date IS NULL OR i.end_date >= $${paramIndex})`;
      queryParams.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      queryText += ` AND i.start_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // Filter by household member
    if (member_id) {
      queryText += ` AND i.household_member_id = $${paramIndex}`;
      queryParams.push(member_id);
      paramIndex++;
    }

    // Filter by category
    if (category_id) {
      queryText += ` AND i.category_id = $${paramIndex}`;
      queryParams.push(category_id);
      paramIndex++;
    }

    // Filter by recurring status
    if (is_recurring !== undefined) {
      queryText += ` AND i.is_recurring = $${paramIndex}`;
      queryParams.push(is_recurring === 'true');
      paramIndex++;
    }

    queryText += ' ORDER BY i.start_date DESC, i.created_at DESC';

    const result = await query(queryText, queryParams);

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching income:', error);
    res.status(500).json({ error: 'Failed to fetch income' });
  }
});

// Get income summary (totals by period, member, category)
router.get('/summary', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { start_date, end_date, group_by } = req.query;

    // Get user's household_id
    const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
    const householdId = userResult.rows[0]?.household_id;

    if (!householdId) {
      return res.status(400).json({ error: 'User is not assigned to a household' });
    }

    // Base query
    let baseQuery = `
      FROM income i
      LEFT JOIN income_categories ic ON i.category_id = ic.id
      LEFT JOIN household_members hm ON i.household_member_id = hm.id
      WHERE i.household_id = $1
    `;
    const queryParams: any[] = [householdId];
    let paramIndex = 2;

    // Add date filters
    if (start_date) {
      baseQuery += ` AND (i.end_date IS NULL OR i.end_date >= $${paramIndex})`;
      queryParams.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      baseQuery += ` AND i.start_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // Get total
    const totalResult = await query(
      `SELECT 
        SUM(i.amount) as total,
        COUNT(*) as count
       ${baseQuery}`,
      queryParams
    );

    // Get breakdown by group
    let breakdownResult;
    if (group_by === 'member') {
      breakdownResult = await query(
        `SELECT 
          hm.id as member_id,
          hm.name as member_name,
          hm.is_shared,
          SUM(i.amount) as total,
          COUNT(*) as count
         ${baseQuery}
         GROUP BY hm.id, hm.name, hm.is_shared
         ORDER BY total DESC`,
        queryParams
      );
    } else if (group_by === 'category') {
      breakdownResult = await query(
        `SELECT 
          ic.id as category_id,
          ic.name_en as category_name_en,
          ic.name_de as category_name_de,
          ic.name_tr as category_name_tr,
          SUM(i.amount) as total,
          COUNT(*) as count
         ${baseQuery}
         GROUP BY ic.id, ic.name_en, ic.name_de, ic.name_tr
         ORDER BY total DESC`,
        queryParams
      );
    } else {
      breakdownResult = { rows: [] };
    }

    res.json({
      total: totalResult.rows[0],
      breakdown: breakdownResult.rows
    });
  } catch (error) {
    console.error('Error fetching income summary:', error);
    res.status(500).json({ error: 'Failed to fetch income summary' });
  }
});

// Get income history (audit log)
router.get('/:id/history',
  [param('id').isInt().withMessage('Invalid income ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const incomeId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Check if income belongs to user's household
      const incomeCheck = await query(
        'SELECT * FROM income WHERE id = $1 AND household_id = $2',
        [incomeId, householdId]
      );

      if (incomeCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Income entry not found' });
      }

      // Get history
      const result = await query(
        `SELECT ih.*, u.email as changed_by_email
         FROM income_history ih
         LEFT JOIN users u ON ih.changed_by_user_id = u.id
         WHERE ih.income_id = $1
         ORDER BY ih.changed_at DESC`,
        [incomeId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching income history:', error);
      res.status(500).json({ error: 'Failed to fetch income history' });
    }
  }
);

// Create new income entry
router.post('/',
  [
    body('household_member_id').isInt().withMessage('Member ID is required'),
    body('category_id').isInt().withMessage('Category ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    body('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
    body('description').optional().trim(),
    body('start_date').isISO8601().withMessage('Invalid start date'),
    body('end_date').optional().isISO8601().withMessage('Invalid end date'),
    body('is_recurring').isBoolean().withMessage('is_recurring must be boolean'),
    body('frequency').optional().isIn(['monthly', 'weekly', 'yearly', 'one-time'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Income validation errors:', errors.array());
      console.error('Request body:', req.body);
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const {
        household_member_id,
        category_id,
        amount,
        currency,
        description,
        start_date,
        end_date,
        is_recurring,
        frequency
      } = req.body;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Verify member belongs to user's household
      const memberCheck = await query(
        'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
        [household_member_id, householdId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid household member' });
      }

      // Create income entry
      const result = await query(
        `INSERT INTO income 
         (household_id, household_member_id, category_id, amount, currency,
          description, start_date, end_date, is_recurring, frequency, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          householdId,
          household_member_id,
          category_id,
          amount,
          currency,
          description || null,
          start_date,
          end_date || null,
          is_recurring,
          frequency || 'one-time',
          userId
        ]
      );

      // Log creation
      await logIncomeChange(result.rows[0].id, userId, 'created', null, result.rows[0]);

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating income:', error);
      res.status(500).json({ error: 'Failed to create income entry' });
    }
  }
);

// Update income entry
router.put('/:id',
  [
    param('id').isInt().withMessage('Invalid income ID'),
    body('household_member_id').optional().isInt(),
    body('category_id').optional().isInt(),
    body('amount').optional().isFloat({ min: 0 }),
    body('currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']),
    body('description').optional().trim(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional().isISO8601(),
    body('is_recurring').optional().isBoolean(),
    body('frequency').optional().isIn(['monthly', 'weekly', 'yearly', 'one-time'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const incomeId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Get old values for logging
      const oldResult = await query(
        'SELECT * FROM income WHERE id = $1 AND household_id = $2',
        [incomeId, householdId]
      );

      if (oldResult.rows.length === 0) {
        return res.status(404).json({ error: 'Income entry not found' });
      }

      const oldValues = oldResult.rows[0];

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      const {
        household_member_id,
        category_id,
        amount,
        currency,
        description,
        start_date,
        end_date,
        is_recurring,
        frequency
      } = req.body;

      if (household_member_id !== undefined) {
        // Verify member belongs to user's household
        const memberCheck = await query(
          'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
          [household_member_id, householdId]
        );
        if (memberCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid household member' });
        }
        updateFields.push(`household_member_id = $${valueIndex++}`);
        updateValues.push(household_member_id);
      }
      if (category_id !== undefined) {
        updateFields.push(`category_id = $${valueIndex++}`);
        updateValues.push(category_id);
      }
      if (amount !== undefined) {
        updateFields.push(`amount = $${valueIndex++}`);
        updateValues.push(amount);
      }
      if (currency !== undefined) {
        updateFields.push(`currency = $${valueIndex++}`);
        updateValues.push(currency);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${valueIndex++}`);
        updateValues.push(description || null);
      }
      if (start_date !== undefined) {
        updateFields.push(`start_date = $${valueIndex++}`);
        updateValues.push(start_date);
      }
      if (end_date !== undefined) {
        updateFields.push(`end_date = $${valueIndex++}`);
        updateValues.push(end_date || null);
      }
      if (is_recurring !== undefined) {
        updateFields.push(`is_recurring = $${valueIndex++}`);
        updateValues.push(is_recurring);
      }
      if (frequency !== undefined) {
        updateFields.push(`frequency = $${valueIndex++}`);
        updateValues.push(frequency);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(incomeId);

      const result = await query(
        `UPDATE income 
         SET ${updateFields.join(', ')}
         WHERE id = $${valueIndex}
         RETURNING *`,
        updateValues
      );

      // Log update
      await logIncomeChange(incomeId, userId, 'updated', oldValues, result.rows[0]);

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating income:', error);
      res.status(500).json({ error: 'Failed to update income entry' });
    }
  }
);

// Delete income entry
router.delete('/:id',
  [param('id').isInt().withMessage('Invalid income ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const incomeId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Get income for logging
      const incomeResult = await query(
        'SELECT * FROM income WHERE id = $1 AND household_id = $2',
        [incomeId, householdId]
      );

      if (incomeResult.rows.length === 0) {
        return res.status(404).json({ error: 'Income entry not found' });
      }

      const deletedIncome = incomeResult.rows[0];

      // Log deletion
      await logIncomeChange(incomeId, userId, 'deleted', deletedIncome, null);

      // Delete income entry
      await query('DELETE FROM income WHERE id = $1', [incomeId]);

      res.json({ message: 'Income entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting income:', error);
      res.status(500).json({ error: 'Failed to delete income entry' });
    }
  }
);

export default router;

