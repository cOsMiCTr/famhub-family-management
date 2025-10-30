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
const moduleAuth_1 = require("../middleware/moduleAuth");
const currencyHelpers_1 = require("../utils/currencyHelpers");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use((0, moduleAuth_1.requireModule)('assets'));
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path_1.default.join(__dirname, '../../public/uploads/assets');
        if (!fs_1.default.existsSync(uploadDir)) {
            fs_1.default.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `asset-${uniqueSuffix}${path_1.default.extname(file.originalname)}`);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error('Only image files are allowed'));
        }
    }
});
router.get('/categories', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const categoriesResult = await (0, database_1.query)('SELECT * FROM asset_categories ORDER BY is_default DESC, name_en ASC');
    res.json(categoriesResult.rows);
}));
router.post('/', [
    (0, express_validator_1.body)('name').trim().notEmpty().withMessage('Asset name is required'),
    (0, express_validator_1.body)('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    (0, express_validator_1.body)('category_id').isInt({ min: 1 }).withMessage('Valid category ID required'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('date').isISO8601().withMessage('Valid date required'),
    (0, express_validator_1.body)('household_member_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Valid household member ID required'),
    (0, express_validator_1.body)('purchase_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid purchase date required'),
    (0, express_validator_1.body)('purchase_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid purchase price required'),
    (0, express_validator_1.body)('current_value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid current value required'),
    (0, express_validator_1.body)('valuation_method').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }).withMessage('Valuation method too long'),
    (0, express_validator_1.body)('ownership_type').optional({ nullable: true, checkFalsy: true }).isIn(['single', 'shared']).withMessage('Invalid ownership type'),
    (0, express_validator_1.body)('ownership_percentage').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
    (0, express_validator_1.body)('status').optional().isIn(['active', 'sold', 'transferred', 'inactive']).withMessage('Invalid status'),
    (0, express_validator_1.body)('location').optional().isLength({ max: 500 }).withMessage('Location too long'),
    (0, express_validator_1.body)('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { name, amount, currency, category_id, description, date, household_member_id, purchase_date, purchase_price, purchase_currency, current_value, valuation_method, ownership_type, ownership_percentage, status, location, notes } = req.body;
    const householdId = req.user.household_id;
    if (!householdId) {
        throw (0, errorHandler_1.createValidationError)('User must be assigned to a household');
    }
    const validCurrencyCodes = await (0, currencyHelpers_1.getActiveCurrencyCodes)();
    if (!validCurrencyCodes.includes(currency)) {
        throw (0, errorHandler_1.createValidationError)(`Invalid currency: ${currency}`);
    }
    if (purchase_currency && !validCurrencyCodes.includes(purchase_currency)) {
        throw (0, errorHandler_1.createValidationError)(`Invalid purchase currency: ${purchase_currency}`);
    }
    const categoryResult = await (0, database_1.query)('SELECT id FROM asset_categories WHERE id = $1', [category_id]);
    if (categoryResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset category');
    }
    if (household_member_id) {
        const memberResult = await (0, database_1.query)('SELECT id FROM household_members WHERE id = $1 AND household_id = $2', [household_member_id, householdId]);
        if (memberResult.rows.length === 0) {
            throw (0, errorHandler_1.createNotFoundError)('Household member');
        }
    }
    const assetResult = await (0, database_1.query)(`INSERT INTO assets (
      user_id, household_id, household_member_id, name, amount, currency, 
      category_id, description, date, purchase_date, purchase_price, 
      purchase_currency, current_value, last_valuation_date, valuation_method,
      ownership_type, ownership_percentage, status, location, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
    RETURNING *`, [
        req.user.id, householdId, household_member_id || null, name, amount, currency,
        category_id, description || null, date, purchase_date || null, purchase_price || null,
        purchase_currency || null, current_value || amount, current_value ? new Date().toISOString().split('T')[0] : null, valuation_method || null,
        ownership_type || 'single', ownership_percentage || 100.00, status || 'active', location || null, notes || null
    ]);
    const asset = assetResult.rows[0];
    if (ownership_type === 'shared' && req.body.shared_ownership_percentages) {
        const sharedPercentages = req.body.shared_ownership_percentages;
        for (const [memberId, percentage] of Object.entries(sharedPercentages)) {
            const percentageValue = typeof percentage === 'number' ? percentage : parseFloat(percentage);
            if (percentageValue > 0) {
                await (0, database_1.query)(`INSERT INTO shared_ownership_distribution (asset_id, household_member_id, ownership_percentage)
           VALUES ($1, $2, $3)`, [asset.id, parseInt(memberId), percentageValue]);
            }
        }
    }
    if (purchase_price && purchase_date) {
        await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`, [asset.id, purchase_date, purchase_price, currency, valuation_method || 'Manual', req.user.id]);
        const currentValue = current_value || amount;
        await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`, [asset.id, new Date().toISOString().split('T')[0], currentValue, currency, valuation_method || 'Manual', req.user.id]);
    }
    else {
        const initialValue = current_value || amount;
        const valuationDate = purchase_date || date;
        await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`, [asset.id, valuationDate, initialValue, currency, valuation_method || 'Manual', req.user.id]);
    }
    const [categoryNameResult, memberNameResult] = await Promise.all([
        (0, database_1.query)('SELECT name_en, name_de, name_tr FROM asset_categories WHERE id = $1', [category_id]),
        household_member_id ? (0, database_1.query)('SELECT name FROM household_members WHERE id = $1', [household_member_id]) : Promise.resolve({ rows: [] })
    ]);
    res.status(201).json({
        message: 'Asset created successfully',
        asset: {
            ...asset,
            category_name: categoryNameResult.rows[0],
            member_name: memberNameResult.rows[0]?.name || null
        }
    });
}));
router.get('/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { start_date, end_date, category_id, status = 'active', household_view = false } = req.query;
    const conditions = ['a.status = $1'];
    const params = [status];
    let paramCount = 2;
    if (household_view === 'true' && req.user.household_id) {
        conditions.push(`a.household_id = $${paramCount++}`);
        params.push(req.user.household_id);
    }
    else {
        const userMemberResult = await (0, database_1.query)('SELECT id FROM household_members WHERE user_id = $1', [req.user.id]);
        if (userMemberResult.rows.length > 0) {
            const userMemberId = userMemberResult.rows[0].id;
            conditions.push(`(a.user_id = $${paramCount++} OR EXISTS (
        SELECT 1 FROM shared_ownership_distribution 
        WHERE asset_id = a.id AND household_member_id = $${paramCount}
      ))`);
            params.push(req.user.id);
            params.push(userMemberId);
        }
        else {
            conditions.push(`a.user_id = $${paramCount++}`);
            params.push(req.user.id);
        }
    }
    if (start_date) {
        conditions.push(`a.date >= $${paramCount++}`);
        params.push(start_date);
    }
    if (end_date) {
        conditions.push(`a.date <= $${paramCount++}`);
        params.push(end_date);
    }
    if (category_id) {
        conditions.push(`a.category_id = $${paramCount++}`);
        params.push(category_id);
    }
    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const assetsResult = await (0, database_1.query)(`SELECT a.*, ac.name_en as category_name_en, ac.category_type, ac.icon
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     ${whereClause}
     ORDER BY a.current_value DESC`, params);
    let userOwnershipMap = {};
    let userMemberId = null;
    if (household_view !== 'true') {
        const userMemberResult = await (0, database_1.query)('SELECT id FROM household_members WHERE user_id = $1', [req.user.id]);
        if (userMemberResult.rows.length > 0) {
            userMemberId = userMemberResult.rows[0].id;
            const assetIds = assetsResult.rows.map(a => a.id);
            if (assetIds.length > 0) {
                const sharedOwnershipResult = await (0, database_1.query)(`SELECT asset_id, ownership_percentage
           FROM shared_ownership_distribution
           WHERE asset_id = ANY($1::int[]) AND household_member_id = $2`, [assetIds, userMemberId]);
                sharedOwnershipResult.rows.forEach(row => {
                    userOwnershipMap[row.asset_id] = parseFloat(row.ownership_percentage);
                });
            }
        }
    }
    const exchangeRates = await exchangeRateService_1.exchangeRateService.getAllExchangeRates();
    const userCurrency = req.user.main_currency || 'USD';
    const categoryTotals = {};
    const currencyTotals = {};
    let totalValueInMainCurrency = 0;
    let assetsWithOwnership = 0;
    for (const asset of assetsResult.rows) {
        let ownershipPercentage = 100;
        let includeAsset = true;
        if (household_view !== 'true') {
            if (asset.user_id === req.user.id) {
                ownershipPercentage = 100;
            }
            else if (userMemberId && userOwnershipMap[asset.id]) {
                ownershipPercentage = userOwnershipMap[asset.id];
            }
            else {
                includeAsset = false;
            }
        }
        if (!includeAsset) {
            continue;
        }
        assetsWithOwnership++;
        const categoryName = asset.category_name_en;
        const assetCurrency = asset.currency;
        const fullAssetValue = parseFloat(asset.current_value || asset.amount);
        const userAssetValue = fullAssetValue * (ownershipPercentage / 100);
        if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = {};
        }
        if (!categoryTotals[categoryName][assetCurrency]) {
            categoryTotals[categoryName][assetCurrency] = 0;
        }
        categoryTotals[categoryName][assetCurrency] += userAssetValue;
        if (!currencyTotals[assetCurrency]) {
            currencyTotals[assetCurrency] = 0;
        }
        currencyTotals[assetCurrency] += userAssetValue;
        if (assetCurrency === userCurrency) {
            totalValueInMainCurrency += userAssetValue;
        }
        else {
            const rate = exchangeRates.find(r => r.from_currency === assetCurrency && r.to_currency === userCurrency);
            if (rate) {
                totalValueInMainCurrency += userAssetValue * rate.rate;
            }
        }
    }
    const assetsWithROI = [];
    for (const asset of assetsResult.rows) {
        if (!asset.purchase_price || parseFloat(asset.purchase_price) <= 0) {
            continue;
        }
        let ownershipPercentage = 100;
        let includeAsset = true;
        if (household_view !== 'true') {
            if (asset.user_id === req.user.id) {
                ownershipPercentage = 100;
            }
            else if (userMemberId && userOwnershipMap[asset.id]) {
                ownershipPercentage = userOwnershipMap[asset.id];
            }
            else {
                includeAsset = false;
            }
        }
        if (includeAsset) {
            assetsWithROI.push({ asset, ownershipPercentage });
        }
    }
    const totalROI = assetsWithROI.reduce((sum, { asset, ownershipPercentage }) => {
        const purchasePrice = parseFloat(asset.purchase_price);
        const currentValue = parseFloat(asset.current_value || asset.amount);
        return sum + ((currentValue - purchasePrice) / purchasePrice) * 100;
    }, 0);
    const averageROI = assetsWithROI.length > 0 ? totalROI / assetsWithROI.length : 0;
    const allocationByCategory = Object.entries(categoryTotals).map(([categoryName, currencies]) => {
        const categoryTotal = Object.values(currencies).reduce((sum, val) => sum + val, 0);
        return {
            category_name: categoryName,
            total_value: categoryTotal,
            percentage: totalValueInMainCurrency > 0 ? (categoryTotal / totalValueInMainCurrency) * 100 : 0
        };
    }).sort((a, b) => b.total_value - a.total_value);
    const typeTotals = {};
    for (const asset of assetsResult.rows) {
        let ownershipPercentage = 100;
        let includeAsset = true;
        if (household_view !== 'true') {
            if (asset.user_id === req.user.id) {
                ownershipPercentage = 100;
            }
            else if (userMemberId && userOwnershipMap[asset.id]) {
                ownershipPercentage = userOwnershipMap[asset.id];
            }
            else {
                includeAsset = false;
            }
        }
        if (!includeAsset) {
            continue;
        }
        const categoryType = asset.category_type || 'other';
        const fullAssetValue = parseFloat(asset.current_value || asset.amount);
        const userAssetValue = fullAssetValue * (ownershipPercentage / 100);
        if (asset.currency === userCurrency) {
            typeTotals[categoryType] = (typeTotals[categoryType] || 0) + userAssetValue;
        }
        else {
            const rate = exchangeRates.find(r => r.from_currency === asset.currency && r.to_currency === userCurrency);
            if (rate) {
                typeTotals[categoryType] = (typeTotals[categoryType] || 0) + (userAssetValue * rate.rate);
            }
        }
    }
    const allocationByType = Object.entries(typeTotals).map(([type, totalValue]) => ({
        type,
        total_value: totalValue,
        percentage: totalValueInMainCurrency > 0 ? (totalValue / totalValueInMainCurrency) * 100 : 0
    })).sort((a, b) => b.total_value - a.total_value);
    res.json({
        summary: {
            total_assets: assetsWithOwnership,
            total_value_main_currency: totalValueInMainCurrency,
            main_currency: userCurrency,
            average_roi: averageROI,
            assets_with_roi: assetsWithROI.length
        },
        category_totals: categoryTotals,
        currency_totals: currencyTotals,
        allocation_by_category: allocationByCategory,
        allocation_by_type: allocationByType,
        assets: assetsResult.rows
    });
}));
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { page = 1, limit = 50, category_id, currency, start_date, end_date, status, ownership_type, household_member_id, household_view = false } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conditions = [];
    const params = [];
    let paramCount = 1;
    console.log('🔍 DEBUG: Starting asset query');
    console.log('🔍 DEBUG: User ID:', req.user.id);
    console.log('🔍 DEBUG: Query params:', { page, limit, category_id, currency, start_date, end_date, status, ownership_type, household_member_id, household_view });
    const allAssetsDebug = await (0, database_1.query)(`SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type, a.household_id
     FROM assets a
     WHERE a.user_id = $1 OR a.household_id IN (SELECT household_id FROM users WHERE id = $1)
     ORDER BY a.id`, [req.user.id]);
    console.log('🔍 DEBUG: All assets user has access to (by user_id or household):', allAssetsDebug.rows.length);
    allAssetsDebug.rows.forEach((asset) => {
        console.log(`  Asset ${asset.id}: "${asset.name}", user_id=${asset.user_id}, member_id=${asset.household_member_id}, type=${asset.ownership_type}, household_id=${asset.household_id}`);
    });
    const userHousehold = await (0, database_1.query)('SELECT household_id FROM users WHERE id = $1', [req.user.id]);
    const householdId = userHousehold.rows[0]?.household_id;
    console.log('🔍 DEBUG: User household_id:', householdId);
    if (householdId) {
        const sharedOwnershipDebug = await (0, database_1.query)(`SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.user_id, hm.name, a.user_id as asset_user_id, a.name as asset_name
       FROM shared_ownership_distribution sod
       JOIN household_members hm ON sod.household_member_id = hm.id
       JOIN assets a ON sod.asset_id = a.id
       WHERE a.household_id = $1`, [householdId]);
        console.log('🔍 DEBUG: Shared ownership in user household:', sharedOwnershipDebug.rows.length);
        sharedOwnershipDebug.rows.forEach((row) => {
            console.log(`  Asset ${row.asset_id} "${row.asset_name}": member_id=${row.household_member_id} (user_id=${row.user_id}, name="${row.name}"), ${row.ownership_percentage}%, asset_user_id=${row.asset_user_id}`);
        });
        const userSharedAssets = await (0, database_1.query)(`SELECT DISTINCT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
       FROM assets a
       JOIN shared_ownership_distribution sod ON sod.asset_id = a.id
       JOIN household_members hm ON sod.household_member_id = hm.id
       WHERE hm.user_id = $1 AND sod.ownership_percentage > 0`, [req.user.id]);
        console.log('🔍 DEBUG: Assets where user has shared ownership (via household_members.user_id):', userSharedAssets.rows.length);
        userSharedAssets.rows.forEach((asset) => {
            console.log(`  Asset ${asset.id}: "${asset.name}", user_id=${asset.user_id}, member_id=${asset.household_member_id}, type=${asset.ownership_type}`);
        });
    }
    const userMemberResult = await (0, database_1.query)('SELECT id FROM household_members WHERE user_id = $1', [req.user.id]);
    const userMemberId = userMemberResult.rows.length > 0 ? userMemberResult.rows[0].id : null;
    console.log('🔍 DEBUG: User Member ID:', userMemberId);
    if (householdId) {
        const allMembersDebug = await (0, database_1.query)(`SELECT id, name, user_id FROM household_members WHERE household_id = $1`, [householdId]);
        console.log('🔍 DEBUG: All household members:', allMembersDebug.rows.length);
        allMembersDebug.rows.forEach((member) => {
            console.log(`  Member ${member.id}: "${member.name}", user_id=${member.user_id}${member.user_id === req.user.id ? ' <-- THIS IS THE USER' : ''}`);
        });
        const userAsMember = await (0, database_1.query)(`SELECT id, name, user_id FROM household_members WHERE user_id = $1`, [req.user.id]);
        console.log('🔍 DEBUG: User as household_member records:', userAsMember.rows.length);
        userAsMember.rows.forEach((member) => {
            console.log(`  Member ${member.id}: "${member.name}", user_id=${member.user_id}`);
        });
    }
    const memberId = household_member_id ? parseInt(household_member_id) : null;
    console.log('🔍 DEBUG: Filtering by member ID:', memberId);
    console.log('🔍 DEBUG: Building conditions, household_view:', household_view);
    if (household_view === 'true' && req.user.household_id) {
        console.log('🔍 DEBUG: Using household view');
        conditions.push(`a.household_id = $${paramCount++}`);
        params.push(req.user.household_id);
    }
    else if (memberId && !isNaN(memberId)) {
        console.log('🔍 DEBUG: Filtering by member, memberId:', memberId);
        const memberCondition = `(a.household_member_id = $${paramCount++} OR EXISTS (
      SELECT 1 FROM shared_ownership_distribution 
      WHERE asset_id = a.id 
      AND household_member_id = $${paramCount++}
      AND ownership_percentage >= 1
    ))`;
        if (userMemberId) {
            const userCondition = `(a.user_id = $${paramCount++} 
        OR a.household_member_id = $${paramCount++} 
        OR EXISTS (
          SELECT 1 FROM shared_ownership_distribution sod 
          WHERE sod.asset_id = a.id 
          AND sod.household_member_id = $${paramCount++}
          AND sod.ownership_percentage > 0
        ))`;
            conditions.push(`${memberCondition} AND ${userCondition}`);
            params.push(memberId);
            params.push(memberId);
            params.push(req.user.id);
            params.push(userMemberId);
            params.push(userMemberId);
            console.log('🔍 DEBUG: Member filter condition added (with userMemberId)');
            console.log('🔍 DEBUG: Member condition:', memberCondition);
            console.log('🔍 DEBUG: User condition:', userCondition);
        }
        else {
            const userCondition = `a.user_id = $${paramCount++}`;
            conditions.push(`${memberCondition} AND ${userCondition}`);
            params.push(memberId);
            params.push(memberId);
            params.push(req.user.id);
            console.log('🔍 DEBUG: Member filter condition added (no userMemberId, user must be asset creator)');
            console.log('🔍 DEBUG: Member condition:', memberCondition);
            console.log('🔍 DEBUG: User condition:', userCondition);
            console.log('🔍 DEBUG: NOTE - User has no household_member record, so we check a.user_id only');
        }
    }
    else {
        console.log('🔍 DEBUG: Using Personal View (no member filter)');
        if (userMemberId) {
            const personalViewCondition = `(a.user_id = $${paramCount++} 
        OR a.household_member_id = $${paramCount++} 
        OR EXISTS (
          SELECT 1 FROM shared_ownership_distribution sod 
          WHERE sod.asset_id = a.id 
          AND sod.household_member_id = $${paramCount++}
          AND sod.ownership_percentage > 0
        ))`;
            conditions.push(personalViewCondition);
            params.push(req.user.id);
            params.push(userMemberId);
            params.push(userMemberId);
            console.log('🔍 DEBUG: Personal View condition:', personalViewCondition);
        }
        else {
            if (householdId) {
                const personalViewCondition = `(a.user_id = $${paramCount++} 
          OR (a.household_id = $${paramCount++} AND EXISTS (
            SELECT 1 FROM shared_ownership_distribution sod 
            WHERE sod.asset_id = a.id 
            AND sod.ownership_percentage > 0
          )))`;
                conditions.push(personalViewCondition);
                params.push(req.user.id);
                params.push(householdId);
                console.log('🔍 DEBUG: Personal View condition (no userMemberId, checking household_id for shared assets):', personalViewCondition);
            }
            else {
                const personalViewCondition = `a.user_id = $${paramCount++}`;
                conditions.push(personalViewCondition);
                params.push(req.user.id);
                console.log('🔍 DEBUG: Personal View condition (no userMemberId, no household_id):', personalViewCondition);
            }
        }
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
    if (status) {
        conditions.push(`a.status = $${paramCount++}`);
        params.push(status);
    }
    if (ownership_type) {
        conditions.push(`a.ownership_type = $${paramCount++}`);
        params.push(ownership_type);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    console.log('📋 Assets query conditions count:', conditions.length);
    console.log('📋 Assets query params:', params);
    console.log('📋 Assets query params count:', params.length);
    console.log('📋 Full WHERE clause:', whereClause);
    console.log('📋 User ID:', req.user.id);
    console.log('📋 User Member ID:', userMemberId);
    console.log('📋 Filtering by member:', household_member_id);
    conditions.forEach((condition, index) => {
        console.log(`📋 Condition ${index + 1}:`, condition.substring(0, 200));
    });
    let assetsResult;
    try {
        const finalParams = [...params, parseInt(limit), offset];
        const querySql = `SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
              ac.category_type, ac.icon, hm.name as member_name, u.email as user_email
       FROM assets a
       JOIN asset_categories ac ON a.category_id = ac.id
       LEFT JOIN household_members hm ON a.household_member_id = hm.id
       JOIN users u ON a.user_id = u.id
       ${whereClause}
       ORDER BY a.date DESC, a.created_at DESC
       LIMIT $${paramCount++} OFFSET $${paramCount++}`;
        console.log('📋 Final SQL Query:', querySql.substring(0, 500));
        console.log('📋 Final Query Params:', finalParams);
        assetsResult = await (0, database_1.query)(querySql, finalParams);
        console.log('📋 Assets returned:', assetsResult.rows.length);
        console.log('📋 All returned asset IDs:', assetsResult.rows.map((a) => a.id));
        if (assetsResult.rows.length > 0) {
            assetsResult.rows.forEach((asset, index) => {
                console.log(`📋 Asset ${index + 1}:`, {
                    id: asset.id,
                    name: asset.name,
                    user_id: asset.user_id,
                    household_member_id: asset.household_member_id,
                    ownership_type: asset.ownership_type
                });
            });
        }
        else {
            console.log('📋 NO ASSETS RETURNED - This is the problem!');
            console.log('📋 DEBUG: Checking what assets SHOULD be returned...');
            if (memberId && !isNaN(memberId)) {
                const memberOnlyTest = await (0, database_1.query)(`SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
           FROM assets a
           WHERE (a.household_member_id = $1 OR EXISTS (
             SELECT 1 FROM shared_ownership_distribution 
             WHERE asset_id = a.id 
             AND household_member_id = $1
             AND ownership_percentage >= 1
           ))`, [memberId]);
                console.log(`📋 DEBUG: Assets where member ${memberId} has ownership (without user filter):`, memberOnlyTest.rows.length);
                memberOnlyTest.rows.forEach((a) => {
                    console.log(`  - Asset ${a.id}: ${a.name}, user_id=${a.user_id}, member_id=${a.household_member_id}`);
                });
            }
            if (userMemberId) {
                const userOnlyTest = await (0, database_1.query)(`SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
           FROM assets a
           WHERE (a.user_id = $1 OR a.household_member_id = $2 OR EXISTS (
             SELECT 1 FROM shared_ownership_distribution sod 
             WHERE sod.asset_id = a.id 
             AND sod.household_member_id = $2
             AND sod.ownership_percentage > 0
           ))`, [req.user.id, userMemberId]);
                console.log(`📋 DEBUG: Assets where user ${req.user.id} has ownership (with userMemberId):`, userOnlyTest.rows.length);
                userOnlyTest.rows.forEach((a) => {
                    console.log(`  - Asset ${a.id}: ${a.name}, user_id=${a.user_id}, member_id=${a.household_member_id}`);
                });
            }
            else {
                const userOnlyTest = await (0, database_1.query)(`SELECT a.id, a.name, a.user_id, a.household_member_id, a.ownership_type
           FROM assets a
           WHERE (a.user_id = $1 OR EXISTS (
             SELECT 1 FROM shared_ownership_distribution sod 
             JOIN household_members hm ON sod.household_member_id = hm.id
             WHERE sod.asset_id = a.id 
             AND hm.user_id = $1
             AND sod.ownership_percentage > 0
           ))`, [req.user.id]);
                console.log(`📋 DEBUG: Assets where user ${req.user.id} has ownership (no userMemberId):`, userOnlyTest.rows.length);
                userOnlyTest.rows.forEach((a) => {
                    console.log(`  - Asset ${a.id}: ${a.name}, user_id=${a.user_id}, member_id=${a.household_member_id}`);
                });
            }
        }
    }
    catch (error) {
        console.error('❌ Error in assets query:', error);
        throw error;
    }
    const countResult = await (0, database_1.query)(`SELECT COUNT(*) as total
     FROM assets a
     ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].total);
    const assetIds = assetsResult.rows.map(a => a.id);
    let sharedOwnershipMap = {};
    console.log('📋 Asset IDs to fetch shared ownership for:', assetIds);
    if (assetIds.length > 0) {
        try {
            const sharedOwnershipResult = await (0, database_1.query)(`SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.name as member_name, hm.relationship
         FROM shared_ownership_distribution sod
         JOIN household_members hm ON sod.household_member_id = hm.id
         WHERE sod.asset_id = ANY($1::int[])`, [assetIds]);
            console.log('📋 Shared ownership records found:', sharedOwnershipResult.rows.length);
            sharedOwnershipResult.rows.forEach(row => {
                if (!sharedOwnershipMap[row.asset_id]) {
                    sharedOwnershipMap[row.asset_id] = [];
                }
                sharedOwnershipMap[row.asset_id].push({
                    household_member_id: row.household_member_id,
                    ownership_percentage: parseFloat(row.ownership_percentage),
                    member_name: row.member_name,
                    relationship: row.relationship
                });
            });
            console.log('📋 Shared ownership map:', Object.keys(sharedOwnershipMap).length, 'assets with shared ownership');
        }
        catch (error) {
            console.error('Error fetching shared ownership:', error);
        }
    }
    let assetsWithOwnership = assetsResult.rows.map(asset => ({
        ...asset,
        shared_ownership: sharedOwnershipMap[asset.id] || []
    }));
    for (const asset of assetsWithOwnership) {
        if (asset.ownership_type === 'shared' &&
            (!asset.shared_ownership || asset.shared_ownership.length === 0)) {
            try {
                const membersResult = await (0, database_1.query)(`SELECT id, name, relationship FROM household_members 
           WHERE household_id = $1 ORDER BY name`, [asset.household_id]);
                if (membersResult.rows.length > 0) {
                    const percentagePerMember = Math.floor(100 / membersResult.rows.length);
                    const remainder = 100 % membersResult.rows.length;
                    asset.shared_ownership = membersResult.rows.map((member, index) => ({
                        household_member_id: member.id,
                        ownership_percentage: percentagePerMember + (index === 0 ? remainder : 0),
                        member_name: member.name,
                        relationship: member.relationship
                    }));
                    for (const owner of asset.shared_ownership) {
                        await (0, database_1.query)(`INSERT INTO shared_ownership_distribution (asset_id, household_member_id, ownership_percentage)
               VALUES ($1, $2, $3)
               ON CONFLICT (asset_id, household_member_id) DO NOTHING`, [asset.id, owner.household_member_id, owner.ownership_percentage]);
                    }
                }
            }
            catch (error) {
                console.error('Error creating default distribution for asset:', asset.id, error);
            }
        }
    }
    res.json({
        assets: assetsWithOwnership,
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
            ac.category_type, ac.icon, hm.name as member_name, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     LEFT JOIN household_members hm ON a.household_member_id = hm.id
     JOIN users u ON a.user_id = u.id
     WHERE a.id = $1`, [id]);
    if (assetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const asset = assetResult.rows[0];
    if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    const sharedOwnershipResult = await (0, database_1.query)(`SELECT sod.asset_id, sod.household_member_id, sod.ownership_percentage, hm.name as member_name, hm.relationship
     FROM shared_ownership_distribution sod
     JOIN household_members hm ON sod.household_member_id = hm.id
     WHERE sod.asset_id = $1`, [id]);
    const assetWithOwnership = {
        ...asset,
        shared_ownership: sharedOwnershipResult.rows.map(row => ({
            household_member_id: row.household_member_id,
            ownership_percentage: parseFloat(row.ownership_percentage),
            member_name: row.member_name,
            relationship: row.relationship
        }))
    };
    res.json({
        asset: assetWithOwnership
    });
}));
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Asset name cannot be empty'),
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Valid amount required'),
    (0, express_validator_1.body)('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
    (0, express_validator_1.body)('description').optional({ nullable: true, checkFalsy: true }).isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid date required'),
    (0, express_validator_1.body)('household_member_id').optional({ nullable: true, checkFalsy: true }).isInt({ min: 1 }).withMessage('Valid household member ID required'),
    (0, express_validator_1.body)('purchase_date').optional({ nullable: true, checkFalsy: true }).isISO8601().withMessage('Valid purchase date required'),
    (0, express_validator_1.body)('purchase_price').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid purchase price required'),
    (0, express_validator_1.body)('current_value').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0 }).withMessage('Valid current value required'),
    (0, express_validator_1.body)('valuation_method').optional({ nullable: true, checkFalsy: true }).isLength({ max: 50 }).withMessage('Valuation method too long'),
    (0, express_validator_1.body)('ownership_type').optional({ nullable: true, checkFalsy: true }).isIn(['single', 'shared']).withMessage('Invalid ownership type'),
    (0, express_validator_1.body)('ownership_percentage').optional({ nullable: true, checkFalsy: true }).isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
    (0, express_validator_1.body)('status').optional({ nullable: true, checkFalsy: true }).isIn(['active', 'sold', 'transferred', 'inactive']).withMessage('Invalid status'),
    (0, express_validator_1.body)('location').optional().isLength({ max: 500 }).withMessage('Location too long'),
    (0, express_validator_1.body)('notes').optional().isLength({ max: 1000 }).withMessage('Notes too long')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    const updateData = req.body;
    const existingAssetResult = await (0, database_1.query)('SELECT * FROM assets WHERE id = $1', [id]);
    if (existingAssetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const existingAsset = existingAssetResult.rows[0];
    if (req.user.role !== 'admin' && existingAsset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    if (updateData.currency || updateData.purchase_currency) {
        const validCurrencyCodes = await (0, currencyHelpers_1.getActiveCurrencyCodes)();
        if (updateData.currency && !validCurrencyCodes.includes(updateData.currency)) {
            throw (0, errorHandler_1.createValidationError)(`Invalid currency: ${updateData.currency}`);
        }
        if (updateData.purchase_currency && !validCurrencyCodes.includes(updateData.purchase_currency)) {
            throw (0, errorHandler_1.createValidationError)(`Invalid purchase currency: ${updateData.purchase_currency}`);
        }
    }
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    const allowedFields = [
        'name', 'amount', 'currency', 'category_id', 'description', 'date',
        'household_member_id', 'purchase_date', 'purchase_price', 'purchase_currency',
        'current_value', 'valuation_method', 'ownership_type', 'ownership_percentage',
        'status', 'location', 'notes'
    ];
    for (const field of allowedFields) {
        if (updateData[field] !== undefined) {
            updateFields.push(`${field} = $${paramCount++}`);
            updateValues.push(updateData[field]);
        }
    }
    if (updateFields.length === 0) {
        throw (0, errorHandler_1.createValidationError)('No valid fields to update');
    }
    if (updateData.current_value !== undefined) {
        updateFields.push(`last_valuation_date = $${paramCount++}`);
        updateValues.push(new Date().toISOString().split('T')[0]);
    }
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    const result = await (0, database_1.query)(`UPDATE assets SET ${updateFields.join(', ')} WHERE id = $${paramCount++} RETURNING *`, [...updateValues, id]);
    if (updateData.ownership_type === 'shared' && updateData.shared_ownership_percentages) {
        await (0, database_1.query)('DELETE FROM shared_ownership_distribution WHERE asset_id = $1', [id]);
        const sharedPercentages = updateData.shared_ownership_percentages;
        for (const [memberId, percentage] of Object.entries(sharedPercentages)) {
            const percentageValue = typeof percentage === 'number' ? percentage : parseFloat(percentage);
            if (percentageValue > 0) {
                await (0, database_1.query)(`INSERT INTO shared_ownership_distribution (asset_id, household_member_id, ownership_percentage)
           VALUES ($1, $2, $3)`, [id, parseInt(memberId), percentageValue]);
            }
        }
    }
    else if (updateData.ownership_type && updateData.ownership_type !== 'shared') {
        await (0, database_1.query)('DELETE FROM shared_ownership_distribution WHERE asset_id = $1', [id]);
    }
    const hasHistory = await (0, database_1.query)('SELECT COUNT(*) as count FROM asset_valuation_history WHERE asset_id = $1', [id]);
    const historyCount = parseInt(hasHistory.rows[0].count);
    if (updateData.purchase_price !== undefined || updateData.purchase_date !== undefined || updateData.current_value !== undefined || updateData.amount !== undefined) {
        if (historyCount === 0) {
            const purchasePrice = updateData.purchase_price !== undefined ? updateData.purchase_price : existingAsset.purchase_price;
            const purchaseDate = updateData.purchase_date !== undefined ? updateData.purchase_date : existingAsset.purchase_date;
            const currentValue = updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : existingAsset.current_value || existingAsset.amount);
            const currency = updateData.currency || existingAsset.currency;
            if (purchasePrice && purchaseDate) {
                await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`, [id, purchaseDate, purchasePrice, currency, existingAsset.valuation_method || 'Manual', req.user.id]);
                await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`, [id, new Date().toISOString().split('T')[0], currentValue, currency, existingAsset.valuation_method || 'Manual', req.user.id]);
            }
            else {
                await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`, [id, existingAsset.date, currentValue, currency, existingAsset.valuation_method || 'Manual', req.user.id]);
            }
        }
        else {
            const valuations = await (0, database_1.query)('SELECT id FROM asset_valuation_history WHERE asset_id = $1 ORDER BY valuation_date ASC, created_at ASC', [id]);
            if (historyCount === 1 && updateData.purchase_price && updateData.purchase_date) {
                const currentValue = updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : existingAsset.current_value || existingAsset.amount);
                const currency = updateData.currency || existingAsset.currency;
                await (0, database_1.query)(`UPDATE asset_valuation_history SET value = $1, valuation_date = $2 WHERE id = $3`, [updateData.purchase_price, updateData.purchase_date, valuations.rows[0].id]);
                await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`, [id, new Date().toISOString().split('T')[0], currentValue, currency, existingAsset.valuation_method || 'Manual', req.user.id]);
            }
            else {
                const valuationDate = updateData.purchase_date || existingAsset.purchase_date || existingAsset.date || new Date().toISOString().split('T')[0];
                const value = updateData.purchase_price !== undefined ? updateData.purchase_price : (updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : null));
                if (value !== null && value !== undefined) {
                    await (0, database_1.query)(`UPDATE asset_valuation_history 
             SET value = $1, currency = $2, valuation_method = $3, valuation_date = $4
             WHERE id = $5`, [
                        value,
                        updateData.currency || existingAsset.currency,
                        existingAsset.valuation_method || 'Manual',
                        valuationDate,
                        valuations.rows[0].id
                    ]);
                }
                if (valuations.rows.length === 2) {
                    const currentValue = updateData.current_value !== undefined ? updateData.current_value : (updateData.amount !== undefined ? updateData.amount : null);
                    if (currentValue !== null && currentValue !== undefined) {
                        await (0, database_1.query)(`UPDATE asset_valuation_history 
               SET value = $1, currency = $2, valuation_method = $3
               WHERE id = $4`, [
                            currentValue,
                            updateData.currency || existingAsset.currency,
                            existingAsset.valuation_method || 'Manual',
                            valuations.rows[1].id
                        ]);
                    }
                }
            }
        }
    }
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
router.get('/:id/history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    const assetResult = await (0, database_1.query)('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const asset = assetResult.rows[0];
    if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    const historyResult = await (0, database_1.query)(`SELECT avh.*, u.email as created_by_email
     FROM asset_valuation_history avh
     LEFT JOIN users u ON avh.created_by = u.id
     WHERE avh.asset_id = $1
     ORDER BY avh.valuation_date DESC, avh.created_at DESC`, [id]);
    res.json({
        asset_id: id,
        history: historyResult.rows
    });
}));
router.delete('/valuation/:valuationId', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { valuationId } = req.params;
    const valuationResult = await (0, database_1.query)(`SELECT avh.*, a.user_id, a.household_id
     FROM asset_valuation_history avh
     JOIN assets a ON avh.asset_id = a.id
     WHERE avh.id = $1`, [valuationId]);
    if (valuationResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Valuation entry');
    }
    const valuation = valuationResult.rows[0];
    if (req.user.role !== 'admin' && valuation.user_id !== req.user.id) {
        throw new Error('Access denied to this valuation');
    }
    await (0, database_1.query)('DELETE FROM asset_valuation_history WHERE id = $1', [valuationId]);
    res.json({
        message: 'Valuation entry deleted successfully',
        deleted_id: valuationId
    });
}));
router.post('/:id/valuation', [
    (0, express_validator_1.body)('value').isFloat({ min: 0 }).withMessage('Valid value required'),
    (0, express_validator_1.body)('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
    (0, express_validator_1.body)('valuation_date').isISO8601().withMessage('Valid valuation date required'),
    (0, express_validator_1.body)('valuation_method').optional().isLength({ max: 50 }).withMessage('Valuation method too long'),
    (0, express_validator_1.body)('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    const { value, currency, valuation_date, valuation_method, notes } = req.body;
    const assetResult = await (0, database_1.query)('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const asset = assetResult.rows[0];
    if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    const historyResult = await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, notes, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING *`, [id, valuation_date, value, currency, valuation_method || 'Manual', notes || null, req.user.id]);
    await (0, database_1.query)(`UPDATE assets SET current_value = $1, last_valuation_date = $2, updated_at = CURRENT_TIMESTAMP
     WHERE id = $3`, [value, valuation_date, id]);
    res.status(201).json({
        message: 'Valuation added successfully',
        valuation: historyResult.rows[0]
    });
}));
router.post('/:id/photo', upload.single('photo'), (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { id } = req.params;
    if (!req.file) {
        throw (0, errorHandler_1.createValidationError)('No photo file provided');
    }
    const assetResult = await (0, database_1.query)('SELECT * FROM assets WHERE id = $1', [id]);
    if (assetResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Asset');
    }
    const asset = assetResult.rows[0];
    if (req.user.role !== 'admin' && asset.user_id !== req.user.id) {
        throw new Error('Access denied to this asset');
    }
    if (asset.photo_url) {
        const oldPhotoPath = path_1.default.join(__dirname, '../../public', asset.photo_url);
        if (fs_1.default.existsSync(oldPhotoPath)) {
            fs_1.default.unlinkSync(oldPhotoPath);
        }
    }
    const photoUrl = `/uploads/assets/${req.file.filename}`;
    await (0, database_1.query)('UPDATE assets SET photo_url = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [photoUrl, id]);
    res.json({
        message: 'Photo uploaded successfully',
        photo_url: photoUrl
    });
}));
exports.default = router;
//# sourceMappingURL=assets.js.map