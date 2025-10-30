import { query } from '../config/database';

export interface AdminNotification {
  id: number;
  type: string;
  user_id?: number;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  read: boolean;
  created_at: Date;
  user_email?: string;
}

export class NotificationService {
  /**
   * Create an admin notification
   */
  static async createAdminNotification(
    type: string,
    userId: number | null,
    title: string,
    message: string,
    severity: 'info' | 'warning' | 'critical' = 'info'
  ): Promise<AdminNotification> {
    try {
      const result = await query(
        `INSERT INTO admin_notifications (type, user_id, title, message, severity)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [type, userId, title, message, severity]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating admin notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notifications for admin dashboard
   */
  static async getUnreadNotifications(limit: number = 50): Promise<AdminNotification[]> {
    try {
      const result = await query(
        `SELECT an.*, u.email as user_email
         FROM admin_notifications an
         LEFT JOIN users u ON an.user_id = u.id
         WHERE an.read = false
         ORDER BY an.created_at DESC
         LIMIT $1`,
        [limit]
      );

      return result.rows;
    } catch (error) {
      console.error('Error getting unread notifications:', error);
      return [];
    }
  }

  /**
   * Get all notifications with pagination
   */
  static async getAllNotifications(
    page: number = 1,
    limit: number = 20,
    readFilter?: boolean
  ): Promise<{ notifications: AdminNotification[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      let whereClause = '';
      let params: any[] = [];

      console.log('getAllNotifications called with:', { page, limit, readFilter });

      if (readFilter !== undefined) {
        whereClause = 'WHERE an.read = $3';
        params = [limit, offset, readFilter];
      } else {
        params = [limit, offset];
      }

      console.log('Query params:', { whereClause, params });

      const [notificationsResult, countResult] = await Promise.all([
        query(
          `SELECT an.*, u.email as user_email
           FROM admin_notifications an
           LEFT JOIN users u ON an.user_id = u.id
           ${whereClause}
           ORDER BY an.created_at DESC
           LIMIT $1 OFFSET $2`,
          params
        ),
        query(
          `SELECT COUNT(*) as total FROM admin_notifications an ${whereClause}`,
          readFilter !== undefined ? [readFilter] : []
        )
      ]);

      console.log('Query results:', {
        notificationsCount: notificationsResult.rows.length,
        totalCount: countResult.rows[0]?.total,
        notifications: notificationsResult.rows.map(n => ({ id: n.id, title: n.title, read: n.read }))
      });

      return {
        notifications: notificationsResult.rows,
        total: parseInt(countResult.rows[0]?.total || '0')
      };
    } catch (error) {
      console.error('Error getting all notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: number): Promise<void> {
    try {
      await query(
        'UPDATE admin_notifications SET read = true WHERE id = $1',
        [notificationId]
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read
   */
  static async markMultipleAsRead(notificationIds: number[]): Promise<void> {
    try {
      if (notificationIds.length === 0) return;

      const placeholders = notificationIds.map((_, index) => `$${index + 1}`).join(',');
      await query(
        `UPDATE admin_notifications SET read = true WHERE id IN (${placeholders})`,
        notificationIds
      );
    } catch (error) {
      console.error('Error marking multiple notifications as read:', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: number): Promise<void> {
    try {
      await query(
        'DELETE FROM admin_notifications WHERE id = $1',
        [notificationId]
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }

  /**
   * Get notification count by severity
   */
  static async getNotificationCounts(): Promise<{
    unread: number;
    critical: number;
    warning: number;
    info: number;
  }> {
    try {
      console.log('getNotificationCounts called');
      
      const result = await query(
        `SELECT 
           COUNT(*) FILTER (WHERE read = false) as unread,
           COUNT(*) FILTER (WHERE severity = 'critical' AND read = false) as critical,
           COUNT(*) FILTER (WHERE severity = 'warning' AND read = false) as warning,
           COUNT(*) FILTER (WHERE severity = 'info' AND read = false) as info
         FROM admin_notifications`
      );

      const counts = result.rows[0];
      console.log('Notification counts result:', counts);
      
      // Also get all notifications to see what's in the database
      const allNotifications = await query('SELECT id, title, read, severity FROM admin_notifications ORDER BY created_at DESC');
      console.log('All notifications in database:', allNotifications.rows);

      return {
        unread: parseInt(counts.unread || '0'),
        critical: parseInt(counts.critical || '0'),
        warning: parseInt(counts.warning || '0'),
        info: parseInt(counts.info || '0')
      };
    } catch (error) {
      console.error('Error getting notification counts:', error);
      return { unread: 0, critical: 0, warning: 0, info: 0 };
    }
  }

  /**
   * Clean up old read notifications (older than 30 days)
   */
  static async cleanupOldNotifications(): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM admin_notifications 
         WHERE read = true 
         AND created_at < NOW() - INTERVAL '30 days'
         RETURNING id`,
        []
      );

      if (result.rows.length > 0) {
        console.log(`Cleaned up ${result.rows.length} old notifications`);
      }
    } catch (error) {
      console.error('Error cleaning up old notifications:', error);
    }
  }

  /**
   * Create notification for password reset
   */
  static async createPasswordResetNotification(userId: number, adminId: number): Promise<void> {
    try {
      await this.createAdminNotification(
        'password_reset',
        userId,
        'Password Reset Request',
        `Admin has reset the password for user ID ${userId}. User will need to set a new password on next login.`,
        'info'
      );
    } catch (error) {
      console.error('Error creating password reset notification:', error);
    }
  }

  /**
   * Create notification for suspicious login activity
   */
  static async createSuspiciousActivityNotification(
    userId: number,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    try {
      await this.createAdminNotification(
        'suspicious_activity',
        userId,
        'Suspicious Login Activity Detected',
        `Unusual login activity detected from IP: ${ipAddress}. User Agent: ${userAgent}`,
        'warning'
      );
    } catch (error) {
      console.error('Error creating suspicious activity notification:', error);
    }
  }

  /**
   * Create notification for new user creation
   */
  static async createUserCreatedNotification(userId: number, email: string): Promise<void> {
    try {
      await this.createAdminNotification(
        'user_created',
        userId,
        'New User Created',
        `New user account created for ${email}. User will need to set password on first login.`,
        'info'
      );
    } catch (error) {
      console.error('Error creating user created notification:', error);
    }
  }
}
