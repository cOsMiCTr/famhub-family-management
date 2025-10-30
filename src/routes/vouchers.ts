import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { requireAdmin } from '../middleware/auth';
import VoucherCodeService from '../services/voucherCodeService';
import TokenAccountService from '../services/tokenAccountService';
import { asyncHandler, createValidationError } from '../middleware/errorHandler';

const router = express.Router();

// ==================== User Routes ====================

/**
 * POST /api/vouchers/validate
 * Validate voucher code (check if valid, get discount info)
 */
router.post('/validate', authenticateToken, asyncHandler(async (req, res) => {
  const { code, purchaseAmount } = req.body;

  if (!code) {
    throw createValidationError('Voucher code is required');
  }

  if (!purchaseAmount || purchaseAmount <= 0) {
    throw createValidationError('Purchase amount must be greater than 0');
  }

  const validation = await VoucherCodeService.validateVoucherCode(
    code,
    req.user!.id,
    purchaseAmount
  );

  if (!validation.valid) {
    return res.status(400).json({
      valid: false,
      error: validation.error
    });
  }

  res.json({
    valid: true,
    voucher: {
      code: validation.voucher!.code,
      description: validation.voucher!.description,
      discount_percentage: validation.voucher!.discount_percentage,
      discount_amount: validation.voucher!.discount_amount
    },
    discount: validation.discount
  });
}));

export default router;

