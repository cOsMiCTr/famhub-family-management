"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const exchangeRateService_1 = require("../services/exchangeRateService");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const categoriesResult = await (0, database_1.query)('SELECT * FROM asset_categories ORDER BY is_default DESC, name_en ASC');
    res.json({
        categories: categoriesResult.rows
    });
}));
router.post('/', [
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    (0, express_validator_1.body)('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
    (0, express_validator_1.body)('category_id').isInt({ min: 1 }).withMessage('Valid category ID required'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('date').isISO8601().withMessage('Valid date required'),
    (0, express_validator_1.body)('household_id').optional().isInt({ min: 1 }).withMessage('Valid household ID required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { amount, currency, category_id, description, date, household_id } = req.body;
    const finalHouseholdId = household_id || req.user.household_id;
    if (!finalHouseholdId) {
        throw (0, errorHandler_1.createValidationError)('Household ID required');
    }
    const categoryResult = await (0, database_1.query)('SELECT id FROM asset_categories WHERE id = $1', [category_id]);
    if (categoryResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset category');
    }
    const assetResult = await (0, database_1.query)(`INSERT INTO assets (user_id, household_id, amount, currency, category_id, description, date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`, [req.user.id, finalHouseholdId, amount, currency, category_id, description, date]);
    const asset = assetResult.rows[0];
    const categoryNameResult = await (0, database_1.query)('SELECT name_en, name_de, name_tr FROM asset_categories WHERE id = $1', [category_id]);
    const categoryName = categoryNameResult.rows[0];
    res.status(201).json({
        message: 'Asset created successfully',
        asset: {
            ...asset,
            category_name: categoryName
        }
    });
}));
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { page = 1, limit = 50, category_id, currency, start_date, end_date, household_view = false } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramCount = 1;
    if (household_view === 'true' && req.user.household_id) {
        conditions.push(`a.household_id = $${paramCount++}`);
        params.push(req.user.household_id);
    }
    else {
        conditions.push(`a.user_id = $${paramCount++}`);
        params.push(req.user.id);
    }
    if (category_id) {
        conditions.push(`a.category_id = $${paramCount++}`);
        params.push(category_id);
    }
    if (currency) {
        conditions.push(`a.currency = $${paramCount++}`);
        params.push(currency);
    }
    if (start_date) {
        conditions.push(`a.date >= $${paramCount++}`);
        params.push(start_date);
    }
    if (end_date) {
        conditions.push(`a.date <= $${paramCount++}`);
        params.push(end_date);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const assetsResult = await (0, database_1.query)(`SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.type as category_type, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.date DESC, a.created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`, [...params, parseInt(limit), offset]);
    const countResult = await (0, database_1.query)(`SELECT COUNT(*) as total
     FROM assets a
     ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    res.json({
        assets: assetsResult.rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));
router.get('/household/:householdId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { householdId } = req.params;
    const { page = 1, limit = 50, category_id, currency, start_date, end_date } = req.query;
    if (req.user.role !== 'admin' && req.user.household_id !== parseInt(householdId)) {
        throw new Error('Access denied to this household');
    }
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = ['a.household_id = $1'];
    const params = [householdId];
    let paramCount = 2;
    if (category_id) {
        conditions.push(`a.category_id = $${paramCount++}`);
        params.push(category_id);
    }
    if (currency) {
        conditions.push(`a.currency = $${paramCount++}`);
        params.push(currency);
    }
    if (start_date) {
        conditions.push(`a.date >= $${paramCount++}`);
        params.push(start_date);
    }
    if (end_date) {
        conditions.push(`a.date <= $${paramCount++}`);
        params.push(end_date);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const assetsResult = await (0, database_1.query)(`SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.type as category_type, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     JOIN users u ON a.user_id = u.id
     ${whereClause}
     ORDER BY a.date DESC, a.created_at DESC
     LIMIT $${paramCount++} OFFSET $${paramCount++}`, [...params, parseInt(limit), offset]);
    const countResult = await (0, database_1.query)(`SELECT COUNT(*) as total
     FROM assets a
     ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    res.json({
        assets: assetsResult.rows,
        pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total,
            pages: Math.ceil(total / parseInt(limit))
        }
    });
}));
router.get('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    const assetResult = await (0, database_1.query)(`SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.type as category_type, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     JOIN users u ON a.user_id = u.id
     WHERE a.id = $1`, [id]);
    if (assetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const asset = assetResult.rows[0];
    if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    res.json({
        asset
    });
}));
router.put('/:id', [
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Valid amount required'),
    (0, express_validator_1.body)('currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
    (0, express_validator_1.body)('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('date').optional().isISO8601().withMessage('Valid date required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    const { amount, currency, category_id, description, date } = req.body;
    const existingAssetResult = await (0, database_1.query)('SELECT * FROM assets WHERE id = $1', [id]);
    if (existingAssetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const existingAsset = existingAssetResult.rows[0];
    if (req.user.role !== 'admin' && existingAsset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    if (amount !== undefined) {
        updateFields.push(`amount = $${paramCount++}`);
        updateValues.push(amount);
    }
    if (currency !== undefined) {
        updateFields.push(`currency = $${paramCount++}`);
        updateValues.push(currency);
    }
    if (category_id !== undefined) {
        updateFields.push(`category_id = $${paramCount++}`);
        updateValues.push(category_id);
    }
    if (description !== undefined) {
        updateFields.push(`description = $${paramCount++}`);
        updateValues.push(description);
    }
    if (date !== undefined) {
        updateFields.push(`date = $${paramCount++}`);
        updateValues.push(date);
    }
    if (updateFields.length === 0) {
        throw (0, errorHandler_1.createValidationError)('No fields to update');
    }
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(id);
    const result = await (0, database_1.query)(`UPDATE assets SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`, updateValues);
    res.json({
        message: 'Asset updated successfully',
        asset: result.rows[0]
    });
}));
router.delete('/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    const existingAssetResult = await (0, database_1.query)('SELECT * FROM assets WHERE id = $1', [id]);
    if (existingAssetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const existingAsset = existingAssetResult.rows[0];
    if (req.user.role !== 'admin' && existingAsset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    await (0, database_1.query)('DELETE FROM assets WHERE id = $1', [id]);
    res.json({
        message: 'Asset deleted successfully'
    });
}));
router.get('/summary/currency-conversion', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { main_currency = req.user.main_currency || 'USD' } = req.query;
    const assetsResult = await (0, database_1.query)(`SELECT currency, SUM(amount) as total_amount, COUNT(*) as count
     FROM assets
     WHERE user_id = $1
     GROUP BY currency`, [req.user.id]);
    const currencyTotals = assetsResult.rows;
    const convertedTotals = [];
    for (const currencyTotal of currencyTotals) {
        try {
            const convertedAmount = await exchangeRateService_1.exchangeRateService.convertCurrency(parseFloat(currencyTotal.total_amount), currencyTotal.currency, main_currency);
            convertedTotals.push({
                currency: currencyTotal.currency,
                original_amount: parseFloat(currencyTotal.total_amount),
                converted_amount: convertedAmount,
                count: parseInt(currencyTotal.count)
            });
        }
        catch (error) {
            console.error(`Failed to convert ${currencyTotal.currency} to ${main_currency}:`, error);
        }
    }
    const totalInMainCurrency = convertedTotals.reduce((sum, item) => sum + item.converted_amount, 0);
    res.json({
        main_currency,
        currency_breakdown: convertedTotals,
        total_in_main_currency: totalInMainCurrency,
        timestamp: new Date().toISOString()
    });
}));
exports.default = router;
//# sourceMappingURL=assets.js.map