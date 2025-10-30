import express from 'express';
import { authenticateToken } from '../middleware/auth';
import ModuleService from '../services/moduleService';
import TokenAccountService from '../services/tokenAccountService';

const router = express.Router();

// ==================== User Routes ====================

/**
 * GET /api/modules
 * Get current user's modules, active modules, and token account
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const modules = await ModuleService.getUserModules(userId);
    const activeModules = await ModuleService.getUserActiveModulesWithExpiration(userId);
    const tokenAccount = await TokenAccountService.getUserTokenAccount(userId);
    
    res.json({
      modules,
      activeModules,
      tokenAccount: {
        balance: parseFloat(tokenAccount.balance.toString()),
        totalPurchased: parseFloat(tokenAccount.total_tokens_purchased.toString())
      }
    });
  } catch (error) {
    console.error('Error fetching user modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/modules/available
 * Get list of available modules to activate with expiration info
 */
router.get('/available', authenticateToken, async (req, res) => {
  try {
    const allModules = await ModuleService.getAllModules();
    const userId = req.user!.id;
    const userModules = await ModuleService.getUserModules(userId);
    const activeModulesWithExpiration = await ModuleService.getUserActiveModulesWithExpiration(userId);
    
    // Include activation status and expiration
    const availableModules = allModules.map(module => {
      const activeModule = activeModulesWithExpiration.find(am => am.module_key === module.module_key);
      return {
        ...module,
        isActive: userModules.includes(module.module_key) && activeModule?.is_active,
        expiresAt: activeModule?.expires_at || null
      };
    });
    
    res.json(availableModules);
  } catch (error) {
    console.error('Error fetching available modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/modules/my-modules
 * Get user's active modules with expiration dates
 */
router.get('/my-modules', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const activeModules = await ModuleService.getUserActiveModulesWithExpiration(userId);
    
    res.json(activeModules);
  } catch (error) {
    console.error('Error fetching user active modules:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/modules/:moduleKey/activate
 * Activate module (consumes 1 token)
 */
router.post('/:moduleKey/activate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const moduleKey = req.params.moduleKey;
    
    // Get or create token account
    const tokenAccount = await TokenAccountService.getUserTokenAccount(userId);
    
    // Check sufficient tokens
    if (tokenAccount.balance < 1) {
      return res.status(400).json({ 
        error: 'Insufficient tokens',
        code: 'INSUFFICIENT_TOKENS',
        required: 1,
        available: parseFloat(tokenAccount.balance.toString())
      });
    }

    // Activate module
    const activation = await ModuleService.activateModule(userId, moduleKey, tokenAccount.id);
    
    // Get updated token account
    const updatedAccount = await TokenAccountService.getUserTokenAccount(userId);
    
    res.json({
      activation,
      tokenAccount: {
        balance: parseFloat(updatedAccount.balance.toString()),
        totalPurchased: parseFloat(updatedAccount.total_tokens_purchased.toString())
      },
      message: `Module ${moduleKey} activated successfully`
    });
  } catch (error: any) {
    console.error('Error activating module:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * POST /api/modules/:moduleKey/deactivate
 * Deactivate module early (refunds if < 15 days)
 */
router.post('/:moduleKey/deactivate', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const moduleKey = req.params.moduleKey;
    
    // Get token account
    const tokenAccount = await TokenAccountService.getUserTokenAccount(userId);
    
    // Deactivate with potential refund
    const result = await ModuleService.deactivateModuleEarly(userId, moduleKey, tokenAccount.id);
    
    // Get updated token account
    const updatedAccount = await TokenAccountService.getUserTokenAccount(userId);
    
    res.json({
      refunded: result.refunded,
      refundAmount: result.refundAmount,
      tokenAccount: {
        balance: parseFloat(updatedAccount.balance.toString()),
        totalPurchased: parseFloat(updatedAccount.total_tokens_purchased.toString())
      },
      message: result.refunded
        ? `Module ${moduleKey} deactivated. ${result.refundAmount} tokens refunded.`
        : `Module ${moduleKey} deactivated. No refund (used for 15+ days).`
    });
  } catch (error: any) {
    console.error('Error deactivating module:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

/**
 * GET /api/modules/token-account
 * Get current user's token account
 */
router.get('/token-account', authenticateToken, async (req, res) => {
  try {
    const userId = req.user!.id;
    const account = await TokenAccountService.getUserTokenAccount(userId);
    const price = await TokenAccountService.getTokenPrice();
    
    res.json({
      balance: parseFloat(account.balance.toString()),
      totalPurchased: parseFloat(account.total_tokens_purchased.toString()),
      tokenPrice: price
    });
  } catch (error) {
    console.error('Error fetching token account:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/modules/token-price
 * Get current token price
 */
router.get('/token-price', authenticateToken, async (req, res) => {
  try {
    const price = await TokenAccountService.getTokenPrice();
    res.json({ price });
  } catch (error) {
    console.error('Error fetching token price:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
