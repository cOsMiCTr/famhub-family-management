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
const passwordService_1 = require("../services/passwordService");
const loginAttemptService_1 = require("../services/loginAttemptService");
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
    const ipAddress = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'] || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    const userResult = await (0, database_1.query)(`SELECT id, email, password_hash, role, household_id, preferred_language, main_currency,
            must_change_password, account_status, failed_login_attempts, 
            account_locked_until, last_login_at, last_activity_at
     FROM users WHERE email = $1`, [email]);
    if (userResult.rows.length === 0) {
        await loginAttemptService_1.LoginAttemptService.recordLoginAttempt(email, null, false, ipAddress, userAgent, 'User not found');
        throw (0, errorHandler_1.createUnauthorizedError)('Invalid email or password');
    }
    const user = userResult.rows[0];
    const lockStatus = await loginAttemptService_1.LoginAttemptService.isAccountLocked(user.id);
    if (lockStatus.locked) {
        if (user.role === 'admin') {
            await (0, database_1.query)(`UPDATE users 
         SET account_locked_until = NULL,
             failed_login_attempts = 0,
             account_status = 'active'
         WHERE id = $1`, [user.id]);
        }
        else {
            await loginAttemptService_1.LoginAttemptService.recordLoginAttempt(email, user.id, false, ipAddress, userAgent, 'Account locked');
            throw new errorHandler_1.CustomError(`Account is locked until ${lockStatus.lockedUntil?.toISOString()}`, 423, 'ACCOUNT_LOCKED');
        }
    }
    if (user.account_status === 'locked') {
        await loginAttemptService_1.LoginAttemptService.recordLoginAttempt(email, user.id, false, ipAddress, userAgent, 'Account disabled');
        throw new errorHandler_1.CustomError('Account is disabled', 423, 'ACCOUNT_DISABLED');
    }
    const isValidPassword = await passwordService_1.PasswordService.comparePassword(password, user.password_hash);
    if (!isValidPassword) {
        await loginAttemptService_1.LoginAttemptService.incrementFailedAttempts(user.id);
        await loginAttemptService_1.LoginAttemptService.recordLoginAttempt(email, user.id, false, ipAddress, userAgent, 'Invalid password');
        if (user.role !== 'admin') {
            const shouldLock = await loginAttemptService_1.LoginAttemptService.shouldLockAccount(user.id);
            if (shouldLock) {
                await loginAttemptService_1.LoginAttemptService.lockAccount(user.id);
            }
        }
        const remainingAttempts = 3 - (user.failed_login_attempts + 1);
        const lockWarning = user.role === 'admin' ? '' : (remainingAttempts > 0 ? ` ${remainingAttempts} attempts remaining.` : ' Account will be locked.');
        throw new errorHandler_1.CustomError(`Invalid email or password.${lockWarning}`, 401, 'INVALID_CREDENTIALS');
    }
    await loginAttemptService_1.LoginAttemptService.resetFailedAttempts(user.id);
    await (0, database_1.query)(`UPDATE users 
     SET last_login_at = NOW(), 
         last_activity_at = NOW(),
         account_locked_until = NULL,
         account_status = CASE 
           WHEN must_change_password = true THEN 'pending_password_change'
           ELSE 'active'
         END
     WHERE id = $1`, [user.id]);
    await loginAttemptService_1.LoginAttemptService.recordLoginAttempt(email, user.id, true, ipAddress, userAgent);
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
        user: userWithoutPassword,
        must_change_password: user.must_change_password,
        last_login_at: user.last_login_at
    });
}));
router.post('/change-password-first-login', [
    (0, express_validator_1.body)('current_password').isLength({ min: 1 }).withMessage('Current password required'),
    (0, express_validator_1.body)('new_password').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
    (0, express_validator_1.body)('confirm_password').isLength({ min: 8 }).withMessage('Confirm password must be at least 8 characters')
], auth_1.authenticateToken, (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const { current_password, new_password, confirm_password } = req.body;
    if (new_password !== confirm_password) {
        throw (0, errorHandler_1.createValidationError)('Passwords do not match');
    }
    const complexityCheck = passwordService_1.PasswordService.validatePasswordComplexity(new_password);
    if (!complexityCheck.isValid) {
        throw new errorHandler_1.CustomError(`Password does not meet requirements: ${complexityCheck.errors.join(', ')}`, 400, 'PASSWORD_COMPLEXITY_ERROR');
    }
    const userResult = await (0, database_1.query)('SELECT id, password_hash, must_change_password FROM users WHERE id = $1', [req.user.id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not found');
    }
    const user = userResult.rows[0];
    if (!user.must_change_password) {
        throw new errorHandler_1.CustomError('Password change not required', 400, 'PASSWORD_CHANGE_NOT_REQUIRED');
    }
    const isValidCurrentPassword = await passwordService_1.PasswordService.comparePassword(current_password, user.password_hash);
    if (!isValidCurrentPassword) {
        throw (0, errorHandler_1.createUnauthorizedError)('Current password is incorrect');
    }
    const isPasswordReused = await passwordService_1.PasswordService.checkPasswordHistory(req.user.id, new_password);
    if (isPasswordReused) {
        throw new errorHandler_1.CustomError('Cannot reuse a recently used password. Please choose a different password.', 400, 'PASSWORD_REUSE_ERROR');
    }
    const newPasswordHash = await passwordService_1.PasswordService.hashPassword(new_password);
    await (0, database_1.query)(`UPDATE users 
     SET password_hash = $1,
         must_change_password = false,
         account_status = 'active',
         password_changed_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`, [newPasswordHash, req.user.id]);
    await passwordService_1.PasswordService.addToPasswordHistory(req.user.id, user.password_hash);
    res.json({
        message: 'Password changed successfully'
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