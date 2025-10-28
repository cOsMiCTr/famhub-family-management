import express from 'express';
import { query } from '../config/database';
import { asyncHandler, createUnauthorizedError } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Export user data as PDF
router.get('/pdf', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw createUnauthorizedError('User not authenticated');
  }

  const userId = req.user.id;

  // Get user information
  const userResult = await query(
    `SELECT u.email, u.role, u.created_at, h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     WHERE u.id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw createUnauthorizedError('User not found');
  }

  const user = userResult.rows[0];

  // Get household members
  const membersResult = await query(
    `SELECT name, relationship, date_of_birth, notes
     FROM household_members
     WHERE household_id = (SELECT household_id FROM users WHERE id = $1)
     ORDER BY created_at ASC`,
    [userId]
  );

  // Get assets
  const assetsResult = await query(
    `SELECT a.name, ac.name as category_name_en, a.ownership_type, a.currency, 
            a.current_value, a.amount, a.status
     FROM assets a
     LEFT JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.household_id = (SELECT household_id FROM users WHERE id = $1)
     ORDER BY a.created_at DESC`,
    [userId]
  );

  // Get income
  const incomeResult = await query(
    `SELECT ic.name as category_name_en, i.amount, i.currency, i.date, 
            i.is_recurring, i.frequency
     FROM income i
     LEFT JOIN income_categories ic ON i.category_id = ic.id
     WHERE i.household_id = (SELECT household_id FROM users WHERE id = $1)
     ORDER BY i.date DESC
     LIMIT 100`,
    [userId]
  );

  // Get contracts
  const contractsResult = await query(
    `SELECT title, type, status, start_date, end_date
     FROM contracts
     WHERE household_id = (SELECT household_id FROM users WHERE id = $1)
     ORDER BY start_date DESC
     LIMIT 50`,
    [userId]
  );

  const exportData = {
    user: {
      email: user.email,
      role: user.role,
      created_at: user.created_at,
      household_name: user.household_name
    },
    members: membersResult.rows,
    assets: assetsResult.rows,
    income: incomeResult.rows,
    contracts: contractsResult.rows
  };

  res.json(exportData);
}));

export default router;

