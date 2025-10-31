import express from 'express';
import { param, query as expressQuery, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { LinkedDataService } from '../services/linkedDataService';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/linked-data/connections - Get all accepted connections for current user
router.get('/connections', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  try {
    const { InvitationService } = await import('../services/invitationService');
    const connections = await InvitationService.getAcceptedConnections(userId);
    res.json({ connections });
  } catch (error) {
    console.error('Error getting connections:', error);
    return res.status(500).json({ error: 'Failed to fetch connections' });
  }
}));

// GET /api/linked-data/:connectionId/expenses - Get expenses linked to external person
router.get(
  '/:connectionId/expenses',
  [
    param('connectionId').isInt({ min: 1 }).withMessage('Valid connection ID required'),
    expressQuery('start_date').optional().isISO8601().withMessage('Invalid start date format'),
    expressQuery('end_date').optional().isISO8601().withMessage('Invalid end date format'),
    expressQuery('category_id').optional().isInt({ min: 1 }).withMessage('Valid category ID required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.connectionId);
    const userId = req.user!.id;

    try {
      const expenses = await LinkedDataService.getLinkedExpenses(userId, connectionId);
      
      // Apply additional filters if provided
      let filteredExpenses = expenses;
      
      if (req.query.start_date) {
        const startDate = new Date(req.query.start_date as string);
        filteredExpenses = filteredExpenses.filter((exp: any) => {
          const expDate = new Date(exp.start_date);
          return expDate >= startDate;
        });
      }
      
      if (req.query.end_date) {
        const endDate = new Date(req.query.end_date as string);
        filteredExpenses = filteredExpenses.filter((exp: any) => {
          const expDate = new Date(exp.end_date || exp.start_date);
          return expDate <= endDate;
        });
      }
      
      if (req.query.category_id) {
        const categoryId = parseInt(req.query.category_id as string);
        filteredExpenses = filteredExpenses.filter((exp: any) => exp.category_id === categoryId);
      }

      res.json({ expenses: filteredExpenses, total: filteredExpenses.length });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch linked expenses' });
    }
  })
);

// GET /api/linked-data/:connectionId/income - Get income linked to external person
router.get(
  '/:connectionId/income',
  [
    param('connectionId').isInt({ min: 1 }).withMessage('Valid connection ID required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.connectionId);
    const userId = req.user!.id;

    try {
      const income = await LinkedDataService.getLinkedIncome(userId, connectionId);
      res.json({ income, total: income.length });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch linked income' });
    }
  })
);

// GET /api/linked-data/:connectionId/assets - Get assets with shared ownership
router.get(
  '/:connectionId/assets',
  [
    param('connectionId').isInt({ min: 1 }).withMessage('Valid connection ID required'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.connectionId);
    const userId = req.user!.id;

    try {
      const assets = await LinkedDataService.getLinkedAssets(userId, connectionId);
      res.json({ assets, total: assets.length });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch linked assets' });
    }
  })
);

// GET /api/linked-data/:connectionId/summary - Get summary of all linked data
router.get(
  '/:connectionId/summary',
  [param('connectionId').isInt({ min: 1 }).withMessage('Valid connection ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.connectionId);
    const userId = req.user!.id;

    try {
      const summary = await LinkedDataService.getLinkedDataSummary(userId, connectionId);
      res.json(summary);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to fetch summary' });
    }
  })
);

export default router;

