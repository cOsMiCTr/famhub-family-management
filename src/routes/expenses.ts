import express from 'express';
import { body, param, query as expressQuery, validationResult } from 'express-validator';
import { query } from '../config/database';
import { authenticateToken } from '../middleware/auth';
import { requireModule } from '../middleware/moduleAuth';
import { exchangeRateService } from '../services/exchangeRateService';
import { getActiveCurrencyCodes } from '../utils/currencyHelpers';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);
// Apply module protection - expenses module required
router.use(requireModule('expenses'));

// Helper function to log expense changes
async function logExpenseChange(
  expenseId: number,
  userId: number,
  changeType: 'created' | 'updated' | 'deleted',
  oldValues: any = null,
  newValues: any = null
) {
  try {
    await query(
      `INSERT INTO expense_history (expense_id, changed_by_user_id, change_type, old_values, new_values)
       VALUES ($1, $2, $3, $4, $5)`,
      [expenseId, userId, changeType, oldValues ? JSON.stringify(oldValues) : null, newValues ? JSON.stringify(newValues) : null]
    );
  } catch (error) {
    console.error('Error logging expense change:', error);
    // Don't throw - logging failure shouldn't break the main operation
  }
}

// Helper function to validate asset link
async function validateAssetLink(assetId: number, householdId: number): Promise<{ valid: boolean; isRealEstate: boolean; error?: string }> {
  try {
    const assetResult = await query(
      `SELECT a.*, ac.category_type as asset_category_type
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.id
       WHERE a.id = $1 AND a.household_id = $2`,
      [assetId, householdId]
    );

    if (assetResult.rows.length === 0) {
      return { valid: false, isRealEstate: false, error: 'Asset not found or does not belong to your household' };
    }

    const isRealEstate = assetResult.rows[0].asset_category_type === 'real_estate';
    return { valid: true, isRealEstate };
  } catch (error) {
    console.error('Error validating asset link:', error);
    return { valid: false, isRealEstate: false, error: 'Error validating asset' };
  }
}

// Helper function to validate member links
async function validateMemberLinks(memberIds: number[], householdId: number): Promise<{ valid: boolean; error?: string }> {
  if (!memberIds || memberIds.length === 0) {
    return { valid: true };
  }

  try {
    const memberResult = await query(
      `SELECT id FROM household_members 
       WHERE id = ANY($1::int[]) AND household_id = $2`,
      [memberIds, householdId]
    );

    if (memberResult.rows.length !== memberIds.length) {
      return { valid: false, error: 'One or more members do not belong to your household' };
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating member links:', error);
    return { valid: false, error: 'Error validating members' };
  }
}

// Helper function to validate category requirements
async function validateCategoryRequirements(categoryId: number, expenseData: any, householdId: number): Promise<{ valid: boolean; error?: string }> {
  try {
    const categoryResult = await query(
      `SELECT requires_asset_link, requires_member_link, category_type
       FROM expense_categories
       WHERE id = $1`,
      [categoryId]
    );

    if (categoryResult.rows.length === 0) {
      return { valid: false, error: 'Category not found' };
    }

    const category = categoryResult.rows[0];

    // Check requires_asset_link
    if (category.requires_asset_link && !expenseData.linked_asset_id) {
      return { valid: false, error: 'This category requires linking to a property/asset' };
    }

    // Check requires_member_link
    if (category.requires_member_link) {
      if (category.category_type === 'gift') {
        // For gifts, check expense_member_links
        if (!expenseData.linked_member_ids || expenseData.linked_member_ids.length === 0) {
          return { valid: false, error: 'This category requires linking to at least one household member' };
        }
      } else {
        // For other categories, check household_member_id
        if (!expenseData.household_member_id) {
          return { valid: false, error: 'This category requires selecting a household member' };
        }
      }
    }

    // Validate credit use type
    if (category.category_type === 'credit') {
      if (!expenseData.credit_use_type) {
        return { valid: false, error: 'Credit expense requires a use type' };
      }
      
      // If renovation or property_purchase, asset link should be required
      if ((expenseData.credit_use_type === 'renovation' || expenseData.credit_use_type === 'property_purchase') && !expenseData.linked_asset_id) {
        return { valid: false, error: 'Renovation or property purchase credit requires linking to a property' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('Error validating category requirements:', error);
    return { valid: false, error: 'Error validating category requirements' };
  }
}

// Get all expenses with filters
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { start_date, end_date, member_id, category_id, is_recurring, shared_with_me } = req.query;

    // Get user's household_id and main_currency
    const userResult = await query('SELECT household_id, main_currency FROM users WHERE id = $1', [userId]);
    const householdId = userResult.rows[0]?.household_id;
    const mainCurrency = userResult.rows[0]?.main_currency || 'TRY';

    if (!householdId) {
      return res.status(400).json({ error: 'User is not assigned to a household' });
    }

    // Build query with filters
    let queryText = `
      SELECT e.*, 
             ec.name_en as category_name_en,
             ec.name_de as category_name_de,
             ec.name_tr as category_name_tr,
             ec.category_type,
             ec.has_custom_form,
             ec.requires_asset_link,
             ec.requires_member_link,
             ec.allows_multiple_members,
             hm.name as member_name,
             hm.is_shared as member_is_shared,
             u.email as creator_email,
             a.name as linked_asset_name,
             a.location as linked_asset_location,
             ac.category_type as linked_asset_category_type
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN household_members hm ON e.household_member_id = hm.id
      LEFT JOIN users u ON e.created_by_user_id = u.id
      LEFT JOIN assets a ON e.linked_asset_id = a.id
      LEFT JOIN asset_categories ac ON a.category_id = ac.id
      WHERE e.household_id = $1
    `;
    
    const queryParams: any[] = [householdId];
    let paramIndex = 2;

    // Filter by date range (checks if expense period overlaps with search range)
    if (start_date) {
      queryText += ` AND (e.end_date IS NULL OR e.end_date >= $${paramIndex})`;
      queryParams.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      queryText += ` AND e.start_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // Filter by household member
    if (member_id) {
      queryText += ` AND e.household_member_id = $${paramIndex}`;
      queryParams.push(member_id);
      paramIndex++;
    }

    // Filter by category
    if (category_id) {
      queryText += ` AND e.category_id = $${paramIndex}`;
      queryParams.push(category_id);
      paramIndex++;
    }

    // Filter by recurring status
    if (is_recurring !== undefined) {
      queryText += ` AND e.is_recurring = $${paramIndex}`;
      queryParams.push(is_recurring === 'true');
      paramIndex++;
    }

    // Filter by linked asset
    if (req.query.linked_asset_id) {
      queryText += ` AND e.linked_asset_id = $${paramIndex}`;
      queryParams.push(req.query.linked_asset_id);
      paramIndex++;
    }

    // Filter by credit use type
    if (req.query.credit_use_type) {
      queryText += ` AND e.credit_use_type = $${paramIndex}`;
      queryParams.push(req.query.credit_use_type);
      paramIndex++;
    }

    // Filter by category type
    if (req.query.category_type) {
      queryText += ` AND ec.category_type = $${paramIndex}`;
      queryParams.push(req.query.category_type);
      paramIndex++;
    }

    // Filter by shared_with_me - show expenses shared via accepted connections
    if (shared_with_me === 'true') {
      queryText += ` AND EXISTS (
        SELECT 1 FROM external_person_user_connections c
        INNER JOIN expense_external_person_links epl ON epl.external_person_id = c.external_person_id
        WHERE epl.expense_id = e.id
        AND c.status = 'accepted'
        AND (c.invited_user_id = $${paramIndex} OR c.invited_by_user_id = $${paramIndex})
      )`;
      queryParams.push(userId);
      paramIndex++;
    }

    queryText += ' ORDER BY e.start_date DESC, e.created_at DESC';

    const result = await query(queryText, queryParams);

    // Fetch linked members for each expense
    const expenseIds = result.rows.map((e: any) => e.id);
    let linkedMembersMap: { [key: number]: any[] } = {};
    
    if (expenseIds.length > 0) {
      // Build member filter if specified
      let memberFilterQuery = '';
      let memberFilterParams: any[] = [];
      let memberParamIndex = 2; // Start after $1 for expenseIds array

      if (req.query.linked_member_ids) {
        const memberIds = Array.isArray(req.query.linked_member_ids) 
          ? req.query.linked_member_ids.map(id => parseInt(id as string))
          : [parseInt(req.query.linked_member_ids as string)];
        memberFilterQuery = `AND eml.household_member_id = ANY($${memberParamIndex}::int[])`;
        memberFilterParams = [memberIds];
        memberParamIndex++;
      }

      const membersQueryParams = [expenseIds, ...memberFilterParams];
      const membersResult = await query(
        `SELECT eml.expense_id, eml.household_member_id, hm.name as member_name
         FROM expense_member_links eml
         JOIN household_members hm ON eml.household_member_id = hm.id
         WHERE eml.expense_id = ANY($1::int[]) ${memberFilterQuery}`,
        membersQueryParams
      );

      // Group by expense_id
      for (const row of membersResult.rows) {
        if (!linkedMembersMap[row.expense_id]) {
          linkedMembersMap[row.expense_id] = [];
        }
        linkedMembersMap[row.expense_id].push({
          id: row.household_member_id,
          name: row.member_name
        });
      }
    }

    // Get shared info if shared_with_me filter is active
    let sharedExpensesMap: { [key: number]: { shared_from_user_id: number; is_read_only: boolean } } = {};
    if (shared_with_me === 'true') {
      const expenseIds = result.rows.map((e: any) => e.id);
      if (expenseIds.length > 0) {
        const sharedInfoResult = await query(
          `SELECT DISTINCT epl.expense_id, c.invited_by_user_id as shared_from_user_id
           FROM expense_external_person_links epl
           INNER JOIN external_person_user_connections c ON c.external_person_id = epl.external_person_id
           WHERE epl.expense_id = ANY($1::int[])
           AND c.status = 'accepted'
           AND (c.invited_user_id = $2 OR c.invited_by_user_id = $2)`,
          [expenseIds, userId]
        );
        
        for (const row of sharedInfoResult.rows) {
          sharedExpensesMap[row.expense_id] = {
            shared_from_user_id: row.shared_from_user_id,
            is_read_only: true
          };
        }
      }
    }

    // Convert amounts to user's main currency and add linked members
    const expensesWithConvertedAmounts = await Promise.all(
      result.rows.map(async (expense) => {
        try {
          let convertedAmount = expense.amount;
          if (expense.currency !== mainCurrency) {
            convertedAmount = await exchangeRateService.convertCurrency(
              expense.amount,
              expense.currency,
              mainCurrency
            );
          }

          // Parse metadata if it's a string
          let metadata = expense.metadata;
          if (typeof metadata === 'string') {
            try {
              metadata = JSON.parse(metadata);
            } catch {
              metadata = null;
            }
          }

          const sharedInfo = sharedExpensesMap[expense.id];
          return {
            ...expense,
            amount_in_main_currency: convertedAmount,
            main_currency: mainCurrency,
            linked_member_ids: linkedMembersMap[expense.id]?.map((m: any) => m.id) || [],
            linked_member_names: linkedMembersMap[expense.id]?.map((m: any) => m.name) || [],
            metadata: metadata,
            is_shared: !!sharedInfo,
            shared_from_user_id: sharedInfo?.shared_from_user_id || null,
            is_read_only: sharedInfo?.is_read_only || false
          };
        } catch (error) {
          console.error(`Failed to convert ${expense.currency} to ${mainCurrency}:`, error);
          // Return original amount if conversion fails
          const sharedInfo = sharedExpensesMap[expense.id];
          return {
            ...expense,
            amount_in_main_currency: expense.amount,
            main_currency: mainCurrency,
            linked_member_ids: linkedMembersMap[expense.id]?.map((m: any) => m.id) || [],
            linked_member_names: linkedMembersMap[expense.id]?.map((m: any) => m.name) || [],
            metadata: typeof expense.metadata === 'string' ? (() => { try { return JSON.parse(expense.metadata); } catch { return null; } })() : expense.metadata,
            is_shared: !!sharedInfo,
            shared_from_user_id: sharedInfo?.shared_from_user_id || null,
            is_read_only: sharedInfo?.is_read_only || false
          };
        }
      })
    );

    res.json(expensesWithConvertedAmounts);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// Get expense summary (totals by period, member, category)
// GET /api/expenses/linkable-assets
// Get list of real estate assets that can be linked to expenses
router.get('/linkable-assets', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's household
    const householdResult = await query(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
      return res.json([]);
    }
    
    const householdId = householdResult.rows[0].household_id;
    
    // Get only real estate assets
    const assetsResult = await query(
      `SELECT a.id, a.name, a.location, ac.category_type
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.id
       WHERE a.household_id = $1 
         AND ac.category_type = 'real_estate'
         AND a.status != 'sold'
       ORDER BY a.name ASC`,
      [householdId]
    );
    
    res.json(assetsResult.rows);
  } catch (error) {
    console.error('Error fetching linkable assets:', error);
    res.status(500).json({ error: 'Failed to fetch linkable assets' });
  }
});

// GET /api/expenses/linkable-members
// Get list of household members that can be linked to expenses
router.get('/linkable-members', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's household
    const householdResult = await query(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
      return res.json([]);
    }
    
    const householdId = householdResult.rows[0].household_id;
    
    // Get household members
    const membersResult = await query(
      `SELECT id, name, date_of_birth
       FROM household_members
       WHERE household_id = $1
       ORDER BY name ASC`,
      [householdId]
    );
    
    res.json(membersResult.rows);
  } catch (error) {
    console.error('Error fetching linkable members:', error);
    res.status(500).json({ error: 'Failed to fetch linkable members' });
  }
});

// GET /api/expenses/linkable-vehicles
// Get list of vehicle assets that can be linked to car insurance expenses
router.get('/linkable-vehicles', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's household
    const householdResult = await query(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
      return res.json([]);
    }
    
    const householdId = householdResult.rows[0].household_id;
    
    // Get only vehicle assets
    const vehiclesResult = await query(
      `SELECT a.id, a.name, a.location, ac.category_type
       FROM assets a
       LEFT JOIN asset_categories ac ON a.category_id = ac.id
       WHERE a.household_id = $1 
         AND ac.category_type = 'vehicles'
         AND a.status != 'sold'
       ORDER BY a.name ASC`,
      [householdId]
    );
    
    res.json(vehiclesResult.rows);
  } catch (error) {
    console.error('Error fetching linkable vehicles:', error);
    res.status(500).json({ error: 'Failed to fetch linkable vehicles' });
  }
});

// GET /api/expenses/insurance-companies-suggestions
// Get suggested insurance companies from previous entries
router.get('/insurance-companies-suggestions', async (req, res) => {
  try {
    const userId = req.user!.id;
    
    // Get user's household
    const householdResult = await query(
      'SELECT household_id FROM users WHERE id = $1',
      [userId]
    );
    
    if (householdResult.rows.length === 0 || !householdResult.rows[0].household_id) {
      return res.json([]);
    }
    
    const householdId = householdResult.rows[0].household_id;
    
    // Get insurance expenses and extract company names from metadata
    const result = await query(
      `SELECT 
         metadata->>'insurance_company' as company_name,
         COUNT(*) as usage_count,
         MAX(created_at) as last_used_at
       FROM expenses e
       INNER JOIN expense_categories ec ON e.category_id = ec.id
       WHERE e.household_id = $1
         AND ec.category_type = 'insurance'
         AND metadata->>'insurance_company' IS NOT NULL
         AND metadata->>'insurance_company' != ''
       GROUP BY metadata->>'insurance_company'
       ORDER BY usage_count DESC, last_used_at DESC
       LIMIT 20`,
      [householdId]
    );
    
    res.json(result.rows.map(row => ({
      name: row.company_name,
      usageCount: parseInt(row.usage_count),
      lastUsed: row.last_used_at
    })));
  } catch (error) {
    console.error('Error fetching insurance company suggestions:', error);
    res.status(500).json({ error: 'Failed to fetch insurance company suggestions' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { start_date, end_date, group_by } = req.query;

    // Get user's household_id
    const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
    const householdId = userResult.rows[0]?.household_id;

    if (!householdId) {
      return res.status(400).json({ error: 'User is not assigned to a household' });
    }

    // Base query
    let baseQuery = `
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      LEFT JOIN household_members hm ON e.household_member_id = hm.id
      WHERE e.household_id = $1
    `;
    const queryParams: any[] = [householdId];
    let paramIndex = 2;

    // Add date filters
    if (start_date) {
      baseQuery += ` AND (e.end_date IS NULL OR e.end_date >= $${paramIndex})`;
      queryParams.push(start_date);
      paramIndex++;
    }
    if (end_date) {
      baseQuery += ` AND e.start_date <= $${paramIndex}`;
      queryParams.push(end_date);
      paramIndex++;
    }

    // Get comprehensive statistics with monthly calculations
    const statsResult = await query(
      `SELECT 
        SUM(e.amount) as total,
        COUNT(*) as count,
        AVG(e.amount) as average,
        MIN(e.amount) as min_amount,
        MAX(e.amount) as max_amount,
        COUNT(CASE WHEN e.is_recurring = true THEN 1 END) as recurring_count,
        COUNT(CASE WHEN e.is_recurring = false THEN 1 END) as one_time_count,
        SUM(CASE WHEN e.is_recurring = true THEN e.amount ELSE 0 END) as recurring_total,
        SUM(CASE WHEN e.is_recurring = false THEN e.amount ELSE 0 END) as one_time_total,
        -- Monthly calculations for recurring expenses
        SUM(CASE 
          WHEN e.is_recurring = true AND e.frequency = 'monthly' THEN e.amount
          WHEN e.is_recurring = true AND e.frequency = 'weekly' THEN e.amount * 4.33
          WHEN e.is_recurring = true AND e.frequency = 'yearly' THEN e.amount / 12
          ELSE 0 
        END) as monthly_recurring_total,
        SUM(CASE WHEN e.is_recurring = false THEN e.amount ELSE 0 END) as one_time_total
       ${baseQuery}`,
      queryParams
    );

    // Get breakdown by group
    let breakdownResult;
    if (group_by === 'member') {
      breakdownResult = await query(
        `SELECT 
          hm.id as member_id,
          hm.name as member_name,
          hm.is_shared,
          SUM(e.amount) as total,
          COUNT(*) as count
         ${baseQuery}
         GROUP BY hm.id, hm.name, hm.is_shared
         ORDER BY total DESC`,
        queryParams
      );
    } else if (group_by === 'category') {
      breakdownResult = await query(
        `SELECT 
          ec.id as category_id,
          ec.name_en as category_name_en,
          ec.name_de as category_name_de,
          ec.name_tr as category_name_tr,
          SUM(e.amount) as total,
          COUNT(*) as count
         ${baseQuery}
         GROUP BY ec.id, ec.name_en, ec.name_de, ec.name_tr
         ORDER BY total DESC`,
        queryParams
      );
    } else {
      breakdownResult = { rows: [] };
    }

    // Get breakdown by linked assets (properties)
    let assetsQuery = `
      SELECT 
        a.id as asset_id,
        a.name as asset_name,
        a.location as asset_location,
        SUM(e.amount) as total,
        COUNT(*) as count,
        AVG(e.amount) as average
      FROM expenses e
      LEFT JOIN assets a ON e.linked_asset_id = a.id
      WHERE e.household_id = $1 AND e.linked_asset_id IS NOT NULL
    `;
    const assetsParams = [householdId];
    let assetsParamIndex = 2;
    if (start_date) {
      assetsQuery += ` AND (e.end_date IS NULL OR e.end_date >= $${assetsParamIndex})`;
      assetsParams.push(start_date);
      assetsParamIndex++;
    }
    if (end_date) {
      assetsQuery += ` AND e.start_date <= $${assetsParamIndex}`;
      assetsParams.push(end_date);
    }
    assetsQuery += ` GROUP BY a.id, a.name, a.location ORDER BY total DESC`;
    const assetsBreakdownResult = await query(assetsQuery, assetsParams);

    // Get breakdown by credit use type
    let creditQuery = `
      SELECT 
        e.credit_use_type,
        SUM(e.amount) as total,
        COUNT(*) as count,
        AVG(e.amount) as average
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.household_id = $1 
        AND ec.category_type = 'credit' 
        AND e.credit_use_type IS NOT NULL
    `;
    const creditParams = [householdId];
    let creditParamIndex = 2;
    if (start_date) {
      creditQuery += ` AND (e.end_date IS NULL OR e.end_date >= $${creditParamIndex})`;
      creditParams.push(start_date);
      creditParamIndex++;
    }
    if (end_date) {
      creditQuery += ` AND e.start_date <= $${creditParamIndex}`;
      creditParams.push(end_date);
    }
    creditQuery += ` GROUP BY e.credit_use_type ORDER BY total DESC`;
    const creditUseTypeBreakdownResult = await query(creditQuery, creditParams);

    // Get breakdown by category type
    let categoryTypeQuery = `
      SELECT 
        ec.category_type,
        SUM(e.amount) as total,
        COUNT(*) as count,
        AVG(e.amount) as average
      FROM expenses e
      LEFT JOIN expense_categories ec ON e.category_id = ec.id
      WHERE e.household_id = $1 
        AND ec.category_type IS NOT NULL
    `;
    const categoryTypeParams = [householdId];
    let categoryTypeParamIndex = 2;
    if (start_date) {
      categoryTypeQuery += ` AND (e.end_date IS NULL OR e.end_date >= $${categoryTypeParamIndex})`;
      categoryTypeParams.push(start_date);
      categoryTypeParamIndex++;
    }
    if (end_date) {
      categoryTypeQuery += ` AND e.start_date <= $${categoryTypeParamIndex}`;
      categoryTypeParams.push(end_date);
    }
    categoryTypeQuery += ` GROUP BY ec.category_type ORDER BY total DESC`;
    const categoryTypeBreakdownResult = await query(categoryTypeQuery, categoryTypeParams);

    res.json({
      total: statsResult.rows[0],
      breakdown: breakdownResult.rows,
      breakdown_by_assets: assetsBreakdownResult.rows,
      breakdown_by_credit_type: creditUseTypeBreakdownResult.rows,
      breakdown_by_category_type: categoryTypeBreakdownResult.rows,
      statistics: {
        total_amount: statsResult.rows[0].total || 0,
        total_entries: statsResult.rows[0].count || 0,
        average_amount: statsResult.rows[0].average || 0,
        min_amount: statsResult.rows[0].min_amount || 0,
        max_amount: statsResult.rows[0].max_amount || 0,
        recurring_count: statsResult.rows[0].recurring_count || 0,
        one_time_count: statsResult.rows[0].one_time_count || 0,
        recurring_total: statsResult.rows[0].recurring_total || 0,
        one_time_total: statsResult.rows[0].one_time_total || 0,
        monthly_recurring_total: statsResult.rows[0].monthly_recurring_total || 0
      }
    });
  } catch (error) {
    console.error('Error fetching expense summary:', error);
    res.status(500).json({ error: 'Failed to fetch expense summary' });
  }
});

// Get expense history (audit log)
router.get('/:id/history',
  [param('id').isInt().withMessage('Invalid expense ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const expenseId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Check if expense belongs to user's household
      const expenseCheck = await query(
        'SELECT * FROM expenses WHERE id = $1 AND household_id = $2',
        [expenseId, householdId]
      );

      if (expenseCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Expense entry not found' });
      }

      // Get history
      const result = await query(
        `SELECT eh.*, u.email as changed_by_email
         FROM expense_history eh
         LEFT JOIN users u ON eh.changed_by_user_id = u.id
         WHERE eh.expense_id = $1
         ORDER BY eh.changed_at DESC`,
        [expenseId]
      );

      res.json(result.rows);
    } catch (error) {
      console.error('Error fetching expense history:', error);
      res.status(500).json({ error: 'Failed to fetch expense history' });
    }
  }
);

// Create new expense entry
router.post('/',
  [
    body('household_member_id').isInt().withMessage('Member ID is required'),
    body('category_id').isInt().withMessage('Category ID is required'),
    body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
    // currency will be validated in handler
    body('description').optional().trim(),
    body('start_date').isISO8601().withMessage('Invalid start date'),
    body('end_date').optional({ nullable: true }).isISO8601().withMessage('Invalid end date'),
    body('is_recurring').isBoolean().withMessage('is_recurring must be boolean'),
    body('frequency').optional().isIn(['monthly', 'weekly', 'yearly', 'one-time']),
    body('linked_asset_id').optional().isInt(),
    body('linked_member_ids').optional().isArray(),
    body('credit_use_type').optional().isIn(['free_use', 'renovation', 'property_purchase', 'other']),
    body('metadata').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const {
        household_member_id,
        category_id,
        amount,
        currency,
        description,
        start_date,
        end_date,
        is_recurring,
        frequency,
        linked_asset_id,
        linked_member_ids,
        credit_use_type,
        metadata
      } = req.body;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Get category to check requirements
      const categoryResult = await query(
        `SELECT category_type, requires_asset_link, requires_member_link, allows_multiple_members
         FROM expense_categories WHERE id = $1`,
        [category_id]
      );

      if (categoryResult.rows.length === 0) {
        return res.status(400).json({ error: 'Invalid category' });
      }

      const category = categoryResult.rows[0];

      // Validate category requirements
      const categoryValidation = await validateCategoryRequirements(category_id, {
        linked_asset_id,
        linked_member_ids,
        household_member_id,
        credit_use_type
      }, householdId);

      if (!categoryValidation.valid) {
        return res.status(400).json({ error: categoryValidation.error });
      }

      // Validate asset link if provided
      if (linked_asset_id) {
        const assetValidation = await validateAssetLink(linked_asset_id, householdId);
        if (!assetValidation.valid) {
          return res.status(400).json({ error: assetValidation.error });
        }

        // For bills, tax, bausparvertrag, ensure it's real estate
        if (['bill', 'tax', 'bausparvertrag'].includes(category.category_type)) {
          if (!assetValidation.isRealEstate) {
            return res.status(400).json({ error: 'This category requires linking to a real estate property' });
          }
        }

        // For credit renovation/property_purchase, ensure it's real estate
        if (category.category_type === 'credit' && (credit_use_type === 'renovation' || credit_use_type === 'property_purchase')) {
          if (!assetValidation.isRealEstate) {
            return res.status(400).json({ error: 'Renovation or property purchase credit requires linking to a real estate property' });
          }
        }
      }

      // Validate member links if provided (for gifts)
      if (linked_member_ids && Array.isArray(linked_member_ids) && linked_member_ids.length > 0) {
        const memberValidation = await validateMemberLinks(linked_member_ids, householdId);
        if (!memberValidation.valid) {
          return res.status(400).json({ error: memberValidation.error });
        }
      } else if (category.requires_member_link && category.category_type !== 'gift') {
        // Verify member belongs to user's household (for non-gift categories)
        const memberCheck = await query(
          'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
          [household_member_id, householdId]
        );

        if (memberCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid household member' });
        }
      }

      // Validate currency
      const validCurrencies = await getActiveCurrencyCodes();
      if (!validCurrencies.includes(currency)) {
        return res.status(400).json({ error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
      }

      // Prepare metadata JSON
      let metadataJson = null;
      if (metadata && typeof metadata === 'object') {
        metadataJson = JSON.stringify(metadata);
      }

      // Create expense entry
      const result = await query(
        `INSERT INTO expenses 
         (household_id, household_member_id, category_id, amount, currency,
          description, start_date, end_date, is_recurring, frequency, 
          linked_asset_id, credit_use_type, metadata, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
         RETURNING *`,
        [
          householdId,
          household_member_id || null,
          category_id,
          amount,
          currency,
          description || null,
          start_date,
          end_date || null,
          is_recurring,
          frequency || 'one-time',
          linked_asset_id || null,
          credit_use_type || null,
          metadataJson,
          userId
        ]
      );

      const expenseId = result.rows[0].id;

      // Create expense_member_links if linked_member_ids provided (for gifts)
      if (linked_member_ids && Array.isArray(linked_member_ids) && linked_member_ids.length > 0) {
        for (const memberId of linked_member_ids) {
          await query(
            `INSERT INTO expense_member_links (expense_id, household_member_id)
             VALUES ($1, $2)
             ON CONFLICT (expense_id, household_member_id) DO NOTHING`,
            [expenseId, memberId]
          );
        }
      }

      // Fetch complete expense with joins
      const completeResult = await query(
        `SELECT e.*, 
                ec.name_en as category_name_en,
                ec.name_de as category_name_de,
                ec.name_tr as category_name_tr,
                ec.category_type,
                ec.has_custom_form,
                ec.requires_asset_link,
                ec.requires_member_link,
                ec.allows_multiple_members,
                hm.name as member_name,
                a.name as linked_asset_name
         FROM expenses e
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         LEFT JOIN household_members hm ON e.household_member_id = hm.id
         LEFT JOIN assets a ON e.linked_asset_id = a.id
         WHERE e.id = $1`,
        [expenseId]
      );

      // Fetch linked members
      const linkedMembersResult = await query(
        `SELECT eml.household_member_id, hm.name as member_name
         FROM expense_member_links eml
         JOIN household_members hm ON eml.household_member_id = hm.id
         WHERE eml.expense_id = $1`,
        [expenseId]
      );

      const expense = completeResult.rows[0];
      expense.linked_member_ids = linkedMembersResult.rows.map((r: any) => r.household_member_id);
      expense.linked_member_names = linkedMembersResult.rows.map((r: any) => r.member_name);

      // Parse metadata if it's a string
      if (expense.metadata && typeof expense.metadata === 'string') {
        try {
          expense.metadata = JSON.parse(expense.metadata);
        } catch {
          expense.metadata = null;
        }
      }

      // Log creation
      await logExpenseChange(expenseId, userId, 'created', null, expense);

      res.status(201).json(expense);
    } catch (error) {
      console.error('Error creating expense:', error);
      res.status(500).json({ error: 'Failed to create expense entry' });
    }
  }
);

// Update expense entry
router.put('/:id',
  [
    param('id').isInt().withMessage('Invalid expense ID'),
    body('household_member_id').optional().isInt(),
    body('category_id').optional().isInt(),
    body('amount').optional().isFloat({ min: 0 }),
    // currency will be validated in handler
    body('description').optional().trim(),
    body('start_date').optional().isISO8601(),
    body('end_date').optional({ nullable: true }).isISO8601(),
    body('is_recurring').optional().isBoolean(),
    body('frequency').optional().isIn(['monthly', 'weekly', 'yearly', 'one-time']),
    body('linked_asset_id').optional().isInt(),
    body('linked_member_ids').optional().isArray(),
    body('credit_use_type').optional().isIn(['free_use', 'renovation', 'property_purchase', 'other']),
    body('metadata').optional().isObject()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const expenseId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Get old values for logging
      const oldResult = await query(
        'SELECT * FROM expenses WHERE id = $1 AND household_id = $2',
        [expenseId, householdId]
      );

      if (oldResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense entry not found' });
      }

      const oldValues = oldResult.rows[0];

      // Build update query
      const updateFields = [];
      const updateValues = [];
      let valueIndex = 1;

      const {
        household_member_id,
        category_id,
        amount,
        currency,
        description,
        start_date,
        end_date,
        is_recurring,
        frequency,
        linked_asset_id,
        linked_member_ids,
        credit_use_type,
        metadata
      } = req.body;

      if (household_member_id !== undefined) {
        // Verify member belongs to user's household
        const memberCheck = await query(
          'SELECT * FROM household_members WHERE id = $1 AND household_id = $2',
          [household_member_id, householdId]
        );
        if (memberCheck.rows.length === 0) {
          return res.status(400).json({ error: 'Invalid household member' });
        }
        updateFields.push(`household_member_id = $${valueIndex++}`);
        updateValues.push(household_member_id);
      }
      if (category_id !== undefined) {
        updateFields.push(`category_id = $${valueIndex++}`);
        updateValues.push(category_id);
      }
      if (amount !== undefined) {
        updateFields.push(`amount = $${valueIndex++}`);
        updateValues.push(amount);
      }
      if (currency !== undefined) {
        // Validate currency
        const validCurrencies = await getActiveCurrencyCodes();
        if (!validCurrencies.includes(currency)) {
          return res.status(400).json({ error: `Invalid currency. Must be one of: ${validCurrencies.join(', ')}` });
        }
        updateFields.push(`currency = $${valueIndex++}`);
        updateValues.push(currency);
      }
      if (description !== undefined) {
        updateFields.push(`description = $${valueIndex++}`);
        updateValues.push(description || null);
      }
      if (start_date !== undefined) {
        updateFields.push(`start_date = $${valueIndex++}`);
        updateValues.push(start_date);
      }
      if (end_date !== undefined) {
        updateFields.push(`end_date = $${valueIndex++}`);
        updateValues.push(end_date || null);
      }
      if (is_recurring !== undefined) {
        updateFields.push(`is_recurring = $${valueIndex++}`);
        updateValues.push(is_recurring);
      }
      if (frequency !== undefined) {
        updateFields.push(`frequency = $${valueIndex++}`);
        updateValues.push(frequency);
      }

      // Handle linking fields
      if (linked_asset_id !== undefined) {
        // Validate asset link if provided
        if (linked_asset_id) {
          const assetValidation = await validateAssetLink(linked_asset_id, householdId);
          if (!assetValidation.valid) {
            return res.status(400).json({ error: assetValidation.error });
          }

          // Get category to check if real estate is required
          const currentCategory = await query(
            `SELECT category_type FROM expense_categories WHERE id = (SELECT category_id FROM expenses WHERE id = $1)`,
            [expenseId]
          );

          if (currentCategory.rows.length > 0) {
            const catType = currentCategory.rows[0].category_type;
            if (['bill', 'tax', 'bausparvertrag'].includes(catType)) {
              if (!assetValidation.isRealEstate) {
                return res.status(400).json({ error: 'This category requires linking to a real estate property' });
              }
            }
          }
        }

        updateFields.push(`linked_asset_id = $${valueIndex++}`);
        updateValues.push(linked_asset_id || null);
      }

      if (credit_use_type !== undefined) {
        updateFields.push(`credit_use_type = $${valueIndex++}`);
        updateValues.push(credit_use_type || null);
      }

      if (metadata !== undefined) {
        const metadataJson = metadata && typeof metadata === 'object' ? JSON.stringify(metadata) : null;
        updateFields.push(`metadata = $${valueIndex++}`);
        updateValues.push(metadataJson);
      }

      if (updateFields.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
      updateValues.push(expenseId);

      const result = await query(
        `UPDATE expenses 
         SET ${updateFields.join(', ')}
         WHERE id = $${valueIndex}
         RETURNING *`,
        updateValues
      );

      // Handle linked_member_ids update (for gifts)
      if (linked_member_ids !== undefined) {
        // Delete existing links
        await query('DELETE FROM expense_member_links WHERE expense_id = $1', [expenseId]);

        // Create new links
        if (Array.isArray(linked_member_ids) && linked_member_ids.length > 0) {
          // Validate member links
          const memberValidation = await validateMemberLinks(linked_member_ids, householdId);
          if (!memberValidation.valid) {
            return res.status(400).json({ error: memberValidation.error });
          }

          for (const memberId of linked_member_ids) {
            await query(
              `INSERT INTO expense_member_links (expense_id, household_member_id)
               VALUES ($1, $2)`,
              [expenseId, memberId]
            );
          }
        }
      }

      // Fetch complete expense with joins
      const completeResult = await query(
        `SELECT e.*, 
                ec.name_en as category_name_en,
                ec.name_de as category_name_de,
                ec.name_tr as category_name_tr,
                ec.category_type,
                ec.has_custom_form,
                ec.requires_asset_link,
                ec.requires_member_link,
                ec.allows_multiple_members,
                hm.name as member_name,
                a.name as linked_asset_name
         FROM expenses e
         LEFT JOIN expense_categories ec ON e.category_id = ec.id
         LEFT JOIN household_members hm ON e.household_member_id = hm.id
         LEFT JOIN assets a ON e.linked_asset_id = a.id
         WHERE e.id = $1`,
        [expenseId]
      );

      // Fetch linked members
      const linkedMembersResult = await query(
        `SELECT eml.household_member_id, hm.name as member_name
         FROM expense_member_links eml
         JOIN household_members hm ON eml.household_member_id = hm.id
         WHERE eml.expense_id = $1`,
        [expenseId]
      );

      const updatedExpense = completeResult.rows[0];
      updatedExpense.linked_member_ids = linkedMembersResult.rows.map((r: any) => r.household_member_id);
      updatedExpense.linked_member_names = linkedMembersResult.rows.map((r: any) => r.member_name);

      // Parse metadata if it's a string
      if (updatedExpense.metadata && typeof updatedExpense.metadata === 'string') {
        try {
          updatedExpense.metadata = JSON.parse(updatedExpense.metadata);
        } catch {
          updatedExpense.metadata = null;
        }
      }

      // Log update
      await logExpenseChange(expenseId, userId, 'updated', oldValues, updatedExpense);

      res.json(updatedExpense);
    } catch (error) {
      console.error('Error updating expense:', error);
      res.status(500).json({ error: 'Failed to update expense entry' });
    }
  }
);

// Delete expense entry
router.delete('/:id',
  [param('id').isInt().withMessage('Invalid expense ID')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const userId = req.user?.id;
      const expenseId = req.params.id;

      // Get user's household_id
      const userResult = await query('SELECT household_id FROM users WHERE id = $1', [userId]);
      const householdId = userResult.rows[0]?.household_id;

      if (!householdId) {
        return res.status(400).json({ error: 'User is not assigned to a household' });
      }

      // Get expense for logging
      const expenseResult = await query(
        'SELECT * FROM expenses WHERE id = $1 AND household_id = $2',
        [expenseId, householdId]
      );

      if (expenseResult.rows.length === 0) {
        return res.status(404).json({ error: 'Expense entry not found' });
      }

      const deletedExpense = expenseResult.rows[0];

      // Log deletion
      await logExpenseChange(expenseId, userId, 'deleted', deletedExpense, null);

      // Delete expense entry
      await query('DELETE FROM expenses WHERE id = $1', [expenseId]);

      res.json({ message: 'Expense entry deleted successfully' });
    } catch (error) {
      console.error('Error deleting expense:', error);
      res.status(500).json({ error: 'Failed to delete expense entry' });
    }
  }
);

export default router;

