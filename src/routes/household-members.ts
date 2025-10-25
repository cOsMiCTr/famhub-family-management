import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Get all household members for user's household
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;

    // Get user's household_id
    const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
    const householdId = userResult.rows[0]?.household_id;

    if (!householdId) {
      return res.status(400).json({ error: 'User is not assigned to a household' });
    }

    // Get all members for this household
    const result = await query(
      `SELECT hm.*, u.email as creator_email
       FROM household_members hm
       LEFT JOIN users u ON hm.created_by_user_id = u.id
       WHERE hm.household_id = $1
       ORDER BY hm.is_shared DESC, hm.created_at ASC`,
      [householdId]
    );

    console.log(`🔍 Debug - Household members API called for household_id ${householdId}`);
    console.log(`🔍 Debug - Found ${result.rows.length} members`);
    result.rows.forEach(member => {
      console.log(`  Member: ${member.name} (${member.relationship})`);
    });

    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching household members:', error);
    res.status(500).json({ error: 'Failed to fetch household members' });
  }
});

// Create new household member
router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('relationship').optional().trim(),
    body('date_of_birth').optional().isISO8601().withMessage('Invalid date format'),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const { name, relationship, date_of_birth, notes } = req.body;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Create household member
      const result = await query(
        `INSERT INTO household_members 
         (household_id, name, relationship, date_of_birth, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [householdId, name, relationship || null, date_of_birth || null, notes || null, userId]
      );

      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating household member:', error);
      res.status(500).json({ error: 'Failed to create household member' });
    }
  }
);

// Update household member
router.put('/:id',
  [
    param('id').isInt().withMessage('Invalid member ID'),
    body('name').optional().trim().notEmpty(),
    body('relationship').optional().trim(),
    body('date_of_birth').optional().isISO8601(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const memberId = req.params.id;
      const { name, relationship, date_of_birth, notes } = req.body;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Check if member belongs to user's household and is not the shared member
      const memberCheck = await query(
        'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
        [memberId, householdId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Household member not found' });
      }

      if (memberCheck.rows[0].is_shared) {
        return res.status(403).json({ error: 'Cannot edit the shared household member' });
      }

      // Update household member
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      if (name !== undefined) {
        updateFields.push(`name = $${valueIndex++}`);
        updateValues.push(name);
      }
      if (relationship !== undefined) {
        updateFields.push(`relationship = $${valueIndex++}`);
        updateValues.push(relationship);
      }
      if (date_of_birth !== undefined) {
        updateFields.push(`date_of_birth = $${valueIndex++}`);
        updateValues.push(date_of_birth || null);
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${valueIndex++}`);
        updateValues.push(notes);
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(memberId);

      const result = await query(
        `UPDATE household_members 
         SET ${updateFields.join(', ')}
         WHERE id = $${valueIndex}
         RETURNING *`,
        updateValues
      );

      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating household member:', error);
      res.status(500).json({ error: 'Failed to update household member' });
    }
  }
);

// Delete household member
router.delete('/:id',
  [param('id').isInt().withMessage('Invalid member ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const memberId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Check if member belongs to user's household and is not shared
      const memberCheck = await query(
        'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
        [memberId, householdId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Household member not found' });
      }

      if (memberCheck.rows[0].is_shared) {
        return res.status(403).json({ error: 'Cannot delete the shared household member' });
      }

      // Check for dependencies
      const incomeCheck = await query(
        'SELECT COUNT(*) as count FROM income WHERE household_member_id = $1',
        [memberId]
      );
      const assetCheck = await query(
        'SELECT COUNT(*) as count FROM assets WHERE household_member_id = $1',
        [memberId]
      );

      const incomeCount = parseInt(incomeCheck.rows[0].count);
      const assetCount = parseInt(assetCheck.rows[0].count);

      if (incomeCount > 0 || assetCount > 0) {
        return res.status(400).json({
          error: 'Cannot delete member with assigned income or assets',
          dependencies: {
            income: incomeCount,
            assets: assetCount
          }
        });
      }

      // Delete household member
      await query('DELETE FROM household_members WHERE id = $1', [memberId]);

      res.json({ message: 'Household member deleted successfully' });
    } catch (error) {
      console.error('Error deleting household member:', error);
      res.status(500).json({ error: 'Failed to delete household member' });
    }
  }
);

// Get all assignments (income, assets, contracts) for a member
router.get('/:id/assignments',
  [param('id').isInt().withMessage('Invalid member ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const memberId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Check if member belongs to user's household
      const memberCheck = await query(
        'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
        [memberId, householdId]
      );

      if (memberCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Household member not found' });
      }

      // Get income assignments
      const income = await query(
        `SELECT i.*, ic.name_en as category_name
         FROM income i
         LEFT JOIN income_categories ic ON i.category_id = ic.id
         WHERE i.household_member_id = $1
         ORDER BY i.start_date DESC`,
        [memberId]
      );

      // Get asset assignments
      const assets = await query(
        `SELECT a.*, ac.name_en as category_name
         FROM assets a
         LEFT JOIN asset_categories ac ON a.category_id = ac.id
         WHERE a.household_member_id = $1
         ORDER BY a.date DESC`,
        [memberId]
      );

      // Get contract assignments (contracts have array of member IDs)
      const contracts = await query(
        `SELECT c.*, cc.name_en as category_name
         FROM contracts c
         LEFT JOIN contract_categories cc ON c.category_id = cc.id
         WHERE $1 = ANY(c.assigned_member_ids)
         ORDER BY c.start_date DESC`,
        [memberId]
      );

      res.json({
        member: memberCheck.rows[0],
        income: income.rows,
        assets: assets.rows,
        contracts: contracts.rows
      });
    } catch (error) {
      console.error('Error fetching member assignments:', error);
      res.status(500).json({ error: 'Failed to fetch member assignments' });
    }
  }
);

export default router;

