"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const exchangeRateService_1 = require("../services/exchangeRateService");
const errorHandler_1 = require("../middleware/errorHandler");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
router.use(auth_1.authenticateToken);
router.get('/', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const rates = await exchangeRateService_1.exchangeRateService.getAllExchangeRates();
    res.json({
        rates,
        updated_at: new Date().toISOString()
    });
}));
router.get('/convert', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { from, to, amount } = req.query;
    if (!from || !to || !amount) {
        throw (0, errorHandler_1.createValidationError)('Missing required parameters: from, to, amount');
    }
    const fromCurrency = from;
    const toCurrency = to;
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue)) {
        throw (0, errorHandler_1.createValidationError)('Invalid amount value');
    }
    const convertedAmount = await exchangeRateService_1.exchangeRateService.convertCurrency(amountValue, fromCurrency, toCurrency);
    const rate = await exchangeRateService_1.exchangeRateService.getExchangeRate(fromCurrency, toCurrency);
    res.json({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        amount: amountValue,
        converted_amount: convertedAmount,
        rate: rate,
        timestamp: new Date().toISOString()
    });
}));
router.get('/rate/:from/:to', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    const { from, to } = req.params;
    const rate = await exchangeRateService_1.exchangeRateService.getExchangeRate(from, to);
    res.json({
        from_currency: from,
        to_currency: to,
        rate: rate,
        timestamp: new Date().toISOString()
    });
}));
router.post('/update', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        throw new Error('Admin access required');
    }
    await exchangeRateService_1.exchangeRateService.forceUpdate();
    res.json({
        message: 'Exchange rates updated successfully',
        timestamp: new Date().toISOString()
    });
}));
router.post('/sync', (0, errorHandler_1.asyncHandler)(async (req, res) => {
    console.log('🔄 Manual exchange rate sync initiated...');
    await exchangeRateService_1.exchangeRateService.forceUpdate();
    console.log('✅ Exchange rates synced successfully');
    res.json({
        success: true,
        message: 'Exchange rates synced successfully',
        timestamp: new Date().toISOString()
    });
}));
exports.default = router;
//# sourceMappingURL=exchange.js.map