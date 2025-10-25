"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const exchangeRateService_1 = require("../services/exchangeRateService");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const userId = req.user.id;
    const mainCurrency = req.user.main_currency || 'USD';
    const assetsResult = await (0, database_1.query)(`SELECT currency, SUM(amount) as total_amount, COUNT(*) as count
     FROM assets
     WHERE user_id = $1
     GROUP BY currency`, [userId]);
    const incomeResult = await (0, database_1.query)(`SELECT i.currency, SUM(i.amount) as total_amount, COUNT(*) as count
     FROM income i
     JOIN users u ON i.household_id = u.household_id
     WHERE u.id = $1
     GROUP BY i.currency`, [userId]);
    const currencyBreakdown = [];
    let totalInMainCurrency = 0;
    for (const asset of assetsResult.rows) {
        try {
            const convertedAmount = await exchangeRateService_1.exchangeRateService.convertCurrency(parseFloat(asset.total_amount), asset.currency, mainCurrency);
            currencyBreakdown.push({
                currency: asset.currency,
                amount: parseFloat(asset.total_amount),
                converted_amount: convertedAmount,
                count: parseInt(asset.count)
            });
            totalInMainCurrency += convertedAmount;
        }
        catch (error) {
            console.error(`Failed to convert ${asset.currency} to ${mainCurrency}:`, error);
        }
    }
    const incomeBreakdown = [];
    let totalIncomeInMainCurrency = 0;
    for (const income of incomeResult.rows) {
        try {
            const convertedAmount = await exchangeRateService_1.exchangeRateService.convertCurrency(parseFloat(income.total_amount), income.currency, mainCurrency);
            incomeBreakdown.push({
                currency: income.currency,
                amount: parseFloat(income.total_amount),
                converted_amount: convertedAmount,
                count: parseInt(income.count)
            });
            totalIncomeInMainCurrency += convertedAmount;
        }
        catch (error) {
            console.error(`Error converting income ${income.currency} to ${mainCurrency}:`, error);
        }
    }
    const recentIncomeResult = await (0, database_1.query)(`SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = 'income'
     ORDER BY a.date DESC, a.created_at DESC
     LIMIT 10`, [userId]);
    const monthlyIncomeResult = await (0, database_1.query)(`SELECT 
       DATE_TRUNC('month', a.date) as month,
       SUM(a.amount) as total_amount,
       a.currency,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = 'income'
       AND a.date >= CURRENT_DATE - INTERVAL '12 months'
     GROUP BY DATE_TRUNC('month', a.date), a.currency
     ORDER BY month DESC`, [userId]);
    const categoryIncomeResult = await (0, database_1.query)(`SELECT 
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
     ORDER BY total_amount DESC`, [userId]);
    const upcomingRenewalsResult = await (0, database_1.query)(`SELECT c.*, cc.name_en as category_name_en, cc.name_de as category_name_de, cc.name_tr as category_name_tr
     FROM contracts c
     JOIN contract_categories cc ON c.category_id = cc.id
     WHERE c.household_id = $1 
       AND c.status = 'active'
       AND c.renewal_date IS NOT NULL
       AND c.renewal_date <= CURRENT_DATE + INTERVAL '30 days'
     ORDER BY c.renewal_date ASC
     LIMIT 10`, [req.user.household_id]);
    const notificationsResult = await (0, database_1.query)(`SELECT * FROM notifications
     WHERE user_id = $1 AND read = false
     ORDER BY created_at DESC
     LIMIT 5`, [userId]);
    const quickStatsResult = await (0, database_1.query)(`SELECT 
       COUNT(CASE WHEN ac.type = 'income' THEN 1 END) as income_entries,
       COUNT(CASE WHEN ac.type = 'expense' THEN 1 END) as expense_entries,
       COUNT(CASE WHEN c.status = 'active' THEN 1 END) as active_contracts
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     LEFT JOIN contracts c ON c.household_id = $2
     WHERE a.user_id = $1`, [userId, req.user.household_id]);
    const membersResult = await (0, database_1.query)(`SELECT COUNT(*) as member_count
     FROM users u
     WHERE u.household_id = $1`, [req.user.household_id]);
    const quickStats = quickStatsResult.rows[0];
    const exchangeRates = await exchangeRateService_1.exchangeRateService.getAllExchangeRates();
    const relevantRates = exchangeRates.filter(rate => rate.from_currency === mainCurrency &&
        ['EUR', 'USD', 'GBP', 'TRY', 'CNY', 'JPY', 'CAD', 'AUD', 'CHF', 'GOLD'].includes(rate.to_currency));
    res.json({
        summary: {
            total_assets_main_currency: totalInMainCurrency,
            total_income_main_currency: totalIncomeInMainCurrency,
            main_currency: mainCurrency,
            currency_breakdown: currencyBreakdown,
            income_breakdown: incomeBreakdown,
            member_count: parseInt(membersResult.rows[0].member_count) || 0,
            quick_stats: {
                income_entries: parseInt(quickStats.income_entries) || 0,
                expense_entries: parseInt(quickStats.expense_entries) || 0,
                active_contracts: parseInt(quickStats.active_contracts) || 0
            }
        },
        exchange_rates: relevantRates,
        recent_income: recentIncomeResult.rows,
        monthly_income: monthlyIncomeResult.rows,
        category_income: categoryIncomeResult.rows,
        upcoming_renewals: upcomingRenewalsResult.rows,
        notifications: notificationsResult.rows,
        timestamp: new Date().toISOString()
    });
}));
router.get('/stats', (0, errorHandler_1.asyncHandler)(async (req, res) => {
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
    const incomeOverTimeResult = await (0, database_1.query)(`SELECT 
       DATE_TRUNC('month', a.date) as month,
       SUM(a.amount) as total_amount,
       a.currency
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = $2 ${dateFilter}
     GROUP BY DATE_TRUNC('month', a.date), a.currency
     ORDER BY month ASC`, [userId, type]);
    const incomeByCategoryResult = await (0, database_1.query)(`SELECT 
       ac.name_en as category_name,
       SUM(a.amount) as total_amount,
       a.currency,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = $2 ${dateFilter}
     GROUP BY ac.id, ac.name_en, a.currency
     ORDER BY total_amount DESC`, [userId, type]);
    const currencyDistributionResult = await (0, database_1.query)(`SELECT 
       a.currency,
       SUM(a.amount) as total_amount,
       COUNT(*) as count
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     WHERE a.user_id = $1 AND ac.type = $2 ${dateFilter}
     GROUP BY a.currency
     ORDER BY total_amount DESC`, [userId, type]);
    res.json({
        income_over_time: incomeOverTimeResult.rows,
        income_by_category: incomeByCategoryResult.rows,
        currency_distribution: currencyDistributionResult.rows,
        period,
        type,
        timestamp: new Date().toISOString()
    });
}));
router.get('/household/:householdId/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { householdId } = req.params;
    const mainCurrency = req.user.main_currency || 'USD';
    if (req.user.role !== 'admin' && req.user.household_id !== parseInt(householdId)) {
        throw new Error('Access denied to this household');
    }
    const assetsResult = await (0, database_1.query)(`SELECT currency, SUM(amount) as total_amount, COUNT(*) as count
     FROM assets
     WHERE household_id = $1
     GROUP BY currency`, [householdId]);
    const currencyBreakdown = [];
    let totalInMainCurrency = 0;
    for (const asset of assetsResult.rows) {
        try {
            const convertedAmount = await exchangeRateService_1.exchangeRateService.convertCurrency(parseFloat(asset.total_amount), asset.currency, mainCurrency);
            currencyBreakdown.push({
                currency: asset.currency,
                amount: parseFloat(asset.total_amount),
                converted_amount: convertedAmount,
                count: parseInt(asset.count)
            });
            totalInMainCurrency += convertedAmount;
        }
        catch (error) {
            console.error(`Failed to convert ${asset.currency} to ${mainCurrency}:`, error);
        }
    }
    const membersResult = await (0, database_1.query)(`SELECT u.id, u.email, u.preferred_language, u.main_currency, u.created_at
     FROM users u
     WHERE u.household_id = $1
     ORDER BY u.created_at`, [householdId]);
    const contractsResult = await (0, database_1.query)(`SELECT c.*, cc.name_en as category_name_en, cc.name_de as category_name_de, cc.name_tr as category_name_tr
     FROM contracts c
     JOIN contract_categories cc ON c.category_id = cc.id
     WHERE c.household_id = $1
     ORDER BY c.created_at DESC`, [householdId]);
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
exports.default = router;
//# sourceMappingURL=dashboard.js.map