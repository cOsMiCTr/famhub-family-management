import { query } from '../config/database';

export interface ActivityLogEntry {
  id: number;
  user_id: number;
  action_type: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

/**
 * Log user activity
 */
export async function logActivity(
  userId: number,
  actionType: string,
  description: string,
  ipAddress?: string,
  userAgent?: string
): Promise<void> {
  try {
    await query(
      `INSERT INTO user_activity (user_id, action_type, description, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, actionType, description, ipAddress || null, userAgent || null]
    );
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - activity logging should not break the main flow
  }
}

/**
 * Get user activity logs
 */
export async function getUserActivity(userId: number, limit: number = 50): Promise<ActivityLogEntry[]> {
  const result = await query(
    `SELECT * FROM user_activity 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT $2`,
    [userId, limit]
  );

  return result.rows;
}

