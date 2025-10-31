import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/external-persons
// Get all external persons for current household
router.get('/', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's household
    const householdResult = await query(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
      return res.json([]);
    }
    
    const householdId = householdResult.rows[0].household_id;
    
    // Get all external persons for this household
    const result = await query(
      `SELECT id, name, birth_date, relationship, notes, created_at, updated_at
       FROM external_persons
       WHERE household_id = $1
       ORDER BY name ASC`,
      [householdId]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching external persons:', error);
    res.status(500).json({ error: 'Failed to fetch external persons' });
  }
});

// POST /api/external-persons
// Create external person
router.post('/',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('birth_date').optional().isISO8601().toDate().withMessage('Invalid birth date format'),
    body('relationship').optional().trim(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user!.id;
      const { name, birth_date, relationship, notes } = req.body;
      
      // Get user's household
      const householdResult = await query(
        'SELECT household_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }
      
      const householdId = householdResult.rows[0].household_id;
      
      // Insert external person
      const result = await query(
        `INSERT INTO external_persons (household_id, name, birth_date, relationship, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [householdId, name, birth_date || null, relationship || null, notes || null, userId]
      );
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error creating external person:', error);
      res.status(500).json({ error: 'Failed to create external person' });
    }
  }
);

// PUT /api/external-persons/:id
// Update external person
router.put('/:id',
  [
    param('id').isInt().withMessage('Invalid external person ID'),
    body('name').optional().trim().notEmpty(),
    body('birth_date').optional().isISO8601().toDate(),
    body('relationship').optional().trim(),
    body('notes').optional().trim()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user!.id;
      const personId = req.params.id;
      const { name, birth_date, relationship, notes } = req.body;
      
      // Get user's household
      const householdResult = await query(
        'SELECT household_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }
      
      const householdId = householdResult.rows[0].household_id;
      
      // Check if external person exists and belongs to user's household
      const checkResult = await query(
        'SELECT * FROM external_persons WHERE id = $1 AND household_id = $2',
        [personId, householdId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'External person not found' });
      }
      
      // Build update query
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;
      
      if (name !== undefined) {
        updateFields.push(`name = $${valueIndex++}`);
        updateValues.push(name);
      }
      if (birth_date !== undefined) {
        updateFields.push(`birth_date = $${valueIndex++}`);
        updateValues.push(birth_date || null);
      }
      if (relationship !== undefined) {
        updateFields.push(`relationship = $${valueIndex++}`);
        updateValues.push(relationship || null);
      }
      if (notes !== undefined) {
        updateFields.push(`notes = $${valueIndex++}`);
        updateValues.push(notes || null);
      }
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }
      
      updateFields.push(`updated_at = NOW()`);
      updateValues.push(personId);
      
      const result = await query(
        `UPDATE external_persons 
         SET ${updateFields.join(', ')}
         WHERE id = $${valueIndex}
         RETURNING *`,
        updateValues
      );
      
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error updating external person:', error);
      res.status(500).json({ error: 'Failed to update external person' });
    }
  }
);

// DELETE /api/external-persons/:id
// Delete external person
router.delete('/:id',
  [param('id').isInt().withMessage('Invalid external person ID')],
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const personId = req.params.id;
      
      // Get user's household
      const householdResult = await query(
        'SELECT household_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }
      
      const householdId = householdResult.rows[0].household_id;
      
      // Check if external person exists and belongs to user's household
      const checkResult = await query(
        'SELECT * FROM external_persons WHERE id = $1 AND household_id = $2',
        [personId, householdId]
      );
      
      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: 'External person not found' });
      }
      
      // Delete external person
      await query('DELETE FROM external_persons WHERE id = $1', [personId]);
      
      res.json({ message: 'External person deleted successfully' });
    } catch (error) {
      console.error('Error deleting external person:', error);
      res.status(500).json({ error: 'Failed to delete external person' });
    }
  }
);

export default router;

