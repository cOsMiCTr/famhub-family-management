import { db } from '../database/connection';
import { query } from '../config/database';
import TokenAccountService from './tokenAccountService';

interface Module {
  module_key: string;
  name: string;
  description: string | null;
  category: 'free' | 'premium';
  display_order: number;
  is_active: boolean;
  metadata: any;
}

interface ModuleActivation {
  id: number;
  user_id: number;
  module_key: string;
  activated_at: Date;
  expires_at: Date;
  activation_order: number;
  is_active: boolean;
  token_used: number;
}

class ModuleService {
  // Free modules that are always available
  private readonly FREE_MODULES = ['dashboard', 'settings', 'family_members'];

  /**
   * Get all registered modules
   */
  async getAllModules(): Promise<Module[]> {
    const result = await query(
      'SELECT * FROM modules WHERE is_active = true ORDER BY display_order ASC, name ASC',
      []
    );
    return result.rows;
  }

  /**
   * Get user's active modules (based on token activations)
   * Returns array of module_key strings
   */
  async getUserModules(userId: number): Promise<string[]> {
    // Always include free modules
    const userModules: string[] = [...this.FREE_MODULES];

    // Get active module activations
    const result = await query(
      `SELECT module_key 
       FROM module_activations 
       WHERE user_id = $1 
         AND is_active = true 
         AND expires_at > NOW()
       ORDER BY activation_order ASC`,
      [userId]
    );

    result.rows.forEach((row: { module_key: string }) => {
      if (!userModules.includes(row.module_key)) {
        userModules.push(row.module_key);
      }
    });

    return userModules;
  }

  /**
   * Check if user has access to specific module
   */
  async hasModuleAccess(userId: number, moduleKey: string): Promise<boolean> {
    // Free modules always allowed
    if (this.FREE_MODULES.includes(moduleKey)) {
      return true;
    }

    // Check for active module activation
    const result = await query(
      `SELECT id 
       FROM module_activations 
       WHERE user_id = $1 
         AND module_key = $2 
         AND is_active = true 
         AND expires_at > NOW()
       LIMIT 1`,
      [userId, moduleKey]
    );

    return result.rows.length > 0;
  }

  /**
   * Activate module for user (consumes 1 token)
   */
  async activateModule(
    userId: number,
    moduleKey: string,
    tokenAccountId: number
  ): Promise<ModuleActivation> {
    // Check if module exists and is active
    const moduleCheck = await query(
      'SELECT module_key FROM modules WHERE module_key = $1 AND is_active = true',
      [moduleKey]
    );

    if (moduleCheck.rows.length === 0) {
      throw new Error(`Module ${moduleKey} not found or inactive`);
    }

    // Check if already active - if so, extend expiration (stacking)
    const existingActivation = await query(
      `SELECT id, expires_at 
       FROM module_activations 
       WHERE user_id = $1 
         AND module_key = $2 
         AND is_active = true 
         AND expires_at > NOW()
       ORDER BY expires_at DESC
       LIMIT 1`,
      [userId, moduleKey]
    );

    if (existingActivation.rows.length > 0) {
      // Extend expiration by 1 month
      const currentExpiresAt = new Date(existingActivation.rows[0].expires_at);
      const newExpiresAt = new Date(currentExpiresAt);
      newExpiresAt.setMonth(newExpiresAt.getMonth() + 1);

      await query(
        `UPDATE module_activations 
         SET expires_at = $1, updated_at = NOW()
         WHERE id = $2`,
        [newExpiresAt, existingActivation.rows[0].id]
      );

      return await query(
        'SELECT * FROM module_activations WHERE id = $1',
        [existingActivation.rows[0].id]
      ).then((result: any) => result.rows[0]);
    }

    // Get next activation order (FIFO)
    const maxOrderResult = await query(
      `SELECT COALESCE(MAX(activation_order), 0) as max_order 
       FROM module_activations 
       WHERE user_id = $1`,
      [userId]
    );
    const nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1;

    // Create new activation
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const result = await query(
      `INSERT INTO module_activations 
       (user_id, module_key, activated_at, expires_at, activation_order, is_active, token_used)
       VALUES ($1, $2, NOW(), $3, $4, true, 1)
       RETURNING *`,
      [userId, moduleKey, expiresAt, nextOrder]
    );

    // Deduct token from account and log transaction
    const account = await query(
      'SELECT * FROM user_token_account WHERE id = $1',
      [tokenAccountId]
    );

    if (account.rows.length === 0 || account.rows[0].balance < 1) {
      throw new Error('Insufficient token balance');
    }

    await TokenAccountService.deductTokens(
      userId,
      1,
      `Module ${moduleKey} activation`,
      {
        referenceType: 'module_activation',
        referenceId: result.rows[0].id
      }
    );

    return result.rows[0];
  }

  /**
   * Deactivate module early (with potential refund)
   */
  async deactivateModuleEarly(
    userId: number,
    moduleKey: string,
    tokenAccountId: number
  ): Promise<{ refunded: boolean; refundAmount: number }> {
    // Get the most recent active activation
    const activationResult = await query(
      `SELECT id, activated_at 
       FROM module_activations 
       WHERE user_id = $1 
         AND module_key = $2 
         AND is_active = true
       ORDER BY activated_at DESC
       LIMIT 1`,
      [userId, moduleKey]
    );

    if (activationResult.rows.length === 0) {
      throw new Error(`No active activation found for module ${moduleKey}`);
    }

    const activation = activationResult.rows[0];
    const activatedAt = new Date(activation.activated_at);
    const now = new Date();
    const daysSinceActivation = Math.floor(
      (now.getTime() - activatedAt.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Mark activation as inactive
    await query(
      `UPDATE module_activations 
       SET is_active = false, updated_at = NOW()
       WHERE id = $1`,
      [activation.id]
    );

    // Refund if < 15 days
    if (daysSinceActivation < 15) {
      await TokenAccountService.refundTokens(
        userId,
        0.5,
        `Early deactivation refund for ${moduleKey}`,
        {
          referenceType: 'module_deactivation',
          referenceId: activation.id
        }
      );
      return { refunded: true, refundAmount: 0.5 };
    }

    return { refunded: false, refundAmount: 0 };
  }

  /**
   * Grant module access directly (admin bypass - doesn't consume tokens)
   */
  async grantModule(
    userId: number,
    moduleKey: string,
    grantedBy: number,
    reason?: string
  ): Promise<ModuleActivation> {
    // Check if module exists
    const moduleCheck = await query(
      'SELECT module_key FROM modules WHERE module_key = $1 AND is_active = true',
      [moduleKey]
    );

    if (moduleCheck.rows.length === 0) {
      throw new Error(`Module ${moduleKey} not found or inactive`);
    }

    // Get next activation order
    const maxOrderResult = await query(
      `SELECT COALESCE(MAX(activation_order), 0) as max_order 
       FROM module_activations 
       WHERE user_id = $1`,
      [userId]
    );
    const nextOrder = (maxOrderResult.rows[0]?.max_order || 0) + 1;

    // Create activation with admin grant (token_used = 0 indicates admin grant)
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const result = await query(
      `INSERT INTO module_activations 
       (user_id, module_key, activated_at, expires_at, activation_order, is_active, token_used)
       VALUES ($1, $2, NOW(), $3, $4, true, 0)
       RETURNING *`,
      [userId, moduleKey, expiresAt, nextOrder]
    );

    return result.rows[0];
  }

  /**
   * Revoke module access
   */
  async revokeModule(userId: number, moduleKey: string): Promise<void> {
    await query(
      `UPDATE module_activations 
       SET is_active = false, updated_at = NOW()
       WHERE user_id = $1 AND module_key = $2 AND is_active = true`,
      [userId, moduleKey]
    );
  }

  /**
   * Get user's active modules with expiration details
   */
  async getUserActiveModulesWithExpiration(
    userId: number
  ): Promise<ModuleActivation[]> {
    const result = await query(
      `SELECT * 
       FROM module_activations 
       WHERE user_id = $1 
         AND is_active = true 
         AND expires_at > NOW()
       ORDER BY activation_order ASC, expires_at ASC`,
      [userId]
    );

    return result.rows;
  }

  /**
   * Check and deactivate expired modules (for scheduled task)
   */
  async deactivateExpiredModules(): Promise<number> {
    const result = await query(
      `UPDATE module_activations 
       SET is_active = false, updated_at = NOW()
       WHERE is_active = true AND expires_at <= NOW()
       RETURNING id`,
      []
    );

    return result.rows.length;
  }
}

export default new ModuleService();

