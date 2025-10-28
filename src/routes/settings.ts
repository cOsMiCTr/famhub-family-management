import express from 'express';
import { body, validationResult } from 'express-validator';
import { query } from '../config/database';
import { asyncHandler, createValidationError, createUnauthorizedError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { PasswordService } from '../services/passwordService';
import { getActiveCurrencyCodes } from '../utils/currencyHelpers';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user settings
router.get('/', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const userResult = await query(
    `SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, u.created_at,
            h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     WHERE u.id = $1`,
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw new Error('User not found');
  }

  const user = userResult.rows[0];

  res.json({
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      household_id: user.household_id,
      household_name: user.household_name,
      preferred_language: user.preferred_language,
      main_currency: user.main_currency,
      created_at: user.created_at
    }
  });
}));

// Update user settings
router.put('/', [
  body('preferred_language').optional().isIn(['en', 'de', 'tr']).withMessage('Invalid language'),
  // main_currency will be validated in handler
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { preferred_language, main_currency } = req.body;

  const updateFields = [];
  const updateValues = [];
  let paramCount = 1;

  if (preferred_language !== undefined) {
    updateFields.push(`preferred_language = $${paramCount++}`);
    updateValues.push(preferred_language);
  }

  if (main_currency !== undefined) {
    updateFields.push(`main_currency = $${paramCount++}`);
    updateValues.push(main_currency);
  }

  if (updateFields.length === 0) {
    throw createValidationError('No fields to update');
  }

  updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
  updateValues.push(req.user.id);

  const result = await query(
    `UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`,
    updateValues
  );

  const { password_hash, ...userWithoutPassword } = result.rows[0];

  res.json({
    message: 'Settings updated successfully',
    user: userWithoutPassword
  });
}));

// Get available currencies
router.get('/currencies', asyncHandler(async (req, res) => {
  const currencies = [
    {
      code: 'USD',
      name: 'US Dollar ($)',
      symbol: '$',
      name_de: 'US-Dollar ($)',
      name_tr: 'ABD Doları ($)'
    },
    {
      code: 'EUR',
      name: 'Euro (€)',
      symbol: '€',
      name_de: 'Euro (€)',
      name_tr: 'Euro (€)'
    },
    {
      code: 'GBP',
      name: 'British Pound (£)',
      symbol: '£',
      name_de: 'Britisches Pfund (£)',
      name_tr: 'İngiliz Sterlini (£)'
    },
    {
      code: 'TRY',
      name: 'Turkish Lira (₺)',
      symbol: '₺',
      name_de: 'Türkische Lira (₺)',
      name_tr: 'Türk Lirası (₺)'
    },
    {
      code: 'GOLD',
      name: 'Gold (Au)',
      symbol: 'Au',
      name_de: 'Gold (Au)',
      name_tr: 'Altın (Au)'
    }
  ];

  res.json({
    currencies
  });
}));

// Get available languages
router.get('/languages', asyncHandler(async (req, res) => {
  const languages = [
    {
      code: 'en',
      name: 'English',
      name_native: 'English'
    },
    {
      code: 'de',
      name: 'German',
      name_native: 'Deutsch'
    },
    {
      code: 'tr',
      name: 'Turkish',
      name_native: 'Türkçe'
    }
  ];

  res.json({
    languages
  });
}));

// Change password endpoint
router.post('/change-password', [
  body('current_password').isLength({ min: 1 }).withMessage('Current password required'),
  body('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], asyncHandler(async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw createValidationError('Invalid input data');
  }

  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const { current_password, new_password } = req.body;

  // Validate password complexity
  const complexityCheck = PasswordService.validatePasswordComplexity(new_password);
  if (!complexityCheck.isValid) {
    throw createValidationError(`Password does not meet requirements: ${complexityCheck.errors.join(', ')}`);
  }

  // Get current user data
  const userResult = await query(
    'SELECT id, password_hash FROM users WHERE id = $1',
    [req.user.userId]
  );

  if (userResult.rows.length === 0) {
    throw createUnauthorizedError('User not found');
  }

  const user = userResult.rows[0];

  // Verify current password
  const isValidCurrentPassword = await PasswordService.comparePassword(current_password, user.password_hash);
  if (!isValidCurrentPassword) {
    throw createUnauthorizedError('Current password is incorrect');
  }

  // Check password history
  const isPasswordReused = await PasswordService.checkPasswordHistory(req.user.id, new_password);
  if (isPasswordReused) {
    throw createValidationError('Cannot reuse a recently used password. Please choose a different password.');
  }

  // Hash new password
  const newPasswordHash = await PasswordService.hashPassword(new_password);

  // Update user password
  await query(
    `UPDATE users 
     SET password_hash = $1,
         password_changed_at = NOW(),
         account_status = CASE 
           WHEN must_change_password = true THEN 'active'
           ELSE account_status
         END,
         must_change_password = false,
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

export default router;
