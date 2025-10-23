import express from 'express';
import { query } from '../config/database';
import { asyncHandler, createUnauthorizedError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { LoginAttemptService } from '../services/loginAttemptService';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get user's login history
router.get('/login-history', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const limit = parseInt(req.query.limit as string) || 50;
  const loginHistory = await LoginAttemptService.getUserLoginHistory(req.user.id, limit);

  res.json({
    login_history: loginHistory
  });
}));

// Get user's account activity
router.get('/account-activity', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userResult = await query(
    `SELECT last_login_at, last_activity_at, account_status, 
            failed_login_attempts, account_locked_until
     FROM users WHERE id = $1`,
    [req.user.id]
  );

  if (userResult.rows.length === 0) {
    throw createUnauthorizedError('User not found');
  }

  const user = userResult.rows[0];

  res.json({
    last_login_at: user.last_login_at,
    last_activity_at: user.last_activity_at,
    account_status: user.account_status,
    failed_login_attempts: user.failed_login_attempts,
    account_locked_until: user.account_locked_until
  });
}));

export default router;