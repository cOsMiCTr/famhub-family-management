"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
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
    (0, express_validator_1.body)('main_currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR', 'GOLD']).withMessage('Invalid currency')
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
            code: 'TRY',
            name: 'Turkish Lira',
            symbol: '₺',
            name_de: 'Türkische Lira',
            name_tr: 'Türk Lirası'
        },
        {
            code: 'GBP',
            name: 'British Pound',
            symbol: '£',
            name_de: 'Britisches Pfund',
            name_tr: 'İngiliz Sterlini'
        },
        {
            code: 'USD',
            name: 'US Dollar',
            symbol: '$',
            name_de: 'US-Dollar',
            name_tr: 'ABD Doları'
        },
        {
            code: 'EUR',
            name: 'Euro',
            symbol: '€',
            name_de: 'Euro',
            name_tr: 'Euro'
        },
        {
            code: 'GOLD',
            name: 'Gold',
            symbol: 'Au',
            name_de: 'Gold',
            name_tr: 'Altın'
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
exports.default = router;
//# sourceMappingURL=settings.js.map