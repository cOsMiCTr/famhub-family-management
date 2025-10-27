import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createUnauthorizedError, CustomError } from '../middleware/errorHandler';
import { authenticateToken, JWTPayload } from '../middleware/auth';
import { PasswordService } from '../services/passwordService';
import { LoginAttemptService } from '../services/loginAttemptService';
import { getActiveCurrencyCodes } from '../utils/currencyHelpers';
import { NotificationService } from '../services/notificationService';

const router = express.Router();

// Login endpoint
router.post('/login', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 1 }).withMessage('Password required')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { email, password } = req.body;
  
  // Get IP address and user agent
  const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] as string || 'unknown';
  const userAgent = req.headers['user-agent'] || 'unknown';

  // Find user by email
  const userResult = await query(
    `SELECT id, email, password_hash, role, household_id, preferred_language, main_currency,
            must_change_password, account_status, failed_login_attempts, 
            account_locked_until, last_login_at, last_activity_at
     FROM users WHERE email = $1`,
    [email]
  );

  if (userResult.rows.length === 0) {
    // Record failed attempt for non-existent user
    await LoginAttemptService.recordLoginAttempt(
      email,
      null,
      false,
      ipAddress,
      userAgent,
      'User not found'
    );
    throw createUnauthorizedError('Invalid email or password');
  }

  const user = userResult.rows[0];

  // Check if account is locked (but auto-unlock admin accounts)
  const lockStatus = await LoginAttemptService.isAccountLocked(user.id);
  if (lockStatus.locked) {
    if (user.role === 'admin') {
      // Auto-unlock admin accounts
      await query(
        `UPDATE users 
         SET account_locked_until = NULL,
             failed_login_attempts = 0,
             account_status = 'active'
         WHERE id = $1`,
        [user.id]
      );
      // Continue with login - don't throw error
    } else {
      // For non-admin users, still enforce the lock
      await LoginAttemptService.recordLoginAttempt(
        email,
        user.id,
        false,
        ipAddress,
        userAgent,
        'Account locked'
      );
      
      throw new CustomError(
        `Account is locked until ${lockStatus.lockedUntil?.toISOString()}`,
        423,
        'ACCOUNT_LOCKED'
      );
    }
  }

  // Check account status (but auto-unlock admin accounts)
  if (user.account_status === 'locked') {
    if (user.role === 'admin') {
      // Auto-activate admin accounts if they're locked
      await query(
        `UPDATE users 
         SET account_status = 'active',
             account_locked_until = NULL,
             failed_login_attempts = 0
         WHERE id = $1`,
        [user.id]
      );
      // Continue with login - don't throw error
    } else {
      // For non-admin users, still enforce the lock
      await LoginAttemptService.recordLoginAttempt(
        email,
        user.id,
        false,
        ipAddress,
        userAgent,
        'Account disabled'
      );
      
      throw new CustomError('Account is disabled', 423, 'ACCOUNT_DISABLED');
    }
  }

  // Verify password
  const isValidPassword = await PasswordService.comparePassword(password, user.password_hash);
  
  if (!isValidPassword) {
    // Increment failed attempts (but don't lock admin accounts)
    await LoginAttemptService.incrementFailedAttempts(user.id);
    
    // Record failed attempt
    await LoginAttemptService.recordLoginAttempt(
      email,
      user.id,
      false,
      ipAddress,
      userAgent,
      'Invalid password'
    );

    // Check if account should be locked (skip for admin users)
    if (user.role !== 'admin') {
      const shouldLock = await LoginAttemptService.shouldLockAccount(user.id);
      if (shouldLock) {
        await LoginAttemptService.lockAccount(user.id);
      }
    }

    const remainingAttempts = 3 - (user.failed_login_attempts + 1);
    const lockWarning = user.role === 'admin' ? '' : (remainingAttempts > 0 ? ` ${remainingAttempts} attempts remaining.` : ' Account will be locked.');
    throw new CustomError(
      `Invalid email or password.${lockWarning}`,
      401,
      'INVALID_CREDENTIALS'
    );
  }

  // Successful login - reset failed attempts and update timestamps
  await LoginAttemptService.resetFailedAttempts(user.id);
  
  await query(
    `UPDATE users 
     SET last_login_at = NOW(), 
         last_activity_at = NOW(),
         account_locked_until = NULL,
         account_status = CASE 
           WHEN must_change_password = true OR account_status = 'pending_password_change' THEN 'pending_password_change'
           ELSE 'active'
         END
     WHERE id = $1`,
    [user.id]
  );

  // Record successful login attempt
  await LoginAttemptService.recordLoginAttempt(
    email,
    user.id,
    true,
    ipAddress,
    userAgent
  );

  // Generate JWT token
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new CustomError('JWT configuration error', 500, 'CONFIG_ERROR');
  }

  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    household_id: user.household_id
  };

  const token = jwt.sign(tokenPayload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as any);

  // Return user data without password
  const { password_hash, ...userWithoutPassword } = user;
  
  // Force password change if account status is pending_password_change
  // This handles cases where must_change_password might be out of sync
  const shouldChangePassword = user.must_change_password || user.account_status === 'pending_password_change';
  
  // Debug logging
  console.log(`Login for ${user.email}:`, {
    must_change_password: user.must_change_password,
    account_status: user.account_status,
    shouldChangePassword
  });

  res.json({
    message: 'Login successful',
    token,
    user: userWithoutPassword,
    must_change_password: shouldChangePassword,
    last_login_at: user.last_login_at
  });
}));

// Change password on first login
router.post('/change-password-first-login', [
  body('current_password').isLength({ min: 1 }).withMessage('Current password required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  body('confirm_password').isLength({ min: 8 }).withMessage('Confirm password must be at least 8 characters')
], authenticateToken, asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const { current_password, new_password, confirm_password } = req.body;

  // Validate password confirmation
  if (new_password !== confirm_password) {
    throw createValidationError('Passwords do not match');
  }

  // Validate password complexity
  const complexityCheck = PasswordService.validatePasswordComplexity(new_password);
  if (!complexityCheck.isValid) {
    throw new CustomError(
      `Password does not meet requirements: ${complexityCheck.errors.join(', ')}`,
      400,
      'PASSWORD_COMPLEXITY_ERROR'
    );
  }

  // Get current user data
  const userResult = await query(
    'SELECT id, password_hash, must_change_password FROM users WHERE id = $1',
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw createUnauthorizedError('User not found');
  }

  const user = userResult.rows[0];

  // Check if user must change password
  if (!user.must_change_password) {
    throw new CustomError('Password change not required', 400, 'PASSWORD_CHANGE_NOT_REQUIRED');
  }

  // Verify current password
  const isValidCurrentPassword = await PasswordService.comparePassword(current_password, user.password_hash);
  if (!isValidCurrentPassword) {
    throw createUnauthorizedError('Current password is incorrect');
  }

  // Check password history
  const isPasswordReused = await PasswordService.checkPasswordHistory(req.user.id, new_password);
  if (isPasswordReused) {
    throw new CustomError(
      'Cannot reuse a recently used password. Please choose a different password.',
      400,
      'PASSWORD_REUSE_ERROR'
    );
  }

  // Hash new password
  const newPasswordHash = await PasswordService.hashPassword(new_password);

  // Update user password and status
  await query(
    `UPDATE users 
     SET password_hash = $1,
         must_change_password = false,
         account_status = 'active',
         password_changed_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`,
    [newPasswordHash, req.user.id]
  );

  // Add old password to history
  await PasswordService.addToPasswordHistory(req.user.id, user.password_hash);

  res.json({
    message: 'Password changed successfully'
  });
}));

// Validate invitation token
router.get('/validate-invitation/:token', asyncHandler(async (req, res) => {
  const { token } = req.params;

  const invitationResult = await query(
    `SELECT it.*, h.name as household_name, u.email as created_by_email
     FROM invitation_tokens it
     JOIN households h ON it.household_id = h.id
     JOIN users u ON h.created_by_admin_id = u.id
     WHERE it.token = $1 AND it.expires_at > NOW() AND it.used = false`,
    [token]
  );

  if (invitationResult.rows.length === 0) {
    throw new CustomError('Invalid or expired invitation', 400, 'INVALID_INVITATION');
  }

  const invitation = invitationResult.rows[0];

  res.json({
    valid: true,
    email: invitation.email,
    household_name: invitation.household_name,
    created_by: invitation.created_by_email,
    expires_at: invitation.expires_at
  });
}));

// Complete registration from invitation
router.post('/complete-registration', [
  body('token').isUUID().withMessage('Valid invitation token required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('preferred_language').optional().isIn(['en', 'de', 'tr']).withMessage('Invalid language'),
  // main_currency will be validated in handler
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  const { token, password, preferred_language = 'en', main_currency = 'USD' } = req.body;

  // Validate invitation token
  const invitationResult = await query(
    'SELECT * FROM invitation_tokens WHERE token = $1 AND expires_at > NOW() AND used = false',
    [token]
  );

  if (invitationResult.rows.length === 0) {
    throw new CustomError('Invalid or expired invitation', 400, 'INVALID_INVITATION');
  }

  const invitation = invitationResult.rows[0];

  // Check if user already exists
  const existingUserResult = await query(
    'SELECT id FROM users WHERE email = $1',
    [invitation.email]
  );

  if (existingUserResult.rows.length > 0) {
    throw new CustomError('User already exists', 400, 'USER_EXISTS');
  }

  // Hash password
  const saltRounds = 12;
  const password_hash = await bcrypt.hash(password, saltRounds);

  // Create user
  const userResult = await query(
    `INSERT INTO users (email, password_hash, household_id, preferred_language, main_currency, role)
     VALUES ($1, $2, $3, $4, $5, 'user')
     RETURNING id, email, role, household_id, preferred_language, main_currency, created_at`,
    [invitation.email, password_hash, invitation.household_id, preferred_language, main_currency]
  );

  const user = userResult.rows[0];

  // Mark invitation as used
  await query(
    'UPDATE invitation_tokens SET used = true WHERE token = $1',
    [token]
  );

  // Generate JWT token
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new CustomError('JWT configuration error', 500, 'CONFIG_ERROR');
  }

  const tokenPayload: JWTPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    household_id: user.household_id
  };

  const authToken = jwt.sign(tokenPayload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as any);

  res.status(201).json({
    message: 'Registration completed successfully',
    token: authToken,
    user
  });
}));

// Refresh token (if needed)
router.post('/refresh', authenticateToken, asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new CustomError('JWT configuration error', 500, 'CONFIG_ERROR');
  }

  const tokenPayload: JWTPayload = {
    userId: req.user.id,
    email: req.user.email,
    role: req.user.role,
    household_id: req.user.household_id
  };

  const token = jwt.sign(tokenPayload, jwtSecret, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  } as any);

  res.json({
    message: 'Token refreshed successfully',
    token
  });
}));

// Logout (client-side token removal)
router.post('/logout', authenticateToken, asyncHandler(async (req, res) => {
  // In a stateless JWT system, logout is handled client-side
  // We could implement a token blacklist here if needed
  res.json({
    message: 'Logout successful'
  });
}));

export default router;
