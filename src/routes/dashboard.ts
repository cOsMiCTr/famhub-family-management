import express from 'express';
import { query } from '../config/database';
import { exchangeRateService } from '../services/exchangeRateService';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticateToken } from '../middleware/auth';
import ModuleService from '../services/moduleService';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// Get dashboard summary
router.get('/summary', asyncHandler(async (req, res) => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }

  const userId = req.user.id;
  const mainCurrency = req.user.main_currency || 'USD';

  // Check module access
  const hasIncomeModule = await ModuleService.hasModuleAccess(userId, 'income');
  const hasAssetsModule = await ModuleService.hasModuleAccess(userId, 'assets');
  const hasExpensesModule = await ModuleService.hasModuleAccess(userId, 'expenses');

  // Get total assets by currency (only if user has assets module)
  let assetsResult = { rows: [] };
  if (hasAssetsModule) {
    // Show only personal assets (user owns or has share in)
    // Get user's household member ID
    const userMemberResult = await query(
      'SELECT id FROM household_members WHERE user_id = $1',
      [userId]
    );
    
    if (userMemberResult.rows.length > 0) {
      const userMemberId = userMemberResult.rows[0].id;
      assetsResult = await query(
        `SELECT currency, SUM(COALESCE(current_value, amount)) as total_amount, COUNT(*) as count
         FROM assets a
         WHERE (a.user_id = $1 OR EXISTS (
           SELECT 1 FROM shared_ownership_distribution 
           WHERE asset_id = a.id AND household_member_id = $2
         )) AND status = 'active'
         GROUP BY currency`,
        [userId, userMemberId]
      );
    } else {
      // Fallback if no household member record
      assetsResult = await query(
        `SELECT currency, SUM(COALESCE(current_value, amount)) as total_amount, COUNT(*) as count
         FROM assets
         WHERE user_id = $1 AND status = 'active'
         GROUP BY currency`,
        [userId]
      );
    }
  }

  // Get total income by currency (only if user has income module)
  let incomeResult = { rows: [] };
  if (hasIncomeModule) {
    incomeResult = await query(
      `SELECT i.currency, SUM(i.amount) as total_amount, COUNT(*) as count
       FROM income i
       JOIN users u ON i.household_id = u.household_id
       WHERE u.id = $1
       GROUP BY i.currency`,
      [userId]
    );
  }

  // Get total expenses by currency (only if user has expenses module)
  let expensesResult = { rows: [] };
  if (hasExpensesModule) {
    expensesResult = await query(
      `SELECT e.currency, SUM(e.amount) as total_amount, COUNT(*) as count
       FROM expenses e
       JOIN users u ON e.household_id = u.household_id
       WHERE u.id = $1
       GROUP BY e.currency`,
      [userId]
    );
  }

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

  // Convert income to main currency
  const incomeBreakdown = [];
  let totalIncomeInMainCurrency = 0;

  for (const income of incomeResult.rows) {
    try {
      const convertedAmount = await exchangeRateService.convertCurrency(
        parseFloat(income.total_amount),
        income.currency,
        mainCurrency
      );

      incomeBreakdown.push({
        currency: income.currency,
        amount: parseFloat(income.total_amount),
        converted_amount: convertedAmount,
        count: parseInt(income.count)
      });

      totalIncomeInMainCurrency += convertedAmount;
    } catch (error) {
      console.error(`Error converting income ${income.currency} to ${mainCurrency}:`, error);
    }
  }

  // Convert expenses to main currency
  const expensesBreakdown = [];
  let totalExpensesInMainCurrency = 0;

  for (const expense of expensesResult.rows) {
    try {
      const convertedAmount = await exchangeRateService.convertCurrency(
        parseFloat(expense.total_amount),
        expense.currency,
        mainCurrency
      );

      expensesBreakdown.push({
        currency: expense.currency,
        amount: parseFloat(expense.total_amount),
        converted_amount: convertedAmount,
        count: parseInt(expense.count)
      });

      totalExpensesInMainCurrency += convertedAmount;
    } catch (error) {
      console.error(`Error converting expenses ${expense.currency} to ${mainCurrency}:`, error);
    }
  }

  // Get recent income entries (last 10) - only if user has income module
  let recentIncomeResult = { rows: [] };
  let monthlyIncomeResult = { rows: [] };
  let categoryIncomeResult = { rows: [] };
  
  if (hasIncomeModule) {
    recentIncomeResult = await query(
      `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr
       FROM assets a
       JOIN asset_categories ac ON a.category_id = ac.id
       WHERE a.user_id = $1 AND ac.type = 'income'
       ORDER BY a.date DESC, a.created_at DESC
       LIMIT 10`,
      [userId]
    );

    // Get monthly income stats
    monthlyIncomeResult = await query(
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
    categoryIncomeResult = await query(
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
  }

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

  // Get quick stats (filter by module access - return 0 if module revoked)
  // Get quick stats for income and expenses entries
  let incomeEntriesCount = 0;
  let expenseEntriesCount = 0;
  
  if (hasIncomeModule) {
    const incomeCountResult = await query(
      `SELECT COUNT(*) as count
       FROM income i
       JOIN users u ON i.household_id = u.household_id
       WHERE u.id = $1`,
      [userId]
    );
    incomeEntriesCount = parseInt(incomeCountResult.rows[0]?.count || '0');
  }
  
  if (hasExpensesModule) {
    const expenseCountResult = await query(
      `SELECT COUNT(*) as count
       FROM expenses e
       JOIN users u ON e.household_id = u.household_id
       WHERE u.id = $1`,
      [userId]
    );
    expenseEntriesCount = parseInt(expenseCountResult.rows[0]?.count || '0');
  }
  
  const quickStats = {
    income_entries: incomeEntriesCount,
    expense_entries: expenseEntriesCount,
    active_contracts: 0 // Contracts removed
  };

  // Get household members count (total family members, not just users)
  const membersResult = await query(
    `SELECT COUNT(*) as member_count
     FROM household_members hm
     WHERE hm.household_id = $1`,
    [req.user.household_id]
  );

  // Get current month income and convert to main currency (only if user has income module)
  let monthlyIncomeInMainCurrency = 0;
  if (hasIncomeModule) {
    const monthlyIncomeResult_RAW = await query(
      `SELECT 
         SUM(CASE 
           WHEN i.is_recurring = true AND i.frequency = 'monthly' THEN i.amount
           WHEN i.is_recurring = true AND i.frequency = 'weekly' THEN i.amount * 4.33
           WHEN i.is_recurring = true AND i.frequency = 'yearly' THEN i.amount / 12
           ELSE 0 
         END) as monthly_amount,
         i.currency
       FROM income i
       JOIN users u ON i.household_id = u.household_id
       WHERE u.id = $1 AND i.is_recurring = true
         AND (i.end_date IS NULL OR i.end_date >= CURRENT_DATE)
       GROUP BY i.currency`,
      [userId]
    );

    for (const income of monthlyIncomeResult_RAW.rows) {
      try {
        const convertedAmount = await exchangeRateService.convertCurrency(
          parseFloat(income.monthly_amount || 0),
          income.currency,
          mainCurrency
        );
        monthlyIncomeInMainCurrency += convertedAmount;
      } catch (error) {
        console.error(`Error converting monthly income ${income.currency} to ${mainCurrency}:`, error);
      }
    }
  }

  // Calculate monthly expenses (only if user has expenses module)
  let monthlyExpensesInMainCurrency = 0;
  if (hasExpensesModule) {
    const monthlyExpensesResult_RAW = await query(
      `SELECT 
         SUM(CASE 
           WHEN e.is_recurring = true AND e.frequency = 'monthly' THEN e.amount
           WHEN e.is_recurring = true AND e.frequency = 'weekly' THEN e.amount * 4.33
           WHEN e.is_recurring = true AND e.frequency = 'yearly' THEN e.amount / 12
           ELSE 0 
         END) as monthly_amount,
         e.currency
       FROM expenses e
       JOIN users u ON e.household_id = u.household_id
       WHERE u.id = $1 AND e.is_recurring = true
         AND (e.end_date IS NULL OR e.end_date >= CURRENT_DATE)
       GROUP BY e.currency`,
      [userId]
    );

    for (const expense of monthlyExpensesResult_RAW.rows) {
      try {
        const convertedAmount = await exchangeRateService.convertCurrency(
          parseFloat(expense.monthly_amount || 0),
          expense.currency,
          mainCurrency
        );
        monthlyExpensesInMainCurrency += convertedAmount;
      } catch (error) {
        console.error(`Error converting monthly expenses ${expense.currency} to ${mainCurrency}:`, error);
      }
    }
  }


  // Get exchange rates for user's main currency
  const exchangeRates = await exchangeRateService.getAllExchangeRates();
  
  // Get active currencies from database
  const activeCurrenciesResult = await query(
    'SELECT code FROM currencies WHERE is_active = true'
  );
  const activeCurrencyCodes = activeCurrenciesResult.rows.map(row => row.code);
  
  // Filter rates to only include active currencies (excluding user's main currency)
  const relevantRates = exchangeRates.filter(rate => 
    rate.from_currency === mainCurrency && 
    activeCurrencyCodes.includes(rate.to_currency) &&
    rate.to_currency !== mainCurrency
  );

  // Build summary response based on module access
  const summary: any = {
    main_currency: mainCurrency,
    member_count: parseInt(membersResult.rows[0].member_count) || 0,
    quick_stats: {
      income_entries: quickStats.income_entries || 0,
      expense_entries: quickStats.expense_entries || 0,
      active_contracts: 0, // Contracts removed
    }
  };

  if (hasAssetsModule) {
    summary.total_assets_main_currency = totalInMainCurrency;
    summary.currency_breakdown = currencyBreakdown;
  } else {
    // Module revoked - set to 0
    summary.total_assets_main_currency = 0;
    summary.currency_breakdown = [];
  }

  if (hasIncomeModule) {
    summary.total_income_main_currency = totalIncomeInMainCurrency;
    summary.income_breakdown = incomeBreakdown;
    summary.quick_stats.monthly_income = monthlyIncomeInMainCurrency;
  } else {
    // Module revoked - set to 0
    summary.total_income_main_currency = 0;
    summary.income_breakdown = [];
    summary.quick_stats.monthly_income = 0;
  }

  if (hasExpensesModule) {
    summary.total_expenses_main_currency = totalExpensesInMainCurrency;
    summary.expenses_breakdown = expensesBreakdown;
    summary.quick_stats.monthly_expenses = monthlyExpensesInMainCurrency;
  } else {
    // Module revoked - set to 0
    summary.total_expenses_main_currency = 0;
    summary.expenses_breakdown = [];
    summary.quick_stats.monthly_expenses = 0;
  }

  const response: any = {
    summary,
    exchange_rates: relevantRates,
    notifications: notificationsResult.rows,
    timestamp: new Date().toISOString()
  };

  // Only include income-related data if user has income module
  if (hasIncomeModule) {
    response.recent_income = recentIncomeResult.rows;
    response.monthly_income = monthlyIncomeResult.rows;
    response.category_income = categoryIncomeResult.rows;
  }

  res.json(response);
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
