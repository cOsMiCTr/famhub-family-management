"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.post('/login', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('password').isLength({ min: 1 }).withMessage('Password required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { email, password } = req.body;
    const userResult = await (0, database_1.query)('SELECT id, email, password_hash, role, household_id, preferred_language, main_currency FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createUnauthorizedError)('Invalid email or password');
    }
    const user = userResult.rows[0];
    const isValidPassword = await bcryptjs_1.default.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw (0, errorHandler_1.createUnauthorizedError)('Invalid email or password');
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new errorHandler_1.CustomError('JWT configuration error', 500, 'CONFIG_ERROR');
    }
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        household_id: user.household_id
    };
    const token = jsonwebtoken_1.default.sign(tokenPayload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
    const { password_hash, ...userWithoutPassword } = user;
    res.json({
        message: 'Login successful',
        token,
        user: userWithoutPassword
    });
}));
router.get('/validate-invitation/:token', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { token } = req.params;
    const invitationResult = await (0, database_1.query)(`SELECT it.*, h.name as household_name, u.email as created_by_email
     FROM invitation_tokens it
     JOIN households h ON it.household_id = h.id
     JOIN users u ON h.created_by_admin_id = u.id
     WHERE it.token = $1 AND it.expires_at > NOW() AND it.used = false`, [token]);
    if (invitationResult.rows.length === 0) {
        throw new errorHandler_1.CustomError('Invalid or expired invitation', 400, 'INVALID_INVITATION');
    }
    const invitation = invitationResult.rows[0];
    res.json({
        valid: true,
        email: invitation.email,
        household_name: invitation.household_name,
        created_by: invitation.created_by_email,
        expires_at: invitation.expires_at
    });
}));
router.post('/complete-registration', [
    (0, express_validator_1.body)('token').isUUID().withMessage('Valid invitation token required'),
    (0, express_validator_1.body)('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    (0, express_validator_1.body)('preferred_language').optional().isIn(['en', 'de', 'tr']).withMessage('Invalid language'),
    (0, express_validator_1.body)('main_currency').optional().isIn(['TRY', 'GBP', 'USD', 'EUR']).withMessage('Invalid currency')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { token, password, preferred_language = 'en', main_currency = 'USD' } = req.body;
    const invitationResult = await (0, database_1.query)('SELECT * FROM invitation_tokens WHERE token = $1 AND expires_at > NOW() AND used = false', [token]);
    if (invitationResult.rows.length === 0) {
        throw new errorHandler_1.CustomError('Invalid or expired invitation', 400, 'INVALID_INVITATION');
    }
    const invitation = invitationResult.rows[0];
    const existingUserResult = await (0, database_1.query)('SELECT id FROM users WHERE email = $1', [invitation.email]);
    if (existingUserResult.rows.length > 0) {
        throw new errorHandler_1.CustomError('User already exists', 400, 'USER_EXISTS');
    }
    const saltRounds = 12;
    const password_hash = await bcryptjs_1.default.hash(password, saltRounds);
    const userResult = await (0, database_1.query)(`INSERT INTO users (email, password_hash, household_id, preferred_language, main_currency, role)
     VALUES ($1, $2, $3, $4, $5, 'user')
     RETURNING id, email, role, household_id, preferred_language, main_currency, created_at`, [invitation.email, password_hash, invitation.household_id, preferred_language, main_currency]);
    const user = userResult.rows[0];
    await (0, database_1.query)('UPDATE invitation_tokens SET used = true WHERE token = $1', [token]);
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new errorHandler_1.CustomError('JWT configuration error', 500, 'CONFIG_ERROR');
    }
    const tokenPayload = {
        userId: user.id,
        email: user.email,
        role: user.role,
        household_id: user.household_id
    };
    const authToken = jsonwebtoken_1.default.sign(tokenPayload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
    res.status(201).json({
        message: 'Registration completed successfully',
        token: authToken,
        user
    });
}));
router.post('/refresh', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        throw new errorHandler_1.CustomError('JWT configuration error', 500, 'CONFIG_ERROR');
    }
    const tokenPayload = {
        userId: req.user.id,
        email: req.user.email,
        role: req.user.role,
        household_id: req.user.household_id
    };
    const token = jsonwebtoken_1.default.sign(tokenPayload, jwtSecret, {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
    res.json({
        message: 'Token refreshed successfully',
        token
    });
}));
router.post('/logout', auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        message: 'Logout successful'
    });
}));
exports.default = router;
//# sourceMappingURL=auth.js.map