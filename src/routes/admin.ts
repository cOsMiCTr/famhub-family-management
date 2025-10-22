import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createNotFoundError, CustomError } from '../middleware/errorHandler';
import { requireAdmin } from '../middleware/auth';

const router = express.Router();

// Apply admin middleware to all routes
router.use(requireAdmin);

// Create invitation for new user
router.post('/invite-user', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('household_id').isInt({ min: 1 }).withMessage('Valid household ID required'),
  body('can_view_contracts').optional().isBoolean().withMessage('Boolean value required'),
  body('can_view_income').optional().isBoolean().withMessage('Boolean value required'),
  body('can_edit').optional().isBoolean().withMessage('Boolean value required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { email, household_id, can_view_contracts = false, can_view_income = false, can_edit = false } = req.body;

  // Check if household exists
  const householdResult = await query(
    'SELECT id, name FROM households WHERE id = $1',
    [household_id]
  );

  if (householdResult.rows.length === 0) {
    throw createNotFoundError('Household');
  }

  // Check if user already exists
  const existingUserResult = await query(
    'SELECT id FROM users WHERE email = $1',
    [email]
  );

  if (existingUserResult.rows.length > 0) {
    throw new CustomError('User already exists', 400, 'USER_EXISTS');
  }

  // Check if invitation already exists and is not expired
  const existingInvitationResult = await query(
    'SELECT id FROM invitation_tokens WHERE email = $1 AND expires_at > NOW() AND used = false',
    [email]
  );

  if (existingInvitationResult.rows.length > 0) {
    throw new CustomError('Invitation already sent and pending', 400, 'INVITATION_EXISTS');
  }

  // Generate invitation token
  const token = uuidv4();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

  // Create invitation
  const invitationResult = await query(
    `INSERT INTO invitation_tokens (email, token, household_id, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [email, token, household_id, expiresAt]
  );

  const invitation = invitationResult.rows[0];

  // TODO: Send invitation email here
  // For now, we'll return the invitation link
  const invitationLink = `${process.env.CLIENT_URL}/register?token=${token}`;

  res.status(201).json({
    message: 'Invitation created successfully',
    invitation: {
      id: invitation.id,
      email: invitation.email,
      household_name: householdResult.rows[0].name,
      expires_at: invitation.expires_at,
      invitation_link: invitationLink
    }
  });
}));

// List all pending invitations
router.get('/invitations', asyncHandler(async (req, res) => {
  const invitationsResult = await query(
    `SELECT it.*, h.name as household_name, u.email as created_by_email
     FROM invitation_tokens it
     JOIN households h ON it.household_id = h.id
     JOIN users u ON h.created_by_admin_id = u.id
     WHERE it.used = false
     ORDER BY it.created_at DESC`
  );

  res.json({
    invitations: invitationsResult.rows
  });
}));

// Revoke invitation
router.delete('/invitations/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const result = await query(
    'DELETE FROM invitation_tokens WHERE id = $1 AND used = false RETURNING *',
    [id]
  );

  if (result.rows.length === 0) {
    throw createNotFoundError('Invitation');
  }

  res.json({
    message: 'Invitation revoked successfully'
  });
}));

// List all users
router.get('/users', asyncHandler(async (req, res) => {
  const usersResult = await query(
    `SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, u.created_at,
            h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     ORDER BY u.created_at DESC`
  );

  res.json({
    users: usersResult.rows
  });
}));

// Update user permissions and household
router.put('/users/:id', [
  body('household_id').optional().isInt({ min: 1 }).withMessage('Valid household ID required'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
  body('can_view_contracts').optional().isBoolean().withMessage('Boolean value required'),
  body('can_view_income').optional().isBoolean().withMessage('Boolean value required'),
  body('can_edit').optional().isBoolean().withMessage('Boolean value required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { id } = req.params;
  const { household_id, role, can_view_contracts, can_view_income, can_edit } = req.body;

  // Check if user exists
  const userResult = await query(
    'SELECT id, email FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  // Update user basic info
  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (household_id !== undefined) {
    updateFields.push(`household_id = $${paramCount++}`);
    updateValues.push(household_id);
  }

  if (role !== undefined) {
    updateFields.push(`role = $${paramCount++}`);
    updateValues.push(role);
  }

  if (updateFields.length > 0) {
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);

    await query(
      `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`,
      updateValues
    );
  }

  // Update household permissions if provided
  if (household_id && (can_view_contracts !== undefined || can_view_income !== undefined || can_edit !== undefined)) {
    const permissionFields = [];
    const permissionValues = [];
    let permParamCount = 1;

    if (can_view_contracts !== undefined) {
      permissionFields.push(`can_view_contracts = $${permParamCount++}`);
      permissionValues.push(can_view_contracts);
    }

    if (can_view_income !== undefined) {
      permissionFields.push(`can_view_income = $${permParamCount++}`);
      permissionValues.push(can_view_income);
    }

    if (can_edit !== undefined) {
      permissionFields.push(`can_edit = $${permParamCount++}`);
      permissionValues.push(can_edit);
    }

    permissionValues.push(household_id, id);

    await query(
      `INSERT INTO household_permissions (household_id, user_id, ${permissionFields.map(f => f.split(' = ')[0]).join(', ')})
       VALUES ($${permParamCount++}, $${permParamCount++}, ${permissionFields.join(', ')})
       ON CONFLICT (household_id, user_id)
       DO UPDATE SET ${permissionFields.join(', ')}`,
      permissionValues
    );
  }

  // Get updated user data
  const updatedUserResult = await query(
    `SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, u.created_at, u.updated_at,
            h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     WHERE u.id = $1`,
    [id]
  );

  res.json({
    message: 'User updated successfully',
    user: updatedUserResult.rows[0]
  });
}));

// Deactivate user (soft delete by removing household assignment)
router.delete('/users/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists and is not admin
  const userResult = await query(
    'SELECT id, role FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  if (userResult.rows[0].role === 'admin') {
    throw new CustomError('Cannot deactivate admin user', 400, 'CANNOT_DEACTIVATE_ADMIN');
  }

  // Remove user from household and permissions
  await query(
    'UPDATE users SET household_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );

  await query(
    'DELETE FROM household_permissions WHERE user_id = $1',
    [id]
  );

  res.json({
    message: 'User deactivated successfully'
  });
}));

// Create household
router.post('/households', [
  body('name').isLength({ min: 1, max: 255 }).withMessage('Household name required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { name } = req.body;

  const householdResult = await query(
    `INSERT INTO households (name, created_by_admin_id)
     VALUES ($1, $2)
     RETURNING *`,
    [name, req.user!.id]
  );

  res.status(201).json({
    message: 'Household created successfully',
    household: householdResult.rows[0]
  });
}));

// List all households
router.get('/households', asyncHandler(async (req, res) => {
  const householdsResult = await query(
    `SELECT h.*, u.email as created_by_email,
            COUNT(u2.id) as member_count
     FROM households h
     LEFT JOIN users u ON h.created_by_admin_id = u.id
     LEFT JOIN users u2 ON h.id = u2.household_id
     GROUP BY h.id, u.email
     ORDER BY h.created_at DESC`
  );

  res.json({
    households: householdsResult.rows
  });
}));

// Update household
router.put('/households/:id', [
  body('name').isLength({ min: 1, max: 255 }).withMessage('Household name required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { id } = req.params;
  const { name } = req.body;

  const result = await query(
    'UPDATE households SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [name, id]
  );

  if (result.rows.length === 0) {
    throw createNotFoundError('Household');
  }

  res.json({
    message: 'Household updated successfully',
    household: result.rows[0]
  });
}));

// Get household members
router.get('/households/:id/members', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const membersResult = await query(
    `SELECT u.id, u.email, u.role, u.preferred_language, u.main_currency, u.created_at,
            hp.can_view_contracts, hp.can_view_income, hp.can_edit
     FROM users u
     LEFT JOIN household_permissions hp ON u.id = hp.user_id AND hp.household_id = $1
     WHERE u.household_id = $1
     ORDER BY u.created_at`,
    [id]
  );

  res.json({
    members: membersResult.rows
  });
}));

export default router;
