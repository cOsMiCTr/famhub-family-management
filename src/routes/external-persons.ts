import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { InvitationService } from '../services/invitationService';

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
    
    // Get all external persons for this household with invitation status
    const result = await query(
      `SELECT ep.id, ep.name, ep.birth_date, ep.relationship, ep.notes, ep.email,
              ep.created_at, ep.updated_at,
              u.id as linked_user_id,
              c.id as connection_id,
              c.status as invitation_status,
              c.expires_at as invitation_expires_at
       FROM external_persons ep
       LEFT JOIN users u ON LOWER(u.email) = LOWER(ep.email) AND ep.email IS NOT NULL
       LEFT JOIN external_person_user_connections c ON c.external_person_id = ep.id 
         AND c.status IN ('pending', 'accepted')
         AND (c.invited_user_id = $2 OR c.invited_by_user_id = $2)
       WHERE ep.household_id = $1
       ORDER BY ep.name ASC`,
      [householdId, userId]
    );
    
    // Enrich with invitation status
    const enriched = await Promise.all(result.rows.map(async (row: any) => {
      const emailMatch = row.email ? await InvitationService.checkEmailMatchesUser(row.email) : { userId: null };
      const canInvite = row.email && emailMatch.userId && emailMatch.userId !== userId;
      const hasPendingInvitation = row.connection_id && row.invitation_status === 'pending';
      const hasAcceptedInvitation = row.connection_id && row.invitation_status === 'accepted';
      
      return {
        ...row,
        can_invite: canInvite && !hasPendingInvitation && !hasAcceptedInvitation,
        linked_user_id: emailMatch.userId || row.linked_user_id || null,
        has_pending_invitation: hasPendingInvitation,
        invitation_status: row.invitation_status || null,
        invitation_expires_at: row.invitation_expires_at || null,
      };
    }));
    
    res.json(enriched);
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
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
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
      const { name, email, birth_date, relationship, notes } = req.body;
      
      // Get user's household
      const householdResult = await query(
        'SELECT household_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }
      
      const householdId = householdResult.rows[0].household_id;
      
      // Normalize email to lowercase if provided
      const normalizedEmail = email ? email.toLowerCase().trim() : null;
      
      // Check for duplicate email within household
      if (normalizedEmail) {
        const duplicateCheck = await query(
          `SELECT id FROM external_persons 
           WHERE household_id = $1 AND LOWER(email) = $2 AND email IS NOT NULL`,
          [householdId, normalizedEmail]
        );
        
        if (duplicateCheck.rows.length > 0) {
          return res.status(400).json({ error: 'An external person with this email already exists in your household' });
        }
      }
      
      // Check if email matches a registered user
      const emailMatch = normalizedEmail ? await InvitationService.checkEmailMatchesUser(normalizedEmail) : { userId: null };
      
      // Insert external person
      const result = await query(
        `INSERT INTO external_persons (household_id, name, email, birth_date, relationship, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [householdId, name, normalizedEmail, birth_date || null, relationship || null, notes || null, userId]
      );
      
      const person = result.rows[0];
      
      // Enrich response with invitation info
      const canInvite = normalizedEmail && emailMatch.userId && emailMatch.userId !== userId;
      
      res.status(201).json({
        ...person,
        can_invite: canInvite,
        linked_user_id: emailMatch.userId || null,
      });
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
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email format required'),
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
      const { name, email, birth_date, relationship, notes } = req.body;
      
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
      if (email !== undefined) {
        const normalizedEmail = email ? email.toLowerCase().trim() : null;
        
        // Check for duplicate email within household (excluding current person)
        if (normalizedEmail) {
          const duplicateCheck = await query(
            `SELECT id FROM external_persons 
             WHERE household_id = $1 AND LOWER(email) = $2 AND email IS NOT NULL AND id != $3`,
            [householdId, normalizedEmail, personId]
          );
          
          if (duplicateCheck.rows.length > 0) {
            return res.status(400).json({ error: 'An external person with this email already exists in your household' });
          }
        }
        
        updateFields.push(`email = $${valueIndex++}`);
        updateValues.push(normalizedEmail);
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
      
      const person = result.rows[0];
      
      // Check if email matches a registered user
      const emailMatch = person.email ? await InvitationService.checkEmailMatchesUser(person.email) : { userId: null };
      const canInvite = person.email && emailMatch.userId && emailMatch.userId !== userId;
      
      res.json({
        ...person,
        can_invite: canInvite,
        linked_user_id: emailMatch.userId || null,
      });
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

// GET /api/external-persons/:id/invite-status - Get invitation status for external person
router.get(
  '/:id/invite-status',
  [param('id').isInt({ min: 1 }).withMessage('Valid external person ID required')],
  async (req, res) => {
    try {
      const userId = req.user!.id;
      const personId = parseInt(req.params.id);
      
      // Get user's household
      const householdResult = await query(
        'SELECT household_id FROM users WHERE id = $1',
        [userId]
      );
      
      if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }
      
      const householdId = householdResult.rows[0].household_id;
      
      // Get external person
      const personResult = await query(
        `SELECT id, name, email FROM external_persons WHERE id = $1 AND household_id = $2`,
        [personId, householdId]
      );
      
      if (personResult.rows.length === 0) {
        return res.status(404).json({ error: 'External person not found' });
      }
      
      const person = personResult.rows[0];
      
      // Check email match
      const emailMatch = person.email ? await InvitationService.checkEmailMatchesUser(person.email) : { userId: null };
      
      // Get connection if exists
      const connectionResult = person.email && emailMatch.userId ? await query(
        `SELECT * FROM external_person_user_connections 
         WHERE external_person_id = $1 AND invited_user_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [personId, emailMatch.userId]
      ) : { rows: [] };
      
      const connection = connectionResult.rows[0] || null;
      
      res.json({
        external_person_id: personId,
        email: person.email,
        linked_user_id: emailMatch.userId,
        can_invite: person.email && emailMatch.userId && emailMatch.userId !== userId && !connection,
        has_connection: !!connection,
        connection_status: connection?.status || null,
        invitation_expires_at: connection?.expires_at || null,
      });
    } catch (error) {
      console.error('Error getting invite status:', error);
      res.status(500).json({ error: 'Failed to get invite status' });
    }
  }
);

export default router;

