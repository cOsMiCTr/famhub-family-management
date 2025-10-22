import express from 'express';
import { query } from '../config/database';
import { exchangeRateService } from '../services/exchangeRateService';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';

const router = express.Router();

// Get all exchange rates
router.get('/', asyncHandler(async (req, res) => {
  const rates = await exchangeRateService.getAllExchangeRates();
  
  res.json({
    rates,
    updated_at: new Date().toISOString()
  });
}));

// Convert currency
router.get('/convert', asyncHandler(async (req, res) => {
  const { from, to, amount } = req.query;

  if (!from || !to || !amount) {
    throw createValidationError('Missing required parameters: from, to, amount');
  }

  const fromCurrency = from as string;
  const toCurrency = to as string;
  const amountValue = parseFloat(amount as string);

  if (isNaN(amountValue)) {
    throw createValidationError('Invalid amount value');
  }

  const convertedAmount = await exchangeRateService.convertCurrency(
    amountValue,
    fromCurrency,
    toCurrency
  );

  const rate = await exchangeRateService.getExchangeRate(fromCurrency, toCurrency);

  res.json({
    from_currency: fromCurrency,
    to_currency: toCurrency,
    amount: amountValue,
    converted_amount: convertedAmount,
    rate: rate,
    timestamp: new Date().toISOString()
  });
}));

// Get specific exchange rate
router.get('/rate/:from/:to', asyncHandler(async (req, res) => {
  const { from, to } = req.params;

  const rate = await exchangeRateService.getExchangeRate(from, to);

  res.json({
    from_currency: from,
    to_currency: to,
    rate: rate,
    timestamp: new Date().toISOString()
  });
}));

// Force update exchange rates (admin only)
router.post('/update', asyncHandler(async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    throw new Error('Admin access required');
  }

  await exchangeRateService.forceUpdate();

  res.json({
    message: 'Exchange rates updated successfully',
    timestamp: new Date().toISOString()
  });
}));

export default router;
