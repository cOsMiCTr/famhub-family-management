import { query } from '../config/database';
import { NotificationService } from './notificationService';

export interface LoginAttempt {
  id: number;
  email: string;
  user_id?: number;
  success: boolean;
  ip_address?: string;
  user_agent?: string;
  failure_reason?: string;
  created_at: Date;
}

export class LoginAttemptService {
  private static readonly MAX_FAILED_ATTEMPTS = 3;
  private static readonly LOCK_DURATION_MINUTES = 30;

  /**
   * Record a login attempt
   */
  static async recordLoginAttempt(
    email: string,
    userId: number | null,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
    failureReason?: string
  ): Promise<void> {
    try {
      await query(
        `INSERT INTO login_attempts (email, user_id, success, ip_address, user_agent, failure_reason)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [email, userId, success, ipAddress, userAgent, failureReason]
      );
    } catch (error) {
      console.error('Error recording login attempt:', error);
      throw error;
    }
  }

  /**
   * Get failed login attempts for a user in the last 30 minutes
   */
  static async getFailedAttempts(userId: number, timeWindowMinutes: number = 30): Promise<LoginAttempt[]> {
    try {
      const result = await query(
        `SELECT * FROM login_attempts 
         WHERE user_id = $1 AND success = false 
         AND created_at > NOW() - INTERVAL '${timeWindowMinutes} minutes'
         ORDER BY created_at DESC`,
        [userId]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting failed attempts:', error);
      return [];
    }
  }

  /**
   * Check if account should be locked based on failed attempts
   */
  static async shouldLockAccount(userId: number): Promise<boolean> {
    try {
      const failedAttempts = await this.getFailedAttempts(userId, 30);
      return failedAttempts.length >= this.MAX_FAILED_ATTEMPTS;
    } catch (error) {
      console.error('Error checking if account should be locked:', error);
      return false;
    }
  }

  /**
   * Lock user account for specified duration
   */
  static async lockAccount(userId: number, lockDurationMinutes: number = this.LOCK_DURATION_MINUTES): Promise<void> {
    try {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + lockDurationMinutes);

      await query(
        `UPDATE users 
         SET account_locked_until = $1, 
             failed_login_attempts = $2,
             last_failed_login_at = NOW(),
             account_status = 'locked'
         WHERE id = $3`,
        [lockUntil, this.MAX_FAILED_ATTEMPTS, userId]
      );

      // Create admin notification
      await NotificationService.createAdminNotification(
        'account_locked',
        userId,
        'Account Locked Due to Failed Login Attempts',
        `User account has been locked due to ${this.MAX_FAILED_ATTEMPTS} failed login attempts.`,
        'warning'
      );

      console.log(`Account ${userId} locked until ${lockUntil}`);
    } catch (error) {
      console.error('Error locking account:', error);
      throw error;
    }
  }

  /**
   * Unlock user account
   */
  static async unlockAccount(userId: number): Promise<void> {
    try {
      await query(
        `UPDATE users 
         SET account_locked_until = NULL, 
             failed_login_attempts = 0,
             account_status = 'active'
         WHERE id = $1`,
        [userId]
      );

      // Create admin notification
      await NotificationService.createAdminNotification(
        'account_unlocked',
        userId,
        'Account Unlocked',
        'User account has been manually unlocked by admin.',
        'info'
      );

      console.log(`Account ${userId} unlocked`);
    } catch (error) {
      console.error('Error unlocking account:', error);
      throw error;
    }
  }

  /**
   * Check if account is currently locked
   */
  static async isAccountLocked(userId: number): Promise<{ locked: boolean; lockedUntil?: Date }> {
    try {
      const result = await query(
        'SELECT account_locked_until, account_status FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return { locked: false };
      }

      const user = result.rows[0];
      
      // Check if account status is locked
      if (user.account_status === 'locked') {
        return { locked: true, lockedUntil: user.account_locked_until };
      }

      // Check if lock time has expired
      if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
        return { locked: true, lockedUntil: user.account_locked_until };
      }

      return { locked: false };
    } catch (error) {
      console.error('Error checking account lock status:', error);
      return { locked: false };
    }
  }

  /**
   * Auto-unlock expired account locks
   */
  static async autoUnlockExpiredAccounts(): Promise<void> {
    try {
      const result = await query(
        `UPDATE users 
         SET account_locked_until = NULL, 
             failed_login_attempts = 0,
             account_status = 'active'
         WHERE account_locked_until IS NOT NULL 
         AND account_locked_until < NOW()
         AND account_status = 'locked'
         RETURNING id, email`,
        []
      );

      if (result.rows.length > 0) {
        console.log(`Auto-unlocked ${result.rows.length} expired accounts`);
        
        // Create notifications for auto-unlocked accounts
        for (const user of result.rows) {
          await NotificationService.createAdminNotification(
            'account_auto_unlocked',
            user.id,
            'Account Auto-Unlocked',
            `Account for ${user.email} was automatically unlocked after lock period expired.`,
            'info'
          );
        }
      }
    } catch (error) {
      console.error('Error auto-unlocking expired accounts:', error);
    }
  }

  /**
   * Increment failed login attempts counter
   */
  static async incrementFailedAttempts(userId: number): Promise<void> {
    try {
      await query(
        `UPDATE users 
         SET failed_login_attempts = failed_login_attempts + 1,
             last_failed_login_at = NOW()
         WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      console.error('Error incrementing failed attempts:', error);
      throw error;
    }
  }

  /**
   * Reset failed login attempts counter
   */
  static async resetFailedAttempts(userId: number): Promise<void> {
    try {
      await query(
        `UPDATE users 
         SET failed_login_attempts = 0
         WHERE id = $1`,
        [userId]
      );
    } catch (error) {
      console.error('Error resetting failed attempts:', error);
      throw error;
    }
  }

  /**
   * Get login attempts for a user (last 30 days)
   */
  static async getUserLoginHistory(userId: number, limit: number = 50): Promise<LoginAttempt[]> {
    try {
      const result = await query(
        `SELECT * FROM login_attempts 
         WHERE user_id = $1 
         AND created_at > NOW() - INTERVAL '30 days'
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userId, limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting user login history:', error);
      return [];
    }
  }

  /**
   * Get recent failed login attempts across all users (for admin dashboard)
   */
  static async getRecentFailedAttempts(limit: number = 100): Promise<LoginAttempt[]> {
    try {
      const result = await query(
        `SELECT la.*, u.email as user_email
         FROM login_attempts la
         LEFT JOIN users u ON la.user_id = u.id
         WHERE la.success = false 
         AND la.created_at > NOW() - INTERVAL '24 hours'
         ORDER BY la.created_at DESC 
         LIMIT $1`,
        [limit]
      );
      
      return result.rows;
    } catch (error) {
      console.error('Error getting recent failed attempts:', error);
      return [];
    }
  }

  /**
   * Get login statistics for admin dashboard
   */
  static async getLoginStatistics(): Promise<{
    totalFailedAttempts24h: number;
    lockedAccountsCount: number;
    recentSuspiciousActivity: number;
  }> {
    try {
      const [failedAttemptsResult, lockedAccountsResult, suspiciousActivityResult] = await Promise.all([
        query(
          `SELECT COUNT(*) as count FROM login_attempts 
           WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'`
        ),
        query(
          `SELECT COUNT(*) as count FROM users 
           WHERE account_status = 'locked' OR 
           (account_locked_until IS NOT NULL AND account_locked_until > NOW())`
        ),
        query(
          `SELECT COUNT(*) as count FROM login_attempts 
           WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
           GROUP BY ip_address HAVING COUNT(*) > 10`
        )
      ]);

      return {
        totalFailedAttempts24h: parseInt(failedAttemptsResult.rows[0]?.count || '0'),
        lockedAccountsCount: parseInt(lockedAccountsResult.rows[0]?.count || '0'),
        recentSuspiciousActivity: suspiciousActivityResult.rows.length
      };
    } catch (error) {
      console.error('Error getting login statistics:', error);
      return {
        totalFailedAttempts24h: 0,
        lockedAccountsCount: 0,
        recentSuspiciousActivity: 0
      };
    }
  }
}
