import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createNotFoundError, CustomError } from '../middleware/errorHandler';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { PasswordService } from '../services/passwordService';
import { NotificationService } from '../services/notificationService';
import { LoginAttemptService } from '../services/loginAttemptService';

const router = express.Router();

// Apply authentication and admin middleware to all routes
router.use(authenticateToken);
router.use(requireAdmin);

// Create new user directly
router.post('/users', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('household_id').isInt({ min: 1 }).withMessage('Valid household ID required'),
  body('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
  body('can_view_contracts').optional().isBoolean().withMessage('Boolean value required'),
  body('can_view_income').optional().isBoolean().withMessage('Boolean value required'),
  body('can_edit').optional().isBoolean().withMessage('Boolean value required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { email, household_id, role = 'user', can_view_contracts = false, can_view_income = false, can_edit = false } = req.body;

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

  // Generate secure password
  const temporaryPassword = PasswordService.generateSecurePassword();
  const passwordHash = await PasswordService.hashPassword(temporaryPassword);

  // Create user
  const userResult = await query(
    `INSERT INTO users (email, password_hash, role, household_id, must_change_password, account_status, password_changed_at)
     VALUES ($1, $2, $3, $4, true, 'pending_password_change', NOW())
     RETURNING id, email, role, household_id, created_at`,
    [email, passwordHash, role, household_id]
  );

  const user = userResult.rows[0];

  // Create household permissions if provided
  if (can_view_contracts || can_view_income || can_edit) {
    await query(
      `INSERT INTO household_permissions (household_id, user_id, can_view_contracts, can_view_income, can_edit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (household_id, user_id)
       DO UPDATE SET can_view_contracts = $3, can_view_income = $4, can_edit = $5`,
      [household_id, user.id, can_view_contracts, can_view_income, can_edit]
    );
  }

  // Create admin notification
  await NotificationService.createUserCreatedNotification(user.id, email);

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      household_id: user.household_id,
      household_name: householdResult.rows[0].name,
      created_at: user.created_at,
      must_change_password: true,
      account_status: 'pending_password_change'
    },
    temporary_password: temporaryPassword,
    warning: 'This password is shown only once. Please provide it to the user securely.'
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
    `SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, 
            u.account_status, u.last_login_at, u.last_activity_at, u.failed_login_attempts,
            u.account_locked_until, u.must_change_password, u.created_at, u.updated_at,
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
       VALUES ($${permParamCount++}, $${permParamCount++}, ${permissionFields.map(f => f.split(' = ')[1]).join(', ')})
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

// Reset user password
router.post('/users/:id/reset-password', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const userResult = await query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  const user = userResult.rows[0];

  // Generate new temporary password
  const temporaryPassword = PasswordService.generateSecurePassword();
  const passwordHash = await PasswordService.hashPassword(temporaryPassword);

  // Update user password and status
  await query(
    `UPDATE users 
     SET password_hash = $1,
         must_change_password = true,
         account_status = 'pending_password_change',
         failed_login_attempts = 0,
         account_locked_until = NULL,
         password_changed_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [passwordHash, id]
  );

  // Create admin notification
  await NotificationService.createPasswordResetNotification(id, req.user!.id);

  res.json({
    message: 'Password reset successfully',
    temporary_password: temporaryPassword,
    warning: 'This password is shown only once. Please provide it to the user securely.'
  });
}));

// Unlock user account
router.post('/users/:id/unlock', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists
  const userResult = await query(
    'SELECT id, email FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  // Unlock account
  await query(
    `UPDATE users 
     SET account_locked_until = NULL,
         failed_login_attempts = 0,
         account_status = 'active',
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  // Create admin notification
  await NotificationService.createAdminNotification(
    'account_unlocked',
    id,
    'Account Unlocked',
    `Account for ${userResult.rows[0].email} has been manually unlocked by admin.`,
    'info'
  );

  res.json({
    message: 'Account unlocked successfully'
  });
}));

// Toggle user account status
router.put('/users/:id/toggle-status', [
  body('status').isIn(['active', 'locked']).withMessage('Invalid status')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { id } = req.params;
  const { status } = req.body;

  // Check if user exists and is not admin
  const userResult = await query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  if (userResult.rows[0].role === 'admin') {
    throw new CustomError('Cannot modify admin account status', 400, 'CANNOT_MODIFY_ADMIN');
  }

  // Update account status
  await query(
    `UPDATE users 
     SET account_status = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [status, id]
  );

  // Create admin notification
  await NotificationService.createAdminNotification(
    'account_status_changed',
    id,
    'Account Status Changed',
    `Account for ${userResult.rows[0].email} has been ${status === 'locked' ? 'disabled' : 'enabled'} by admin.`,
    'info'
  );

  res.json({
    message: `Account ${status === 'locked' ? 'disabled' : 'enabled'} successfully`
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

  // Remove user from household and permissions, set status to locked
  await query(
    'UPDATE users SET household_id = NULL, account_status = \'locked\', updated_at = CURRENT_TIMESTAMP WHERE id = $1',
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

// Hard delete user (permanent deletion from all tables)
router.delete('/users/:id/hard-delete', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if user exists and is not admin
  const userResult = await query(
    'SELECT id, email, role FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  if (userResult.rows[0].role === 'admin') {
    throw new CustomError('Cannot delete admin user', 400, 'CANNOT_DELETE_ADMIN');
  }

  const userEmail = userResult.rows[0].email;

  // Delete user and all related data (CASCADE will handle related records)
  await query('DELETE FROM users WHERE id = $1', [id]);

  // Create admin notification
  await NotificationService.createAdminNotification(
    'user_hard_deleted',
    null, // No user_id since user is deleted
    'User Permanently Deleted',
    `User ${userEmail} has been permanently deleted from the system along with all their data.`,
    'critical'
  );

  res.json({
    message: 'User permanently deleted successfully'
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

// Admin notifications routes
router.get('/notifications', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const readFilter = req.query.read ? req.query.read === 'true' : undefined;

  const result = await NotificationService.getAllNotifications(page, limit, readFilter);

  res.json({
    notifications: result.notifications,
    total: result.total,
    page,
    limit,
    totalPages: Math.ceil(result.total / limit)
  });
}));

router.put('/notifications/:id/read', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await NotificationService.markAsRead(parseInt(id));

  res.json({
    message: 'Notification marked as read'
  });
}));

router.put('/notifications/mark-all-read', asyncHandler(async (req, res) => {
  const { notificationIds } = req.body;

  if (Array.isArray(notificationIds)) {
    await NotificationService.markMultipleAsRead(notificationIds);
  }

  res.json({
    message: 'Notifications marked as read'
  });
}));

router.delete('/notifications/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  await NotificationService.deleteNotification(parseInt(id));

  res.json({
    message: 'Notification deleted'
  });
}));

// Security dashboard endpoint
router.get('/security-dashboard', asyncHandler(async (req, res) => {
  const [
    loginStats,
    notificationCounts,
    recentFailedAttempts,
    lockedAccounts,
    pendingPasswordChanges
  ] = await Promise.all([
    LoginAttemptService.getLoginStatistics(),
    NotificationService.getNotificationCounts(),
    LoginAttemptService.getRecentFailedAttempts(50),
    query(
      `SELECT u.id, u.email, u.account_locked_until, u.last_failed_login_at
       FROM users u
       WHERE u.account_status = 'locked' OR 
       (u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW())
       ORDER BY u.last_failed_login_at DESC`
    ),
    query(
      `SELECT u.id, u.email, u.created_at
       FROM users u
       WHERE u.account_status = 'pending_password_change'
       ORDER BY u.created_at DESC`
    )
  ]);

  res.json({
    statistics: loginStats,
    notifications: notificationCounts,
    recent_failed_attempts: recentFailedAttempts,
    locked_accounts: lockedAccounts.rows,
    pending_password_changes: pendingPasswordChanges.rows
  });
}));

export default router;
