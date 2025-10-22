import express from 'express';
import { query } from '../config/database';
import { exchangeRateService } from '../services/exchangeRateService';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Get dashboard summary
router.get('/summary', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const userId = req.user.id;
  const mainCurrency = req.user.main_currency || 'USD';

  // Get total assets by currency
  const assetsResult = await query(
    `SELECT currency, SUM(amount) as total_amount, COUNT(*) as count
     FROM assets
     WHERE user_id = $1
     GROUP BY currency`,
    [userId]
  );

  // Convert to main currency
  const currencyBreakdown = [];
  let totalInMainCurrency = 0;

  for (const asset of assetsResult.rows) {
    try {
      const convertedAmount = await exchangeRateService.convertCurrency(
        parseFloat(asset.total_amount),
        asset.currency,
        mainCurrency
      );

      currencyBreakdown.push({
        currency: asset.currency,
        amount: parseFloat(asset.total_amount),
        converted_amount: convertedAmount,
        count: parseInt(asset.count)
      });

      totalInMainCurrency += convertedAmount;
    } catch (error) {
      console.error(`Failed to convert ${asset.currency} to ${mainCurrency}:`, error);
    }
  }

  // Get recent income entries (last 10)
  const recentIncomeResult = await query(
    `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = 'income'
     ORDER BY a.date DESC, a.created_at DESC
     LIMIT 10`,
    [userId]
  );

  // Get monthly income stats
  const monthlyIncomeResult = await query(
    `SELECT 
       DATE_TRUNC('month', a.date) as month,
       SUM(a.amount) as total_amount,
       a.currency,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = 'income'
       AND a.date >= CURRENT_DATE - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', a.date), a.currency
     ORDER BY month DESC`,
    [userId]
  );

  // Get income by category (last 6 months)
  const categoryIncomeResult = await query(
    `SELECT 
       ac.name_en as category_name_en,
       ac.name_de as category_name_de,
       ac.name_tr as category_name_tr,
       SUM(a.amount) as total_amount,
       a.currency,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = 'income'
       AND a.date >= CURRENT_DATE - INTERVAL '6 months'
     GROUP BY ac.id, ac.name_en, ac.name_de, ac.name_tr, a.currency
     ORDER BY total_amount DESC`,
    [userId]
  );

  // Get upcoming contract renewals (next 30 days)
  const upcomingRenewalsResult = await query(
    `SELECT c.*, cc.name_en as category_name_en, cc.name_de as category_name_de, cc.name_tr as category_name_tr
     FROM contracts c
     JOIN contract_categories cc ON c.category_id = cc.id
     WHERE c.household_id = $1 
       AND c.status = 'active'
       AND c.renewal_date IS NOT NULL
       AND c.renewal_date <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY c.renewal_date ASC
     LIMIT 10`,
    [req.user.household_id]
  );

  // Get unread notifications
  const notificationsResult = await query(
    `SELECT * FROM notifications
     WHERE user_id = $1 AND read = false
     ORDER BY created_at DESC
     LIMIT 5`,
    [userId]
  );

  // Get quick stats
  const quickStatsResult = await query(
    `SELECT 
       COUNT(CASE WHEN ac.type = 'income' THEN 1 END) as income_entries,
       COUNT(CASE WHEN ac.type = 'expense' THEN 1 END) as expense_entries,
       COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_contracts
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     LEFT JOIN contracts c ON c.household_id = $2
     WHERE a.user_id = $1`,
    [userId, req.user.household_id]
  );

  const quickStats = quickStatsResult.rows[0];

  res.json({
    summary: {
      total_assets_main_currency: totalInMainCurrency,
      main_currency: mainCurrency,
      currency_breakdown: currencyBreakdown,
      quick_stats: {
        income_entries: parseInt(quickStats.income_entries) || 0,
        expense_entries: parseInt(quickStats.expense_entries) || 0,
        active_contracts: parseInt(quickStats.active_contracts) || 0
      }
    },
    recent_income: recentIncomeResult.rows,
    monthly_income: monthlyIncomeResult.rows,
    category_income: categoryIncomeResult.rows,
    upcoming_renewals: upcomingRenewalsResult.rows,
    notifications: notificationsResult.rows,
    timestamp: new Date().toISOString()
  });
}));

// Get dashboard statistics for charts
router.get('/stats', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const userId = req.user.id;
  const { period = '6months', type = 'income' } = req.query;

  let dateFilter = '';
  switch (period) {
    case '1month':
      dateFilter = "AND a.date >= CURRENT_DATE - INTERVAL '1 month'";
      break;
    case '3months':
      dateFilter = "AND a.date >= CURRENT_DATE - INTERVAL '3 months'";
      break;
    case '6months':
      dateFilter = "AND a.date >= CURRENT_DATE - INTERVAL '6 months'";
      break;
    case '1year':
      dateFilter = "AND a.date >= CURRENT_DATE - INTERVAL '1 year'";
      break;
    default:
      dateFilter = "AND a.date >= CURRENT_DATE - INTERVAL '6 months'";
  }

  // Income over time (monthly)
  const incomeOverTimeResult = await query(
    `SELECT 
       DATE_TRUNC('month', a.date) as month,
       SUM(a.amount) as total_amount,
       a.currency
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = $2 ${dateFilter}
     GROUP BY DATE_TRUNC('month', a.date), a.currency
     ORDER BY month ASC`,
    [userId, type]
  );

  // Income by category
  const incomeByCategoryResult = await query(
    `SELECT 
       ac.name_en as category_name,
       SUM(a.amount) as total_amount,
       a.currency,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = $2 ${dateFilter}
     GROUP BY ac.id, ac.name_en, a.currency
     ORDER BY total_amount DESC`,
    [userId, type]
  );

  // Currency distribution
  const currencyDistributionResult = await query(
    `SELECT 
       a.currency,
       SUM(a.amount) as total_amount,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = $2 ${dateFilter}
     GROUP BY a.currency
     ORDER BY total_amount DESC`,
    [userId, type]
  );

  res.json({
    income_over_time: incomeOverTimeResult.rows,
    income_by_category: incomeByCategoryResult.rows,
    currency_distribution: currencyDistributionResult.rows,
    period,
    type,
    timestamp: new Date().toISOString()
  });
}));

// Get household dashboard summary (if user has access)
router.get('/household/:householdId/summary', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const { householdId } = req.params;
  const mainCurrency = req.user.main_currency || 'USD';

  // Check if user has permission to view this household
  if (req.user.role !== 'admin' && req.user.household_id !== parseInt(householdId)) {
    throw new Error('Access denied to this household');
  }

  // Get household assets by currency
  const assetsResult = await query(
    `SELECT currency, SUM(amount) as total_amount, COUNT(*) as count
     FROM assets
     WHERE household_id = $1
     GROUP BY currency`,
    [householdId]
  );

  // Convert to main currency
  const currencyBreakdown = [];
  let totalInMainCurrency = 0;

  for (const asset of assetsResult.rows) {
    try {
      const convertedAmount = await exchangeRateService.convertCurrency(
        parseFloat(asset.total_amount),
        asset.currency,
        mainCurrency
      );

      currencyBreakdown.push({
        currency: asset.currency,
        amount: parseFloat(asset.total_amount),
        converted_amount: convertedAmount,
        count: parseInt(asset.count)
      });

      totalInMainCurrency += convertedAmount;
    } catch (error) {
      console.error(`Failed to convert ${asset.currency} to ${mainCurrency}:`, error);
    }
  }

  // Get household members
  const membersResult = await query(
    `SELECT u.id, u.email, u.preferred_language, u.main_currency, u.created_at
     FROM users u
     WHERE u.household_id = $1
     ORDER BY u.created_at`,
    [householdId]
  );

  // Get household contracts
  const contractsResult = await query(
    `SELECT c.*, cc.name_en as category_name_en, cc.name_de as category_name_de, cc.name_tr as category_name_tr
     FROM contracts c
     JOIN contract_categories cc ON c.category_id = cc.id
     WHERE c.household_id = $1
     ORDER BY c.created_at DESC`,
    [householdId]
  );

  res.json({
    household_id: parseInt(householdId),
    summary: {
      total_assets_main_currency: totalInMainCurrency,
      main_currency: mainCurrency,
      currency_breakdown: currencyBreakdown,
      member_count: membersResult.rows.length,
      contract_count: contractsResult.rows.length
    },
    members: membersResult.rows,
    contracts: contractsResult.rows,
    timestamp: new Date().toISOString()
  });
}));

export default router;
