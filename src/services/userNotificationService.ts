import { query } from '../config/database';

export interface UserNotification {
  id: number;
  user_id: number;
  type: string;
  title: string;
  message: string;
  related_entity_type: string | null;
  related_entity_id: number | null;
  read: boolean;
  created_at: Date;
  email_sent: boolean;
  email_sent_at: Date | null;
  email_queue_id: string | null;
}

export class UserNotificationService {
  /**
   * Create a user notification
   */
  static async createNotification(
    userId: number,
    type: string,
    title: string,
    message: string,
    relatedEntityType?: string,
    relatedEntityId?: number
  ): Promise<UserNotification> {
    try {
      const result = await query(
        `INSERT INTO user_notifications 
         (user_id, type, title, message, related_entity_type, related_entity_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [userId, type, title, message, relatedEntityType || null, relatedEntityId || null]
      );

      return result.rows[0];
    } catch (error) {
      console.error('Error creating user notification:', error);
      throw error;
    }
  }

  /**
   * Get notifications for a user with pagination
   */
  static async getNotifications(
    userId: number,
    page: number = 1,
    limit: number = 20,
    readFilter?: boolean
  ): Promise<{ notifications: UserNotification[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      let whereClause = 'WHERE user_id = $1';
      let params: any[] = [userId];
      let paramIndex = 2;

      if (readFilter !== undefined) {
        whereClause += ` AND read = $${paramIndex}`;
        params.push(Boolean(readFilter));
        paramIndex++;
      }

      const [notificationsResult, countResult] = await Promise.all([
        query(
          `SELECT * FROM user_notifications 
           ${whereClause}
           ORDER BY created_at DESC
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, limit, offset]
        ),
        query(
          `SELECT COUNT(*) as total FROM user_notifications ${whereClause}`,
          params
        ),
      ]);

      return {
        notifications: notificationsResult.rows,
        total: parseInt(countResult.rows[0]?.total || '0'),
      };
    } catch (error) {
      console.error('Error getting notifications:', error);
      return { notifications: [], total: 0 };
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: number, userId: number): Promise<void> {
    try {
      await query(
        `UPDATE user_notifications 
         SET read = true 
         WHERE id = $1 AND user_id = $2`,
        [notificationId, userId]
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read (or specific ones)
   */
  static async markAllAsRead(
    userId: number,
    notificationIds?: number[]
  ): Promise<void> {
    try {
      if (notificationIds && notificationIds.length > 0) {
        // Mark specific notifications
        const placeholders = notificationIds.map((_, i) => `$${i + 2}`).join(',');
        await query(
          `UPDATE user_notifications 
           SET read = true 
           WHERE user_id = $1 AND id IN (${placeholders})`,
          [userId, ...notificationIds]
        );
      } else {
        // Mark all notifications for user
        await query(
          `UPDATE user_notifications 
           SET read = true 
           WHERE user_id = $1 AND read = false`,
          [userId]
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      throw error;
    }
  }

  /**
   * Get unread count for a user
   */
  static async getUnreadCount(userId: number): Promise<number> {
    try {
      const result = await query(
        `SELECT COUNT(*) as count 
         FROM user_notifications 
         WHERE user_id = $1 AND read = false`,
        [userId]
      );

      return parseInt(result.rows[0]?.count || '0');
    } catch (error) {
      console.error('Error getting unread count:', error);
      return 0;
    }
  }

  /**
   * Delete a notification
   */
  static async deleteNotification(
    notificationId: number,
    userId: number
  ): Promise<void> {
    try {
      const result = await query(
        `DELETE FROM user_notifications 
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [notificationId, userId]
      );

      if (result.rows.length === 0) {
        throw new Error('Notification not found or access denied');
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
      throw error;
    }
  }
}

