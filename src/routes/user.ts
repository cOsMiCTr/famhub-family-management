import express from 'express';
import { query } from '../config/database';
import { asyncHandler, createUnauthorizedError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import { LoginAttemptService } from '../services/loginAttemptService';
import { redistributeShares } from '../services/shareRedistributionService';

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

// Delete user account
router.delete('/delete-account', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;
  const userEmail = req.user.email;

  console.log(`🗑️ User ${userId} (${userEmail}) requested account deletion`);

  // Get user's household_id and household_member_id
  const userResult = await query(
    'SELECT household_id, id FROM household_members WHERE user_id = $1',
    [userId]
  );
  
  const householdMemberId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
  const householdId = userResult.rows.length > 0 ? userResult.rows[0].household_id : null;

  // Get all assets where user is owner or has shared ownership
  const assetsResult = await query(
    `SELECT id, ownership_type, user_id 
     FROM assets 
     WHERE user_id = $1 OR id IN (
       SELECT DISTINCT asset_id 
       FROM shared_ownership_distribution sod
       JOIN household_members hm ON sod.household_member_id = hm.id
       WHERE hm.user_id = $1
     )`,
    [userId]
  );

  const assets = assetsResult.rows;

  // Redistribute shares for shared assets
  for (const asset of assets) {
    if (asset.ownership_type === 'shared') {
      try {
        await redistributeShares(asset.id, userId);
      } catch (error) {
        console.error(`Error redistributing shares for asset ${asset.id}:`, error);
        // Continue with other assets even if one fails
      }
    }
  }

  // Delete or anonymize income entries
  if (householdMemberId) {
    await query(
      'DELETE FROM income WHERE household_member_id = $1',
      [householdMemberId]
    );
  }

  // Delete user from household_members if linked
  if (householdMemberId) {
    await query(
      'DELETE FROM household_members WHERE id = $1',
      [householdMemberId]
    );
  }

  // Delete household permissions
  await query(
    'DELETE FROM household_permissions WHERE user_id = $1',
    [userId]
  );

  // Delete user account (this will cascade to related records)
  await query(
    'DELETE FROM users WHERE id = $1',
    [userId]
  );

  console.log(`✅ User ${userId} (${userEmail}) account deleted successfully`);

  res.json({
    message: 'Account deleted successfully'
  });
}));

export default router;