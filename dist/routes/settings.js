"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const passwordService_1 = require("../services/passwordService");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const userResult = await (0, database_1.query)(`SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, u.created_at,
            h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     WHERE u.id = $1`, [req.user.id]);
    if (userResult.rows.length === 0) {
        throw new Error('User not found');
    }
    const user = userResult.rows[0];
    res.json({
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            household_id: user.household_id,
            household_name: user.household_name,
            preferred_language: user.preferred_language,
            main_currency: user.main_currency,
            created_at: user.created_at
        }
    });
}));
router.put('/', [
    (0, express_validator_1.body)('preferred_language').optional().isIn(['en', 'de', 'tr']).withMessage('Invalid language'),
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw new Error('User not authenticated');
    }
    const { preferred_language, main_currency } = req.body;
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    if (preferred_language !== undefined) {
        updateFields.push(`preferred_language = $${paramCount++}`);
        updateValues.push(preferred_language);
    }
    if (main_currency !== undefined) {
        updateFields.push(`main_currency = $${paramCount++}`);
        updateValues.push(main_currency);
    }
    if (updateFields.length === 0) {
        throw (0, errorHandler_1.createValidationError)('No fields to update');
    }
    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateValues.push(req.user.id);
    const result = await (0, database_1.query)(`UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount} RETURNING *`, updateValues);
    const { password_hash, ...userWithoutPassword } = result.rows[0];
    res.json({
        message: 'Settings updated successfully',
        user: userWithoutPassword
    });
}));
router.get('/currencies', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const currencies = [
        {
            code: 'USD',
            name: 'US Dollar ($)',
            symbol: '$',
            name_de: 'US-Dollar ($)',
            name_tr: 'ABD Doları ($)'
        },
        {
            code: 'EUR',
            name: 'Euro (€)',
            symbol: '€',
            name_de: 'Euro (€)',
            name_tr: 'Euro (€)'
        },
        {
            code: 'GBP',
            name: 'British Pound (£)',
            symbol: '£',
            name_de: 'Britisches Pfund (£)',
            name_tr: 'İngiliz Sterlini (£)'
        },
        {
            code: 'TRY',
            name: 'Turkish Lira (₺)',
            symbol: '₺',
            name_de: 'Türkische Lira (₺)',
            name_tr: 'Türk Lirası (₺)'
        },
        {
            code: 'GOLD',
            name: 'Gold (Au)',
            symbol: 'Au',
            name_de: 'Gold (Au)',
            name_tr: 'Altın (Au)'
        }
    ];
    res.json({
        currencies
    });
}));
router.get('/languages', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const languages = [
        {
            code: 'en',
            name: 'English',
            name_native: 'English'
        },
        {
            code: 'de',
            name: 'German',
            name_native: 'Deutsch'
        },
        {
            code: 'tr',
            name: 'Turkish',
            name_native: 'Türkçe'
        }
    ];
    res.json({
        languages
    });
}));
router.post('/change-password', [
    (0, express_validator_1.body)('current_password').isLength({ min: 1 }).withMessage('Current password required'),
    (0, express_validator_1.body)('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const { current_password, new_password } = req.body;
    const complexityCheck = passwordService_1.PasswordService.validatePasswordComplexity(new_password);
    if (!complexityCheck.isValid) {
        throw (0, errorHandler_1.createValidationError)(`Password does not meet requirements: ${complexityCheck.errors.join(', ')}`);
    }
    const userResult = await (0, database_1.query)('SELECT id, password_hash FROM users WHERE id = $1', [req.user.userId]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not found');
    }
    const user = userResult.rows[0];
    const isValidCurrentPassword = await passwordService_1.PasswordService.comparePassword(current_password, user.password_hash);
    if (!isValidCurrentPassword) {
        throw (0, errorHandler_1.createUnauthorizedError)('Current password is incorrect');
    }
    const isPasswordReused = await passwordService_1.PasswordService.checkPasswordHistory(req.user.id, new_password);
    if (isPasswordReused) {
        throw (0, errorHandler_1.createValidationError)('Cannot reuse a recently used password. Please choose a different password.');
    }
    const newPasswordHash = await passwordService_1.PasswordService.hashPassword(new_password);
    await (0, database_1.query)(`UPDATE users 
     SET password_hash = $1,
         password_changed_at = NOW(),
         account_status = CASE 
           WHEN must_change_password = true THEN 'active'
           ELSE account_status
         END,
         must_change_password = false,
         updated_at = NOW()
     WHERE id = $2`, [newPasswordHash, req.user.id]);
    await passwordService_1.PasswordService.addToPasswordHistory(req.user.id, user.password_hash);
    res.json({
        message: 'Password changed successfully'
    });
}));
exports.default = router;
//# sourceMappingURL=settings.js.map