import { query } from '../config/database';

interface TokenAccount {
  id: number;
  user_id: number;
  balance: number;
  total_tokens_purchased: number;
  created_at: Date;
  updated_at: Date;
}

interface TokenTransaction {
  userId: number;
  amount: number;
  source: 'purchase' | 'admin_grant' | 'refund' | 'deduction';
  reason?: string;
}

class TokenAccountService {
  /**
   * Get or create user's token account
   */
  async getUserTokenAccount(userId: number): Promise<TokenAccount> {
    let result = await query(
      'SELECT * FROM user_token_account WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      // Create account if it doesn't exist
      result = await query(
        `INSERT INTO user_token_account (user_id, balance, total_tokens_purchased)
         VALUES ($1, 0, 0)
         RETURNING *`,
        [userId]
      );
    }

    return result.rows[0];
  }

  /**
   * Add tokens to user account and log transaction
   */
  async addTokens(
    userId: number,
    amount: number,
    source: 'purchase' | 'admin_grant',
    reason?: string,
    options?: {
      voucherId?: number;
      voucherDiscount?: number;
      referenceType?: string;
      referenceId?: number;
      processedBy?: number;
    }
  ): Promise<TokenAccount> {
    // Get or create account
    const account = await this.getUserTokenAccount(userId);
    const balanceBefore = parseFloat(account.balance.toString());

    // Update balance and total purchased
    const newTotal = source === 'purchase'
      ? account.total_tokens_purchased + amount
      : account.total_tokens_purchased;

    const result = await query(
      `UPDATE user_token_account 
       SET balance = balance + $1, 
           total_tokens_purchased = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [amount, newTotal, account.id]
    );

    const balanceAfter = parseFloat(result.rows[0].balance.toString());

    // Log transaction
    await query(
      `INSERT INTO token_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, voucher_id, voucher_discount,
        description, processed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        userId,
        source,
        amount,
        balanceBefore,
        balanceAfter,
        options?.referenceType || null,
        options?.referenceId || null,
        options?.voucherId || null,
        options?.voucherDiscount || 0,
        reason || `${source} ${amount} tokens`,
        options?.processedBy || null
      ]
    );

    return result.rows[0];
  }

  /**
   * Deduct tokens from user account and log transaction
   */
  async deductTokens(
    userId: number,
    amount: number,
    reason?: string,
    options?: {
      referenceType?: string;
      referenceId?: number;
    }
  ): Promise<TokenAccount> {
    const account = await this.getUserTokenAccount(userId);
    const balanceBefore = parseFloat(account.balance.toString());

    if (account.balance < amount) {
      throw new Error('Insufficient token balance');
    }

    const result = await query(
      `UPDATE user_token_account 
       SET balance = balance - $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amount, account.id]
    );

    const balanceAfter = parseFloat(result.rows[0].balance.toString());

    // Log transaction
    await query(
      `INSERT INTO token_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, description
      ) VALUES ($1, 'deduction', $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        -amount, // Negative for deduction
        balanceBefore,
        balanceAfter,
        options?.referenceType || null,
        options?.referenceId || null,
        reason || `Deducted ${amount} tokens`
      ]
    );

    return result.rows[0];
  }

  /**
   * Refund tokens to user account and log transaction
   */
  async refundTokens(
    userId: number,
    amount: number,
    reason?: string,
    options?: {
      referenceType?: string;
      referenceId?: number;
    }
  ): Promise<TokenAccount> {
    const account = await this.getUserTokenAccount(userId);
    const balanceBefore = parseFloat(account.balance.toString());

    const result = await query(
      `UPDATE user_token_account 
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amount, account.id]
    );

    const balanceAfter = parseFloat(result.rows[0].balance.toString());

    // Log transaction
    await query(
      `INSERT INTO token_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        reference_type, reference_id, description
      ) VALUES ($1, 'refund', $2, $3, $4, $5, $6, $7)`,
      [
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        options?.referenceType || null,
        options?.referenceId || null,
        reason || `Refunded ${amount} tokens`
      ]
    );

    return result.rows[0];
  }

  /**
   * Get current token price from settings
   * Note: This should be stored in a settings table or environment variable
   * For now, returning a default value
   */
  async getTokenPrice(): Promise<number> {
    // TODO: Implement settings table or use environment variable
    // For now, return default price
    return parseFloat(process.env.TOKEN_PRICE || '10.00');
  }

  /**
   * Set token price (admin only)
   * Note: This should update a settings table
   */
  async setTokenPrice(price: number): Promise<void> {
    // TODO: Implement settings table to store token price
    // For now, can use environment variable or add a settings table
    throw new Error('Token price setting not yet implemented - use environment variable TOKEN_PRICE');
  }

  /**
   * Set token balance directly (admin only) and log transaction
   */
  async setTokenBalance(
    userId: number,
    balance: number,
    reason?: string,
    processedBy?: number
  ): Promise<TokenAccount> {
    const account = await this.getUserTokenAccount(userId);
    const balanceBefore = parseFloat(account.balance.toString());

    if (balance < 0) {
      throw new Error('Token balance cannot be negative');
    }

    const result = await query(
      `UPDATE user_token_account 
       SET balance = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [balance, account.id]);

    const balanceAfter = parseFloat(result.rows[0].balance.toString());
    const amount = balanceAfter - balanceBefore;

    // Log transaction
    await query(
      `INSERT INTO token_transactions (
        user_id, transaction_type, amount, balance_before, balance_after,
        description, processed_by
      ) VALUES ($1, 'balance_adjustment', $2, $3, $4, $5, $6)`,
      [
        userId,
        amount,
        balanceBefore,
        balanceAfter,
        reason || `Balance adjusted to ${balance}`,
        processedBy || null
      ]
    );

    return result.rows[0];
  }

  /**
   * Get user's token transaction history
   */
  async getTokenTransactions(
    userId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const result = await query(
      `SELECT 
        tt.*,
        vc.code as voucher_code,
        u.email as processed_by_email
       FROM token_transactions tt
       LEFT JOIN voucher_codes vc ON tt.voucher_id = vc.id
       LEFT JOIN users u ON tt.processed_by = u.id
       WHERE tt.user_id = $1
       ORDER BY tt.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    return result.rows;
  }

  /**
   * Get total transaction count for user
   */
  async getTransactionCount(userId: number): Promise<number> {
    const result = await query(
      `SELECT COUNT(*) as count FROM token_transactions WHERE user_id = $1`,
      [userId]
    );

    return parseInt(result.rows[0].count) || 0;
  }

  /**
   * Check if user has sufficient tokens
   */
  async hasSufficientTokens(userId: number, amount: number): Promise<boolean> {
    const account = await this.getUserTokenAccount(userId);
    return account.balance >= amount;
  }
}

export default new TokenAccountService();

