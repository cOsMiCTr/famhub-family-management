"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const loginAttemptService_1 = require("../services/loginAttemptService");
const shareRedistributionService_1 = require("../services/shareRedistributionService");
const activityLogService_1 = require("../services/activityLogService");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/login-history', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const limit = parseInt(req.query.limit) || 50;
    const loginHistory = await loginAttemptService_1.LoginAttemptService.getUserLoginHistory(req.user.id, limit);
    res.json({
        login_history: loginHistory
    });
}));
router.get('/account-activity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const userResult = await (0, database_1.query)(`SELECT last_login_at, last_activity_at, account_status, 
            failed_login_attempts, account_locked_until
     FROM users WHERE id = $1`, [req.user.id]);
    if (userResult.rows.length === 0) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not found');
    }
    const user = userResult.rows[0];
    res.json({
        last_login_at: user.last_login_at,
        last_activity_at: user.last_activity_at,
        account_status: user.account_status,
        failed_login_attempts: user.failed_login_attempts,
        account_locked_until: user.account_locked_until
    });
}));
router.delete('/delete-account', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const userId = req.user.id;
    const userEmail = req.user.email;
    console.log(`🗑️ User ${userId} (${userEmail}) requested account deletion`);
    const userResult = await (0, database_1.query)('SELECT household_id, id FROM household_members WHERE user_id = $1', [userId]);
    const householdMemberId = userResult.rows.length > 0 ? userResult.rows[0].id : null;
    const householdId = userResult.rows.length > 0 ? userResult.rows[0].household_id : null;
    const assetsResult = await (0, database_1.query)(`SELECT id, ownership_type, user_id 
     FROM assets 
     WHERE user_id = $1 OR id IN (
       SELECT DISTINCT asset_id 
       FROM shared_ownership_distribution sod
       JOIN household_members hm ON sod.household_member_id = hm.id
       WHERE hm.user_id = $1
     )`, [userId]);
    const assets = assetsResult.rows;
    for (const asset of assets) {
        if (asset.ownership_type === 'shared') {
            try {
                await (0, shareRedistributionService_1.redistributeShares)(asset.id, userId);
            }
            catch (error) {
                console.error(`Error redistributing shares for asset ${asset.id}:`, error);
            }
        }
    }
    if (householdMemberId) {
        await (0, database_1.query)('DELETE FROM income WHERE household_member_id = $1', [householdMemberId]);
    }
    if (householdMemberId) {
        await (0, database_1.query)('DELETE FROM household_members WHERE id = $1', [householdMemberId]);
    }
    await (0, database_1.query)('DELETE FROM household_permissions WHERE user_id = $1', [userId]);
    await (0, database_1.query)('DELETE FROM users WHERE id = $1', [userId]);
    console.log(`✅ User ${userId} (${userEmail}) account deleted successfully`);
    res.json({
        message: 'Account deleted successfully'
    });
}));
router.get('/activity', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        throw (0, errorHandler_1.createUnauthorizedError)('User not authenticated');
    }
    const userId = req.user.id;
    const limit = parseInt(req.query.limit) || 50;
    const activities = await (0, activityLogService_1.getUserActivity)(userId, limit);
    res.json({
        activities
    });
}));
exports.default = router;
//# sourceMappingURL=user.js.map