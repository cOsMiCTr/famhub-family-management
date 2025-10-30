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
import ModuleService from '../services/moduleService';
import TokenAccountService from '../services/tokenAccountService';
import VoucherCodeService from '../services/voucherCodeService';

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
            u.two_factor_enabled,
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

// Force password change for a user (without resetting password)
router.post('/users/:id/force-password-change', asyncHandler(async (req, res) => {
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

  // Update user status to force password change
  await query(
    `UPDATE users 
     SET must_change_password = true,
         account_status = 'pending_password_change',
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );

  res.json({
    message: 'User will be forced to change password on next login',
    user: {
      id: user.id,
      email: user.email
    }
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

// Toggle 2FA for a user
router.post('/users/:id/toggle-2fa', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'enable' or 'disable'

  // Check if user exists
  const userResult = await query(
    'SELECT id, email, two_factor_enabled FROM users WHERE id = $1',
    [id]
  );

  if (userResult.rows.length === 0) {
    throw createNotFoundError('User');
  }

  const user = userResult.rows[0];

  // Handle disable action
  if (action === 'disable' || (!action && user.two_factor_enabled)) {
    if (!user.two_factor_enabled) {
      throw new CustomError('2FA is already disabled.', 400, '2FA_ALREADY_DISABLED');
    }

    // Disable 2FA and clear secret/backup codes
    await query(
      `UPDATE users 
       SET two_factor_enabled = false,
           two_factor_secret = NULL,
           backup_codes = NULL,
           updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    res.json({
      message: '2FA disabled successfully',
      two_factor_enabled: false
    });
  } 
  // Handle enable action (only provides message - can't actually enable remotely)
  else if (action === 'enable' || (!action && !user.two_factor_enabled)) {
    if (user.two_factor_enabled) {
      throw new CustomError('2FA is already enabled.', 400, '2FA_ALREADY_ENABLED');
    }

    // Can't enable remotely - user must set it up through settings
    throw new CustomError('2FA cannot be enabled remotely. The user must enable it through their Settings page with their authenticator app.', 400, 'CANNOT_ENABLE_2FA_REMOTELY');
  }
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

  const household = householdResult.rows[0];

  // Auto-create the "Household (Shared)" member for family-level income/expenses
  await query(
    `INSERT INTO household_members (household_id, name, relationship, is_shared, created_by_user_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [household.id, 'Household (Shared)', 'Shared', true, req.user!.id]
  );

  res.status(201).json({
    message: 'Household created successfully',
    household: household
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

// Household management endpoints

// Get all households with member counts
router.get('/households', asyncHandler(async (req, res) => {
  const householdsResult = await query(
    `SELECT h.id, h.name, h.created_at, h.updated_at,
            COUNT(u.id) as member_count,
            h.created_by_admin_id
     FROM households h
     LEFT JOIN users u ON u.household_id = h.id
     GROUP BY h.id, h.name, h.created_at, h.updated_at, h.created_by_admin_id
     ORDER BY h.created_at DESC`
  );

  res.json({
    households: householdsResult.rows
  });
}));

// Create household
router.post('/households', [
  body('name').trim().notEmpty().withMessage('Household name is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { name } = req.body;
  const adminId = req.user!.id;

  const result = await query(
    'INSERT INTO households (name, created_by_admin_id, created_at) VALUES ($1, $2, CURRENT_TIMESTAMP) RETURNING *',
    [name, adminId]
  );

  res.status(201).json({
    message: 'Household created successfully',
    household: result.rows[0]
  });
}));

// Update household
router.put('/households/:id', [
  body('name').trim().notEmpty().withMessage('Household name is required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { id } = req.params;
  const { name } = req.body;

  const householdResult = await query(
    'SELECT id FROM households WHERE id = $1',
    [id]
  );

  if (householdResult.rows.length === 0) {
    throw createNotFoundError('Household');
  }

  const result = await query(
    'UPDATE households SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
    [name, id]
  );

  res.json({
    message: 'Household updated successfully',
    household: result.rows[0]
  });
}));

// Delete household
router.delete('/households/:id', asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Check if household exists
  const householdResult = await query(
    'SELECT id, name FROM households WHERE id = $1',
    [id]
  );

  if (householdResult.rows.length === 0) {
    throw createNotFoundError('Household');
  }

  // Check if household has members
  const membersResult = await query(
    'SELECT COUNT(*) as count FROM users WHERE household_id = $1',
    [id]
  );

  const memberCount = parseInt(membersResult.rows[0].count);

  if (memberCount > 0) {
    throw new CustomError(
      `Cannot delete household. It has ${memberCount} member(s). Please reassign or remove users first.`,
      400,
      'HOUSEHOLD_HAS_MEMBERS'
    );
  }

  // Delete household
  await query('DELETE FROM households WHERE id = $1', [id]);

  res.json({
    message: 'Household deleted successfully'
  });
}));

// Get household members
router.get('/households/:id/members', asyncHandler(async (req, res) => {
  const { id } = req.params;

  const membersResult = await query(
    `SELECT u.id, u.email, u.role, u.created_at, u.account_status
     FROM users u
     WHERE u.household_id = $1
     ORDER BY u.created_at DESC`,
    [id]
  );

  res.json({
    members: membersResult.rows
  });
}));

// Admin dashboard statistics
router.get('/dashboard-stats', asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const selectedDate = req.query.date as string || '';
  const activityFilter = req.query.filter as string || 'all';
  const itemsPerPage = 10;
  const offset = (page - 1) * itemsPerPage;

  const [
    usersCount,
    householdsCount,
    contractsCount,
    assetsCount,
    activeUsersCount,
    userGrowthData,
    recentActivity
  ] = await Promise.all([
    // Total users
    query('SELECT COUNT(*) as count FROM users'),
    // Total households
    query('SELECT COUNT(*) as count FROM households'),
    // Total contracts
    query('SELECT COUNT(*) as count FROM contracts'),
    // Total assets
    query('SELECT COUNT(*) as count FROM assets'),
    // Active users (last 7 days)
    query(`SELECT COUNT(*) as count FROM users WHERE last_activity_at > NOW() - INTERVAL '7 days'`),
    // User growth (last 30 days vs previous 30 days)
    query(`
      SELECT 
        COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' THEN 1 END) as recent_count,
        COUNT(CASE WHEN created_at BETWEEN NOW() - INTERVAL '60 days' AND NOW() - INTERVAL '30 days' THEN 1 END) as previous_count
      FROM users
    `),
    // Recent activity with pagination and filtering
    query(`
      SELECT 
        la.created_at as timestamp,
        la.email as user_email,
        CASE 
          WHEN la.success = true THEN 'Successful login'
          ELSE 'Failed login attempt'
        END as description,
        CASE 
          WHEN la.success = true THEN 'login'
          ELSE 'failed_login'
        END as type
      FROM login_attempts la
      WHERE ($1 = '' OR DATE(la.created_at) = $1::date)
        AND ($2 = 'all' OR 
             ($2 = 'login' AND la.success = true) OR 
             ($2 = 'failed_login' AND la.success = false))
      ORDER BY la.created_at DESC
      LIMIT $3 OFFSET $4
    `, [selectedDate, activityFilter, itemsPerPage, offset])
  ]);

  // Calculate user growth percentage
  const recentCount = parseInt(userGrowthData.rows[0].recent_count) || 0;
  const previousCount = parseInt(userGrowthData.rows[0].previous_count) || 0;
  const userGrowth = previousCount > 0 
    ? (((recentCount - previousCount) / previousCount) * 100).toFixed(1)
    : 0;

  res.json({
    totalUsers: parseInt(usersCount.rows[0].count),
    totalHouseholds: parseInt(householdsCount.rows[0].count),
    totalContracts: parseInt(contractsCount.rows[0].count),
    totalAssets: parseInt(assetsCount.rows[0].count),
    activeUsers: parseInt(activeUsersCount.rows[0].count),
    userGrowth: parseFloat(userGrowth as string),
    recentActivity: recentActivity.rows,
    pagination: {
      currentPage: page,
      itemsPerPage,
      totalItems: recentActivity.rows.length,
      hasNextPage: recentActivity.rows.length === itemsPerPage
    }
  });
}));

// ==================== Module Management Routes ====================

/**
 * GET /api/admin/modules
 * List all modules (admin only)
 */
router.get('/modules', asyncHandler(async (req, res) => {
  const modules = await ModuleService.getAllModules();
  res.json(modules);
}));

/**
 * GET /api/admin/users/:id/modules
 * Get user's module access (admin only)
 */
router.get('/users/:id/modules', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  const modules = await ModuleService.getUserModules(userId);
  const activeModules = await ModuleService.getUserActiveModulesWithExpiration(userId);
  
  res.json({
    modules,
    activeModules
  });
}));

/**
 * PUT /api/admin/users/:id/modules
 * Update user's module access (bulk) - admin only
 */
router.put('/users/:id/modules', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { modules } = req.body; // Array of module updates: [{ moduleKey, action: 'grant' | 'revoke' }]
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  if (!Array.isArray(modules)) {
    throw createValidationError('Modules must be an array');
  }

  const grantedBy = req.user!.id;
  const results = [];

  for (const moduleUpdate of modules) {
    const { moduleKey, action, reason } = moduleUpdate;
    
    if (action === 'grant') {
      await ModuleService.grantModule(userId, moduleKey, grantedBy, reason);
      results.push({ moduleKey, action: 'granted' });
    } else if (action === 'revoke') {
      await ModuleService.revokeModule(userId, moduleKey);
      results.push({ moduleKey, action: 'revoked' });
    }
  }

  res.json({ results });
}));

/**
 * POST /api/admin/users/:id/modules/:moduleKey/grant
 * Grant single module to user (admin only - bypasses token system)
 */
router.post('/users/:id/modules/:moduleKey/grant', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const moduleKey = req.params.moduleKey;
  const { reason } = req.body;
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  const grantedBy = req.user!.id;
  const activation = await ModuleService.grantModule(userId, moduleKey, grantedBy, reason);
  
  res.json({ activation, message: `Module ${moduleKey} granted to user` });
}));

/**
 * POST /api/admin/users/:id/modules/:moduleKey/revoke
 * Revoke single module from user (admin only)
 */
router.post('/users/:id/modules/:moduleKey/revoke', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const moduleKey = req.params.moduleKey;
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  await ModuleService.revokeModule(userId, moduleKey);
  
  res.json({ message: `Module ${moduleKey} revoked from user` });
}));

/**
 * GET /api/admin/users/:id/tokens
 * Get user's token account (admin only)
 */
router.get('/users/:id/tokens', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  const account = await TokenAccountService.getUserTokenAccount(userId);
  const price = await TokenAccountService.getTokenPrice();
  
  res.json({
    balance: parseFloat(account.balance.toString()),
    totalPurchased: parseFloat(account.total_tokens_purchased.toString()),
    tokenPrice: price
  });
}));

/**
 * PUT /api/admin/users/:id/tokens/balance
 * Set token balance directly (admin only)
 */
router.put('/users/:id/tokens/balance', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { balance, reason } = req.body;
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  if (balance === undefined || balance === null) {
    throw createValidationError('Balance is required');
  }

  const balanceNum = parseFloat(balance);
  if (isNaN(balanceNum) || balanceNum < 0) {
    throw createValidationError('Balance must be a non-negative number');
  }

  const account = await TokenAccountService.setTokenBalance(userId, balanceNum, reason, req.user!.id);
  
  res.json({ 
    account: {
      balance: parseFloat(account.balance.toString()),
      totalPurchased: parseFloat(account.total_tokens_purchased.toString())
    },
    message: `Token balance set to ${balanceNum}` 
  });
}));

/**
 * POST /api/admin/users/:id/tokens/grant
 * Grant tokens to user (admin only)
 */
router.post('/users/:id/tokens/grant', asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { amount, reason } = req.body;
  
  if (isNaN(userId)) {
    throw createValidationError('Invalid user ID');
  }

  if (!amount || amount <= 0) {
    throw createValidationError('Amount must be greater than 0');
  }

  const account = await TokenAccountService.addTokens(
    userId, 
    amount, 
    'admin_grant', 
    reason || 'Admin grant',
    {
      processedBy: req.user!.id
    }
  );
  
  res.json({ account, message: `${amount} tokens granted to user` });
}));

// ==================== Voucher Code Management Routes ====================

/**
 * GET /api/admin/vouchers
 * Get all voucher codes (admin only)
 */
router.get('/vouchers', asyncHandler(async (req, res) => {
  const { isActive, search } = req.query;
  const filters: any = {};
  
  if (isActive !== undefined) {
    filters.isActive = isActive === 'true';
  }
  
  if (search) {
    filters.search = search as string;
  }

  const vouchers = await VoucherCodeService.getAllVoucherCodes(filters);
  res.json(vouchers);
}));

/**
 * POST /api/admin/vouchers
 * Create new voucher code (admin only)
 */
router.post('/vouchers', asyncHandler(async (req, res) => {
  const {
    code,
    description,
    discount_percentage,
    discount_amount,
    minimum_purchase,
    max_uses,
    valid_from,
    valid_until
  } = req.body;

  if (!code) {
    throw createValidationError('Voucher code is required');
  }

  if (!valid_from) {
    throw createValidationError('Valid from date is required');
  }

  const voucher = await VoucherCodeService.createVoucherCode({
    code,
    description,
    discount_percentage,
    discount_amount,
    minimum_purchase,
    max_uses,
    valid_from: new Date(valid_from),
    valid_until: valid_until ? new Date(valid_until) : undefined,
    created_by: req.user!.id
  });

  res.json({ voucher, message: `Voucher code ${code} created successfully` });
}));

/**
 * PUT /api/admin/vouchers/:id
 * Update voucher code (admin only)
 */
router.put('/vouchers/:id', asyncHandler(async (req, res) => {
  const voucherId = parseInt(req.params.id);
  const updateData = req.body;

  if (isNaN(voucherId)) {
    throw createValidationError('Invalid voucher ID');
  }

  if (updateData.valid_from) {
    updateData.valid_from = new Date(updateData.valid_from);
  }

  if (updateData.valid_until) {
    updateData.valid_until = new Date(updateData.valid_until);
  }

  const voucher = await VoucherCodeService.updateVoucherCode(voucherId, updateData);
  res.json({ voucher, message: `Voucher code updated successfully` });
}));

/**
 * DELETE /api/admin/vouchers/:id
 * Delete/deactivate voucher code (admin only)
 */
router.delete('/vouchers/:id', asyncHandler(async (req, res) => {
  const voucherId = parseInt(req.params.id);

  if (isNaN(voucherId)) {
    throw createValidationError('Invalid voucher ID');
  }

  await VoucherCodeService.deleteVoucherCode(voucherId);
  res.json({ message: `Voucher code deactivated successfully` });
}));

/**
 * GET /api/admin/vouchers/:id/stats
 * Get voucher code usage statistics (admin only)
 */
router.get('/vouchers/:id/stats', asyncHandler(async (req, res) => {
  const voucherId = parseInt(req.params.id);

  if (isNaN(voucherId)) {
    throw createValidationError('Invalid voucher ID');
  }

  const stats = await VoucherCodeService.getVoucherUsageStats(voucherId);
  res.json(stats);
}));

export default router;
