import express from 'express';
import { query } from '../config/database';
import { asyncHandler, createUnauthorizedError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import {
  generateTwoFactorSecret,
  verifyTwoFactorToken,
  saveTwoFactorSecret,
  enableTwoFactor,
  disableTwoFactor,
  generateBackupCodes,
  TwoFactorSetup,
  VerifyResult
} from '../services/twoFactorService';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Setup 2FA - Generate secret and QR code
router.post('/setup', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;
  const email = req.user.email;

  // Check if 2FA is already enabled
  const userResult = await query(
    'SELECT two_factor_enabled FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows[0]?.two_factor_enabled) {
    return res.status(400).json({ error: 'Two-factor authentication is already enabled' });
  }

  // Generate secret and QR code
  const setup: TwoFactorSetup = await generateTwoFactorSecret(email);

  // Store temporary secret (will be saved after verification)
  await query(
    'UPDATE users SET two_factor_secret = $1 WHERE id = $2',
    [setup.secret, userId]
  );

  res.json({
    secret: setup.secret,
    qrCodeUrl: setup.qrCodeUrl,
    manualEntryKey: setup.manualEntryKey
  });
}));

// Verify 2FA code and enable
router.post('/verify', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;
  const { token } = req.body;

  if (!token) {
    return res.status(400).json({ error: 'Token is required' });
  }

  // Verify the token
  const result: VerifyResult = await verifyTwoFactorToken(userId, token);

  if (!result.verified) {
    return res.status(400).json({ error: 'Invalid verification code' });
  }

  // Get the temporary secret
  const userResult = await query(
    'SELECT two_factor_secret FROM users WHERE id = $1',
    [userId]
  );

  const secret = userResult.rows[0].two_factor_secret;

  // Generate backup codes
  const backupCodes = generateBackupCodes(8);

  // Save the secret and backup codes
  await saveTwoFactorSecret(userId, secret, backupCodes);

  // Enable 2FA
  await enableTwoFactor(userId);

  res.json({
    message: 'Two-factor authentication enabled successfully',
    backupCodes
  });
}));

// Disable 2FA
router.post('/disable', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;

  // No password required - user is already authenticated
  await disableTwoFactor(userId);

  res.json({
    message: 'Two-factor authentication disabled successfully'
  });
}));

// Get backup codes
router.get('/backup-codes', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;

  const userResult = await query(
    'SELECT backup_codes FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    backupCodes: userResult.rows[0].backup_codes || []
  });
}));

// Verify 2FA status
router.get('/status', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;

  const userResult = await query(
    'SELECT two_factor_enabled FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({
    twoFactorEnabled: userResult.rows[0].two_factor_enabled || false
  });
}));

export default router;

