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
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
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
    (0, express_validator_1.body)('currency').isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
    (0, express_validator_1.body)('category_id').isInt({ min: 1 }).withMessage('Valid category ID required'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('date').isISO8601().withMessage('Valid date required'),
    (0, express_validator_1.body)('household_member_id').optional().isInt({ min: 1 }).withMessage('Valid household member ID required'),
    (0, express_validator_1.body)('purchase_date').optional().isISO8601().withMessage('Valid purchase date required'),
    (0, express_validator_1.body)('purchase_price').optional().isFloat({ min: 0 }).withMessage('Valid purchase price required'),
    (0, express_validator_1.body)('purchase_currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid purchase currency'),
    (0, express_validator_1.body)('current_value').optional().isFloat({ min: 0 }).withMessage('Valid current value required'),
    (0, express_validator_1.body)('valuation_method').optional().isLength({ max: 50 }).withMessage('Valuation method too long'),
    (0, express_validator_1.body)('ownership_type').optional().isIn(['single', 'shared', 'household']).withMessage('Invalid ownership type'),
    (0, express_validator_1.body)('ownership_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
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
    if (current_value) {
        await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`, [asset.id, new Date().toISOString().split('T')[0], current_value, currency, valuation_method || 'Manual', req.user.id]);
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
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { page = 1, limit = 50, category_id, currency, start_date, end_date, status, ownership_type, household_view = false } = req.query;
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
    if (status) {
        conditions.push(`a.status = $${paramCount++}`);
        params.push(status);
    }
    if (ownership_type) {
        conditions.push(`a.ownership_type = $${paramCount++}`);
        params.push(ownership_type);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const assetsResult = await (0, database_1.query)(`SELECT a.*, ac.name_en as category_name_en, ac.name_de as category_name_de, ac.name_tr as category_name_tr,
            ac.category_type, ac.icon, hm.name as member_name, u.email as user_email
     FROM assets a
     JOIN asset_categories ac ON a.category_id = ac.id
     LEFT JOIN household_members hm ON a.household_member_id = hm.id
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
    res.json({
        asset
    });
}));
router.put('/:id', [
    (0, express_validator_1.body)('name').optional().trim().notEmpty().withMessage('Asset name cannot be empty'),
    (0, express_validator_1.body)('amount').optional().isFloat({ min: 0 }).withMessage('Valid amount required'),
    (0, express_validator_1.body)('currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency'),
    (0, express_validator_1.body)('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
    (0, express_validator_1.body)('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
    (0, express_validator_1.body)('date').optional().isISO8601().withMessage('Valid date required'),
    (0, express_validator_1.body)('household_member_id').optional().isInt({ min: 1 }).withMessage('Valid household member ID required'),
    (0, express_validator_1.body)('purchase_date').optional().isISO8601().withMessage('Valid purchase date required'),
    (0, express_validator_1.body)('purchase_price').optional().isFloat({ min: 0 }).withMessage('Valid purchase price required'),
    (0, express_validator_1.body)('purchase_currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid purchase currency'),
    (0, express_validator_1.body)('current_value').optional().isFloat({ min: 0 }).withMessage('Valid current value required'),
    (0, express_validator_1.body)('valuation_method').optional().isLength({ max: 50 }).withMessage('Valuation method too long'),
    (0, express_validator_1.body)('ownership_type').optional().isIn(['single', 'shared', 'household']).withMessage('Invalid ownership type'),
    (0, express_validator_1.body)('ownership_percentage').optional().isFloat({ min: 0, max: 100 }).withMessage('Ownership percentage must be between 0 and 100'),
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
    if (updateData.current_value !== undefined) {
        await (0, database_1.query)(`INSERT INTO asset_valuation_history (asset_id, valuation_date, value, currency, valuation_method, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`, [
            id,
            new Date().toISOString().split('T')[0],
            updateData.current_value,
            updateData.currency || existingAsset.currency,
            updateData.valuation_method || 'Manual',
            req.user.id
        ]);
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
     ORDER BY avh.valuation_date DESC`, [id]);
    res.json({
        asset_id: id,
        history: historyResult.rows
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
router.get('/summary', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { start_date, end_date, category_id, status = 'active' } = req.query;
    const conditions = ['a.user_id = $1', 'a.status = $2'];
    const params = [req.user.id, status];
    let paramCount = 3;
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
    const exchangeRates = await exchangeRateService_1.exchangeRateService.getAllExchangeRates();
    const userCurrency = req.user.main_currency || 'USD';
    const categoryTotals = {};
    const currencyTotals = {};
    let totalValueInMainCurrency = 0;
    for (const asset of assetsResult.rows) {
        const categoryName = asset.category_name_en;
        const assetCurrency = asset.currency;
        const assetValue = parseFloat(asset.current_value || asset.amount);
        if (!categoryTotals[categoryName]) {
            categoryTotals[categoryName] = {};
        }
        if (!categoryTotals[categoryName][assetCurrency]) {
            categoryTotals[categoryName][assetCurrency] = 0;
        }
        categoryTotals[categoryName][assetCurrency] += assetValue;
        if (!currencyTotals[assetCurrency]) {
            currencyTotals[assetCurrency] = 0;
        }
        currencyTotals[assetCurrency] += assetValue;
        if (assetCurrency === userCurrency) {
            totalValueInMainCurrency += assetValue;
        }
        else {
            const rate = exchangeRates.find(r => r.from_currency === assetCurrency && r.to_currency === userCurrency);
            if (rate) {
                totalValueInMainCurrency += assetValue * rate.rate;
            }
        }
    }
    const assetsWithROI = assetsResult.rows.filter(asset => asset.purchase_price && asset.purchase_price > 0);
    const totalROI = assetsWithROI.reduce((sum, asset) => {
        const purchasePrice = parseFloat(asset.purchase_price);
        const currentValue = parseFloat(asset.current_value || asset.amount);
        return sum + ((currentValue - purchasePrice) / purchasePrice) * 100;
    }, 0);
    const averageROI = assetsWithROI.length > 0 ? totalROI / assetsWithROI.length : 0;
    res.json({
        summary: {
            total_assets: assetsResult.rows.length,
            total_value_main_currency: totalValueInMainCurrency,
            main_currency: userCurrency,
            average_roi: averageROI,
            assets_with_roi: assetsWithROI.length
        },
        category_totals: categoryTotals,
        currency_totals: currencyTotals,
        assets: assetsResult.rows
    });
}));
exports.default = router;
//# sourceMappingURL=assets.js.map