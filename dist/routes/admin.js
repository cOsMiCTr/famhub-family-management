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
const notificationService_1 = require("../services/notificationService");
const loginAttemptService_1 = require("../services/loginAttemptService");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.use(auth_1.requireAdmin);
router.post('/users', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('household_id').isInt({ min: 1 }).withMessage('Valid household ID required'),
    (0, express_validator_1.body)('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
    (0, express_validator_1.body)('can_view_contracts').optional().isBoolean().withMessage('Boolean value required'),
    (0, express_validator_1.body)('can_view_income').optional().isBoolean().withMessage('Boolean value required'),
    (0, express_validator_1.body)('can_edit').optional().isBoolean().withMessage('Boolean value required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { email, household_id, role = 'user', can_view_contracts = false, can_view_income = false, can_edit = false } = req.body;
    const householdResult = await (0, database_1.query)('SELECT id, name FROM households WHERE id = $1', [household_id]);
    if (householdResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Household');
    }
    const existingUserResult = await (0, database_1.query)('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
        throw new errorHandler_1.CustomError('User already exists', 400, 'USER_EXISTS');
    }
    const temporaryPassword = passwordService_1.PasswordService.generateSecurePassword();
    const passwordHash = await passwordService_1.PasswordService.hashPassword(temporaryPassword);
    const userResult = await (0, database_1.query)(`INSERT INTO users (email, password_hash, role, household_id, must_change_password, account_status, password_changed_at)
     VALUES ($1, $2, $3, $4, true, 'pending_password_change', NOW())
     RETURNING id, email, role, household_id, created_at`, [email, passwordHash, role, household_id]);
    const user = userResult.rows[0];
    if (can_view_contracts || can_view_income || can_edit) {
        await (0, database_1.query)(`INSERT INTO household_permissions (household_id, user_id, can_view_contracts, can_view_income, can_edit)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (household_id, user_id)
       DO UPDATE SET can_view_contracts = $3, can_view_income = $4, can_edit = $5`, [household_id, user.id, can_view_contracts, can_view_income, can_edit]);
    }
    await notificationService_1.NotificationService.createUserCreatedNotification(user.id, email);
    res.status(201).json({
        message: 'User created successfully',
        user: {
            id: user.id,
            email: user.email,
            role: user.role,
            household_id: user.household_id,
            household_name: householdResult.rows[0].name,
            created_at: user.created_at,
            must_change_password: true,
            account_status: 'pending_password_change'
        },
        temporary_password: temporaryPassword,
        warning: 'This password is shown only once. Please provide it to the user securely.'
    });
}));
router.get('/invitations', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const invitationsResult = await (0, database_1.query)(`SELECT it.*, h.name as household_name, u.email as created_by_email
     FROM invitation_tokens it
     JOIN households h ON it.household_id = h.id
     JOIN users u ON h.created_by_admin_id = u.id
     WHERE it.used = false
     ORDER BY it.created_at DESC`);
    res.json({
        invitations: invitationsResult.rows
    });
}));
router.delete('/invitations/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const result = await (0, database_1.query)('DELETE FROM invitation_tokens WHERE id = $1 AND used = false RETURNING *', [id]);
    if (result.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Invitation');
    }
    res.json({
        message: 'Invitation revoked successfully'
    });
}));
router.get('/users', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const usersResult = await (0, database_1.query)(`SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, u.created_at,
            h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     ORDER BY u.created_at DESC`);
    res.json({
        users: usersResult.rows
    });
}));
router.put('/users/:id', [
    (0, express_validator_1.body)('household_id').optional().isInt({ min: 1 }).withMessage('Valid household ID required'),
    (0, express_validator_1.body)('role').optional().isIn(['admin', 'user']).withMessage('Invalid role'),
    (0, express_validator_1.body)('can_view_contracts').optional().isBoolean().withMessage('Boolean value required'),
    (0, express_validator_1.body)('can_view_income').optional().isBoolean().withMessage('Boolean value required'),
    (0, express_validator_1.body)('can_edit').optional().isBoolean().withMessage('Boolean value required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { id } = req.params;
    const { household_id, role, can_view_contracts, can_view_income, can_edit } = req.body;
    const userResult = await (0, database_1.query)('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('User');
    }
    const updateFields = [];
    const updateValues = [];
    let paramCount = 1;
    if (household_id !== undefined) {
        updateFields.push(`household_id = $${paramCount++}`);
        updateValues.push(household_id);
    }
    if (role !== undefined) {
        updateFields.push(`role = $${paramCount++}`);
        updateValues.push(role);
    }
    if (updateFields.length > 0) {
        updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
        updateValues.push(id);
        await (0, database_1.query)(`UPDATE users SET ${updateFields.join(', ')} WHERE id = $${paramCount}`, updateValues);
    }
    if (household_id && (can_view_contracts !== undefined || can_view_income !== undefined || can_edit !== undefined)) {
        const permissionFields = [];
        const permissionValues = [];
        let permParamCount = 1;
        if (can_view_contracts !== undefined) {
            permissionFields.push(`can_view_contracts = $${permParamCount++}`);
            permissionValues.push(can_view_contracts);
        }
        if (can_view_income !== undefined) {
            permissionFields.push(`can_view_income = $${permParamCount++}`);
            permissionValues.push(can_view_income);
        }
        if (can_edit !== undefined) {
            permissionFields.push(`can_edit = $${permParamCount++}`);
            permissionValues.push(can_edit);
        }
        permissionValues.push(household_id, id);
        await (0, database_1.query)(`INSERT INTO household_permissions (household_id, user_id, ${permissionFields.map(f => f.split(' = ')[0]).join(', ')})
       VALUES ($${permParamCount++}, $${permParamCount++}, ${permissionFields.join(', ')})
       ON CONFLICT (household_id, user_id)
       DO UPDATE SET ${permissionFields.join(', ')}`, permissionValues);
    }
    const updatedUserResult = await (0, database_1.query)(`SELECT u.id, u.email, u.role, u.household_id, u.preferred_language, u.main_currency, u.created_at, u.updated_at,
            h.name as household_name
     FROM users u
     LEFT JOIN households h ON u.household_id = h.id
     WHERE u.id = $1`, [id]);
    res.json({
        message: 'User updated successfully',
        user: updatedUserResult.rows[0]
    });
}));
router.post('/users/:id/reset-password', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userResult = await (0, database_1.query)('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('User');
    }
    const user = userResult.rows[0];
    const temporaryPassword = passwordService_1.PasswordService.generateSecurePassword();
    const passwordHash = await passwordService_1.PasswordService.hashPassword(temporaryPassword);
    await (0, database_1.query)(`UPDATE users 
     SET password_hash = $1,
         must_change_password = true,
         account_status = 'pending_password_change',
         failed_login_attempts = 0,
         account_locked_until = NULL,
         password_changed_at = NOW(),
         updated_at = NOW()
     WHERE id = $2`, [passwordHash, id]);
    await notificationService_1.NotificationService.createPasswordResetNotification(id, req.user.id);
    res.json({
        message: 'Password reset successfully',
        temporary_password: temporaryPassword,
        warning: 'This password is shown only once. Please provide it to the user securely.'
    });
}));
router.post('/users/:id/unlock', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userResult = await (0, database_1.query)('SELECT id, email FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('User');
    }
    await (0, database_1.query)(`UPDATE users 
     SET account_locked_until = NULL,
         failed_login_attempts = 0,
         account_status = 'active',
         updated_at = NOW()
     WHERE id = $1`, [id]);
    await notificationService_1.NotificationService.createAdminNotification('account_unlocked', id, 'Account Unlocked', `Account for ${userResult.rows[0].email} has been manually unlocked by admin.`, 'info');
    res.json({
        message: 'Account unlocked successfully'
    });
}));
router.put('/users/:id/toggle-status', [
    (0, express_validator_1.body)('status').isIn(['active', 'locked']).withMessage('Invalid status')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { id } = req.params;
    const { status } = req.body;
    const userResult = await (0, database_1.query)('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('User');
    }
    if (userResult.rows[0].role === 'admin') {
        throw new errorHandler_1.CustomError('Cannot modify admin account status', 400, 'CANNOT_MODIFY_ADMIN');
    }
    await (0, database_1.query)(`UPDATE users 
     SET account_status = $1,
         updated_at = NOW()
     WHERE id = $2`, [status, id]);
    await notificationService_1.NotificationService.createAdminNotification('account_status_changed', id, 'Account Status Changed', `Account for ${userResult.rows[0].email} has been ${status === 'locked' ? 'disabled' : 'enabled'} by admin.`, 'info');
    res.json({
        message: `Account ${status === 'locked' ? 'disabled' : 'enabled'} successfully`
    });
}));
router.delete('/users/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const userResult = await (0, database_1.query)('SELECT id, role FROM users WHERE id = $1', [id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('User');
    }
    if (userResult.rows[0].role === 'admin') {
        throw new errorHandler_1.CustomError('Cannot deactivate admin user', 400, 'CANNOT_DEACTIVATE_ADMIN');
    }
    await (0, database_1.query)('UPDATE users SET household_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = $1', [id]);
    await (0, database_1.query)('DELETE FROM household_permissions WHERE user_id = $1', [id]);
    res.json({
        message: 'User deactivated successfully'
    });
}));
router.post('/households', [
    (0, express_validator_1.body)('name').isLength({ min: 1, max: 255 }).withMessage('Household name required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { name } = req.body;
    const householdResult = await (0, database_1.query)(`INSERT INTO households (name, created_by_admin_id)
     VALUES ($1, $2)
     RETURNING *`, [name, req.user.id]);
    res.status(201).json({
        message: 'Household created successfully',
        household: householdResult.rows[0]
    });
}));
router.get('/households', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const householdsResult = await (0, database_1.query)(`SELECT h.*, u.email as created_by_email,
            COUNT(u2.id) as member_count
     FROM households h
     LEFT JOIN users u ON h.created_by_admin_id = u.id
     LEFT JOIN users u2 ON h.id = u2.household_id
     GROUP BY h.id, u.email
     ORDER BY h.created_at DESC`);
    res.json({
        households: householdsResult.rows
    });
}));
router.put('/households/:id', [
    (0, express_validator_1.body)('name').isLength({ min: 1, max: 255 }).withMessage('Household name required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { id } = req.params;
    const { name } = req.body;
    const result = await (0, database_1.query)('UPDATE households SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *', [name, id]);
    if (result.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Household');
    }
    res.json({
        message: 'Household updated successfully',
        household: result.rows[0]
    });
}));
router.get('/households/:id/members', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const membersResult = await (0, database_1.query)(`SELECT u.id, u.email, u.role, u.preferred_language, u.main_currency, u.created_at,
            hp.can_view_contracts, hp.can_view_income, hp.can_edit
     FROM users u
     LEFT JOIN household_permissions hp ON u.id = hp.user_id AND hp.household_id = $1
     WHERE u.household_id = $1
     ORDER BY u.created_at`, [id]);
    res.json({
        members: membersResult.rows
    });
}));
router.get('/notifications', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const readFilter = req.query.read ? req.query.read === 'true' : undefined;
    const result = await notificationService_1.NotificationService.getAllNotifications(page, limit, readFilter);
    res.json({
        notifications: result.notifications,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
    });
}));
router.put('/notifications/:id/read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await notificationService_1.NotificationService.markAsRead(parseInt(id));
    res.json({
        message: 'Notification marked as read'
    });
}));
router.put('/notifications/mark-all-read', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { notificationIds } = req.body;
    if (Array.isArray(notificationIds)) {
        await notificationService_1.NotificationService.markMultipleAsRead(notificationIds);
    }
    res.json({
        message: 'Notifications marked as read'
    });
}));
router.delete('/notifications/:id', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    await notificationService_1.NotificationService.deleteNotification(parseInt(id));
    res.json({
        message: 'Notification deleted'
    });
}));
router.get('/security-dashboard', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const [loginStats, notificationCounts, recentFailedAttempts, lockedAccounts, pendingPasswordChanges] = await Promise.all([
        loginAttemptService_1.LoginAttemptService.getLoginStatistics(),
        notificationService_1.NotificationService.getNotificationCounts(),
        loginAttemptService_1.LoginAttemptService.getRecentFailedAttempts(50),
        (0, database_1.query)(`SELECT u.id, u.email, u.account_locked_until, u.last_failed_login_at
       FROM users u
       WHERE u.account_status = 'locked' OR 
       (u.account_locked_until IS NOT NULL AND u.account_locked_until > NOW())
       ORDER BY u.last_failed_login_at DESC`),
        (0, database_1.query)(`SELECT u.id, u.email, u.created_at
       FROM users u
       WHERE u.account_status = 'pending_password_change'
       ORDER BY u.created_at DESC`)
    ]);
    res.json({
        statistics: loginStats,
        notifications: notificationCounts,
        recent_failed_attempts: recentFailedAttempts,
        locked_accounts: lockedAccounts.rows,
        pending_password_changes: pendingPasswordChanges.rows
    });
}));
exports.default = router;
//# sourceMappingURL=admin.js.map