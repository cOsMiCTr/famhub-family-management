"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const errorHandler_1 = require("../middleware/errorHandler");
const router = express_1.default.Router();
router.get('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        message: 'User profile - to be implemented in Phase 8'
    });
}));
router.put('/profile', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    res.status(501).json({
        message: 'User profile update - to be implemented in Phase 8'
    });
}));
exports.default = router;
//# sourceMappingURL=user.js.map