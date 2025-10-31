import { query } from '../config/database';

export interface LinkedExpense {
  id: number;
  // ... other expense fields
  is_read_only: boolean;
  shared_from_user_id: number | null;
}

export interface LinkedIncome {
  id: number;
  // ... other income fields
  is_read_only: boolean;
  shared_from_user_id: number | null;
}

export interface LinkedAsset {
  id: number;
  // ... other asset fields
  is_read_only: boolean;
  shared_from_user_id: number | null;
}

export interface LinkedDataSummary {
  expenses_count: number;
  expenses_total: number;
  income_count: number;
  income_total: number;
  assets_count: number;
  assets_total_value: number;
}

export class LinkedDataService {
  /**
   * Get expenses linked to an external person via a connection
   */
  static async getLinkedExpenses(
    userId: number,
    connectionId: number
  ): Promise<LinkedExpense[]> {
    try {
      // Verify connection belongs to user and is accepted
      const connectionResult = await query(
        `SELECT external_person_id, invited_by_user_id 
         FROM external_person_user_connections 
         WHERE id = $1 AND status = 'accepted'
         AND (invited_user_id = $2 OR invited_by_user_id = $2)`,
        [connectionId, userId]
      );

      if (connectionResult.rows.length === 0) {
        return [];
      }

      const connection = connectionResult.rows[0];
      const externalPersonId = connection.external_person_id;
      const sharedFromUserId = connection.invited_by_user_id;

      // Get expenses linked to this external person
      const result = await query(
        `SELECT DISTINCT e.*,
                $3::boolean as is_read_only,
                $4::integer as shared_from_user_id
         FROM expenses e
         INNER JOIN expense_external_person_links epl ON e.id = epl.expense_id
         WHERE epl.external_person_id = $1
         ORDER BY e.start_date DESC`,
        [externalPersonId, userId, true, sharedFromUserId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting linked expenses:', error);
      return [];
    }
  }

  /**
   * Get income linked to an external person (if income supports external persons)
   * Note: This is a placeholder for future implementation
   */
  static async getLinkedIncome(
    userId: number,
    connectionId: number
  ): Promise<LinkedIncome[]> {
    try {
      // Verify connection belongs to user and is accepted
      const connectionResult = await query(
        `SELECT external_person_id, invited_by_user_id 
         FROM external_person_user_connections 
         WHERE id = $1 AND status = 'accepted'
         AND (invited_user_id = $2 OR invited_by_user_id = $2)`,
        [connectionId, userId]
      );

      if (connectionResult.rows.length === 0) {
        return [];
      }

      // TODO: Implement when income supports external person linking
      // For now, return empty array
      return [];
    } catch (error) {
      console.error('Error getting linked income:', error);
      return [];
    }
  }

  /**
   * Get assets linked to an external person or where user's household members have ownership
   */
  static async getLinkedAssets(
    userId: number,
    connectionId: number
  ): Promise<LinkedAsset[]> {
    try {
      // Verify connection belongs to user and is accepted
      const connectionResult = await query(
        `SELECT external_person_id, invited_by_user_id, external_person_id
         FROM external_person_user_connections 
         WHERE id = $1 AND status = 'accepted'
         AND (invited_user_id = $2 OR invited_by_user_id = $2)`,
        [connectionId, userId]
      );

      if (connectionResult.rows.length === 0) {
        return [];
      }

      const connection = connectionResult.rows[0];
      const externalPersonId = connection.external_person_id;
      const sharedFromUserId = connection.invited_by_user_id;

      // Get user's household ID
      const userResult = await query(
        `SELECT household_id FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return [];
      }

      const userHouseholdId = userResult.rows[0].household_id;

      // Get assets where:
      // 1. External person is linked (via metadata or direct link), OR
      // 2. User's household members have shared ownership
      const result = await query(
        `SELECT DISTINCT a.*,
                $3::boolean as is_read_only,
                $4::integer as shared_from_user_id,
                SUM(sod.ownership_percentage) FILTER (WHERE sod.household_member_id IN (
                  SELECT id FROM household_members WHERE household_id = $5
                )) as user_household_ownership
         FROM assets a
         LEFT JOIN shared_ownership_distribution sod ON a.id = sod.asset_id
         WHERE (
           -- External person linked (check metadata if needed)
           EXISTS (
             SELECT 1 FROM expense_external_person_links epl
             INNER JOIN expenses e ON epl.expense_id = e.id
             WHERE e.linked_asset_id = a.id AND epl.external_person_id = $1
           )
           OR
           -- User's household members have shared ownership
           EXISTS (
             SELECT 1 FROM shared_ownership_distribution sod2
             INNER JOIN household_members hm ON sod2.household_member_id = hm.id
             WHERE sod2.asset_id = a.id AND hm.household_id = $5
           )
         )
         GROUP BY a.id
         ORDER BY a.created_at DESC`,
        [externalPersonId, userId, true, sharedFromUserId, userHouseholdId]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting linked assets:', error);
      return [];
    }
  }

  /**
   * Get summary of all linked data for a connection
   */
  static async getLinkedDataSummary(
    userId: number,
    connectionId: number
  ): Promise<LinkedDataSummary> {
    try {
      const [expenses, income, assets] = await Promise.all([
        this.getLinkedExpenses(userId, connectionId),
        this.getLinkedIncome(userId, connectionId),
        this.getLinkedAssets(userId, connectionId),
      ]);

      // Calculate totals (using any since we're working with raw DB rows)
      const expensesTotal = expenses.reduce((sum: number, exp: any) => {
        return sum + parseFloat(exp.amount || '0');
      }, 0);

      const incomeTotal = income.reduce((sum: number, inc: any) => {
        return sum + parseFloat(inc.amount || '0');
      }, 0);

      const assetsTotalValue = assets.reduce((sum: number, asset: any) => {
        return sum + parseFloat(asset.current_value || asset.amount || '0');
      }, 0);

      return {
        expenses_count: expenses.length,
        expenses_total: expensesTotal,
        income_count: income.length,
        income_total: incomeTotal,
        assets_count: assets.length,
        assets_total_value: assetsTotalValue,
      };
    } catch (error) {
      console.error('Error getting linked data summary:', error);
      return {
        expenses_count: 0,
        expenses_total: 0,
        income_count: 0,
        income_total: 0,
        assets_count: 0,
        assets_total_value: 0,
      };
    }
  }
}

