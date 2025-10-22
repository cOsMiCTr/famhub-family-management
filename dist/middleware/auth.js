"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireHouseholdAccess = exports.requireAdmin = exports.authenticateToken = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const database_1 = require("../config/database");
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({
                error: 'Access token required',
                code: 'MISSING_TOKEN'
            });
        }
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) {
            throw new Error('JWT_SECRET not configured');
        }
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const userResult = await (0, database_1.query)('SELECT id, email, role, household_id FROM users WHERE id = $1', [decoded.userId]);
        if (userResult.rows.length === 0) {
            return res.status(401).json({
                error: 'User not found',
                code: 'USER_NOT_FOUND'
            });
        }
        const user = userResult.rows[0];
        req.user = {
            id: user.id,
            email: user.email,
            role: user.role,
            household_id: user.household_id
        };
        next();
    }
    catch (error) {
        if (error instanceof jsonwebtoken_1.default.JsonWebTokenError) {
            return res.status(401).json({
                error: 'Invalid token',
                code: 'INVALID_TOKEN'
            });
        }
        if (error instanceof jsonwebtoken_1.default.TokenExpiredError) {
            return res.status(401).json({
                error: 'Token expired',
                code: 'TOKEN_EXPIRED'
            });
        }
        console.error('Authentication error:', error);
        return res.status(500).json({
            error: 'Authentication failed',
            code: 'AUTH_ERROR'
        });
    }
};
exports.authenticateToken = authenticateToken;
const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            error: 'Admin access required',
            code: 'ADMIN_REQUIRED'
        });
    }
    next();
};
exports.requireAdmin = requireAdmin;
const requireHouseholdAccess = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({
            error: 'Authentication required',
            code: 'AUTH_REQUIRED'
        });
    }
    if (req.user.role === 'admin') {
        return next();
    }
    const householdId = parseInt(req.params.householdId || req.body.household_id || req.query.household_id);
    if (!householdId || req.user.household_id !== householdId) {
        return res.status(403).json({
            error: 'Access denied to this household',
            code: 'HOUSEHOLD_ACCESS_DENIED'
        });
    }
    next();
};
exports.requireHouseholdAccess = requireHouseholdAccess;
//# sourceMappingURL=auth.js.map