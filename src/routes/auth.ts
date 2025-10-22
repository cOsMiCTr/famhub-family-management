import express from 'express';
import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createUnauthorizedError, CustomError } from '../middleware/errorHandler';
import { authenticateToken, JWTPayload } from '../middleware/auth';

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

  // Find user by email
  const userResult = await query(
    'SELECT id, email, password_hash, role, household_id, preferred_language, main_currency FROM users WHERE email = $1',
    [email]
  );

  if (userResult.rows.length === 0) {
    throw createUnauthorizedError('Invalid email or password');
  }

  const user = userResult.rows[0];

  // Verify password
  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw createUnauthorizedError('Invalid email or password');
  }

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

  res.json({
    message: 'Login successful',
    token,
    user: userWithoutPassword
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
  body('main_currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR']).withMessage('Invalid currency')
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
