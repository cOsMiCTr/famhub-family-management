"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const uuid_1 = require("uuid");
const express_validator_1 = require("express-validator");
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.requireAdmin);
router.post('/invite-user', [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    (0, express_validator_1.body)('household_id').isInt({ min: 1 }).withMessage('Valid household ID required'),
    (0, express_validator_1.body)('can_view_contracts').optional().isBoolean().withMessage('Boolean value required'),
    (0, express_validator_1.body)('can_view_income').optional().isBoolean().withMessage('Boolean value required'),
    (0, express_validator_1.body)('can_edit').optional().isBoolean().withMessage('Boolean value required')
], (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const errors = (0, express_validator_1.validationResult)(req);
    if (!errors.isEmpty()) {
        throw (0, errorHandler_1.createValidationError)('Invalid input data');
    }
    const { email, household_id, can_view_contracts = false, can_view_income = false, can_edit = false } = req.body;
    const householdResult = await (0, database_1.query)('SELECT id, name FROM households WHERE id = $1', [household_id]);
    if (householdResult.rows.length === 0) {
        throw (0, errorHandler_1.createNotFoundError)('Household');
    }
    const existingUserResult = await (0, database_1.query)('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUserResult.rows.length > 0) {
        throw new errorHandler_1.CustomError('User already exists', 400, 'USER_EXISTS');
    }
    const existingInvitationResult = await (0, database_1.query)('SELECT id FROM invitation_tokens WHERE email = $1 AND expires_at > NOW() AND used = false', [email]);
    if (existingInvitationResult.rows.length > 0) {
        throw new errorHandler_1.CustomError('Invitation already sent and pending', 400, 'INVITATION_EXISTS');
    }
    const token = (0, uuid_1.v4)();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const invitationResult = await (0, database_1.query)(`INSERT INTO invitation_tokens (email, token, household_id, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`, [email, token, household_id, expiresAt]);
    const invitation = invitationResult.rows[0];
    const invitationLink = `${process.env.CLIENT_URL}/register?token=${token}`;
    res.status(201).json({
        message: 'Invitation created successfully',
        invitation: {
            id: invitation.id,
            email: invitation.email,
            household_name: householdResult.rows[0].name,
            expires_at: invitation.expires_at,
            invitation_link: invitationLink
        }
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
exports.default = router;
//# sourceMappingURL=admin.js.map