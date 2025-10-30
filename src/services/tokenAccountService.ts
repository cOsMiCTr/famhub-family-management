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
   * Add tokens to user account
   */
  async addTokens(
    userId: number,
    amount: number,
    source: 'purchase' | 'admin_grant',
    reason?: string
  ): Promise<TokenAccount> {
    // Get or create account
    const account = await this.getUserTokenAccount(userId);

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

    return result.rows[0];
  }

  /**
   * Deduct tokens from user account
   */
  async deductTokens(
    userId: number,
    amount: number,
    reason?: string
  ): Promise<TokenAccount> {
    const account = await this.getUserTokenAccount(userId);

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

    return result.rows[0];
  }

  /**
   * Refund tokens to user account
   */
  async refundTokens(
    userId: number,
    amount: number,
    reason?: string
  ): Promise<TokenAccount> {
    const account = await this.getUserTokenAccount(userId);

    const result = await query(
      `UPDATE user_token_account 
       SET balance = balance + $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [amount, account.id]
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
   * Set token balance directly (admin only)
   */
  async setTokenBalance(
    userId: number,
    balance: number,
    reason?: string
  ): Promise<TokenAccount> {
    const account = await this.getUserTokenAccount(userId);

    if (balance < 0) {
      throw new Error('Token balance cannot be negative');
    }

    const result = await query(
      `UPDATE user_token_account 
       SET balance = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [balance, account.id]
    );

    return result.rows[0];
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

