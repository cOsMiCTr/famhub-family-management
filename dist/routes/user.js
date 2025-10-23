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
exports.default = router;
//# sourceMappingURL=user.js.map