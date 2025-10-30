import { query } from '../config/database';

interface VoucherCode {
  id: number;
  code: string;
  description: string | null;
  discount_percentage: number;
  discount_amount: number;
  minimum_purchase: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: Date;
  valid_until: Date | null;
  is_active: boolean;
  created_by: number | null;
  created_at: Date;
  updated_at: Date;
}

interface VoucherValidationResult {
  valid: boolean;
  voucher?: VoucherCode;
  discount?: number;
  error?: string;
}

interface VoucherApplicationResult {
  success: boolean;
  discount: number;
  originalPrice: number;
  finalPrice: number;
  voucher?: VoucherCode;
  error?: string;
}

class VoucherCodeService {
  /**
   * Validate voucher code for a user and purchase amount
   */
  async validateVoucherCode(
    code: string,
    userId: number,
    purchaseAmount: number
  ): Promise<VoucherValidationResult> {
    const codeUpper = code.toUpperCase().trim();

    // Find voucher code
    const voucherResult = await query(
      `SELECT * FROM voucher_codes WHERE UPPER(code) = $1`,
      [codeUpper]
    );

    if (voucherResult.rows.length === 0) {
      return {
        valid: false,
        error: 'Voucher code not found'
      };
    }

    const voucher = voucherResult.rows[0] as VoucherCode;

    // Check if active
    if (!voucher.is_active) {
      return {
        valid: false,
        error: 'Voucher code is inactive'
      };
    }

    // Check validity dates
    const now = new Date();
    if (new Date(voucher.valid_from) > now) {
      return {
        valid: false,
        error: 'Voucher code is not yet valid'
      };
    }

    if (voucher.valid_until && new Date(voucher.valid_until) < now) {
      return {
        valid: false,
        error: 'Voucher code has expired'
      };
    }

    // Check minimum purchase
    if (voucher.minimum_purchase && purchaseAmount < voucher.minimum_purchase) {
      return {
        valid: false,
        error: `Minimum purchase of ${voucher.minimum_purchase} required for this voucher`
      };
    }

    // Check max uses
    if (voucher.max_uses && voucher.used_count >= voucher.max_uses) {
      return {
        valid: false,
        error: 'Voucher code has reached maximum uses'
      };
    }

    // Calculate discount
    let discount = 0;
    if (voucher.discount_percentage > 0) {
      discount = (purchaseAmount * voucher.discount_percentage) / 100;
    } else if (voucher.discount_amount > 0) {
      discount = voucher.discount_amount;
    }

    // Don't allow discount to exceed purchase amount
    if (discount > purchaseAmount) {
      discount = purchaseAmount;
    }

    return {
      valid: true,
      voucher,
      discount
    };
  }

  /**
   * Apply voucher code to a purchase
   */
  async applyVoucherCode(
    code: string,
    userId: number,
    tokensToPurchase: number,
    tokenPrice: number
  ): Promise<VoucherApplicationResult> {
    const originalPrice = tokensToPurchase * tokenPrice;

    // Validate voucher
    const validation = await this.validateVoucherCode(code, userId, originalPrice);

    if (!validation.valid || !validation.voucher) {
      return {
        success: false,
        discount: 0,
        originalPrice,
        finalPrice: originalPrice,
        error: validation.error
      };
    }

    const discount = validation.discount || 0;
    const finalPrice = Math.max(0, originalPrice - discount);

    // Record usage
    await query(
      `UPDATE voucher_codes 
       SET used_count = used_count + 1, updated_at = NOW()
       WHERE id = $1`,
      [validation.voucher.id]
    );

    // Record voucher usage
    await query(
      `INSERT INTO voucher_usages (voucher_id, user_id, tokens_purchased, original_price, discount_applied, final_price)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        validation.voucher.id,
        userId,
        tokensToPurchase,
        originalPrice,
        discount,
        finalPrice
      ]
    );

    return {
      success: true,
      discount,
      originalPrice,
      finalPrice,
      voucher: validation.voucher
    };
  }

  /**
   * Get all voucher codes (admin)
   */
  async getAllVoucherCodes(filters?: {
    isActive?: boolean;
    search?: string;
  }): Promise<VoucherCode[]> {
    let sql = `SELECT * FROM voucher_codes WHERE 1=1`;
    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.isActive !== undefined) {
      sql += ` AND is_active = $${paramIndex}`;
      params.push(filters.isActive);
      paramIndex++;
    }

    if (filters?.search) {
      sql += ` AND (UPPER(code) LIKE $${paramIndex} OR UPPER(description) LIKE $${paramIndex})`;
      params.push(`%${filters.search.toUpperCase()}%`);
    }

    sql += ` ORDER BY created_at DESC`;

    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Create new voucher code
   */
  async createVoucherCode(params: {
    code: string;
    description?: string;
    discount_percentage?: number;
    discount_amount?: number;
    minimum_purchase?: number;
    max_uses?: number;
    valid_from: Date;
    valid_until?: Date;
    created_by: number;
  }): Promise<VoucherCode> {
    const result = await query(
      `INSERT INTO voucher_codes (
        code, description, discount_percentage, discount_amount,
        minimum_purchase, max_uses, valid_from, valid_until, created_by, is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, true)
      RETURNING *`,
      [
        params.code.toUpperCase().trim(),
        params.description || null,
        params.discount_percentage || 0,
        params.discount_amount || 0,
        params.minimum_purchase || null,
        params.max_uses || null,
        params.valid_from,
        params.valid_until || null,
        params.created_by
      ]
    );

    return result.rows[0];
  }

  /**
   * Update voucher code
   */
  async updateVoucherCode(
    id: number,
    params: Partial<{
      description: string;
      discount_percentage: number;
      discount_amount: number;
      minimum_purchase: number;
      max_uses: number;
      valid_from: Date;
      valid_until: Date;
      is_active: boolean;
    }>
  ): Promise<VoucherCode> {
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        updates.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    });

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await query(
      `UPDATE voucher_codes 
       SET ${updates.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      throw new Error('Voucher code not found');
    }

    return result.rows[0];
  }

  /**
   * Delete/deactivate voucher code
   */
  async deleteVoucherCode(id: number): Promise<void> {
    await query(
      `UPDATE voucher_codes SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );
  }

  /**
   * Get voucher code usage statistics
   */
  async getVoucherUsageStats(voucherId: number): Promise<{
    totalUses: number;
    totalDiscountGiven: number;
    totalRevenue: number;
    recentUsages: any[];
  }> {
    const statsResult = await query(
      `SELECT 
        COUNT(*) as total_uses,
        SUM(discount_applied) as total_discount,
        SUM(final_price) as total_revenue
       FROM voucher_usages
       WHERE voucher_id = $1`,
      [voucherId]
    );

    const recentResult = await query(
      `SELECT vu.*, u.email as user_email
       FROM voucher_usages vu
       JOIN users u ON vu.user_id = u.id
       WHERE vu.voucher_id = $1
       ORDER BY vu.used_at DESC
       LIMIT 10`,
      [voucherId]
    );

    return {
      totalUses: parseInt(statsResult.rows[0].total_uses) || 0,
      totalDiscountGiven: parseFloat(statsResult.rows[0].total_discount) || 0,
      totalRevenue: parseFloat(statsResult.rows[0].total_revenue) || 0,
      recentUsages: recentResult.rows
    };
  }
}

export default new VoucherCodeService();

