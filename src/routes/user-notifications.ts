import express from 'express';
import { param, query as expressQuery, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { UserNotificationService } from '../services/userNotificationService';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// GET /api/user/notifications - Get notifications for current user
router.get(
  '/',
  [
    expressQuery('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    expressQuery('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    expressQuery('read').optional().isBoolean().withMessage('Read filter must be boolean'),
  ],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const userId = req.user!.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const readFilter = req.query.read !== undefined ? req.query.read === 'true' : undefined;

    try {
      const result = await UserNotificationService.getNotifications(userId, page, limit, readFilter);
      res.json({
        notifications: result.notifications,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit),
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  })
);

// PUT /api/user/notifications/:id/read - Mark notification as read
router.put(
  '/:id/read',
  [param('id').isInt({ min: 1 }).withMessage('Valid notification ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;

    try {
      await UserNotificationService.markAsRead(notificationId, userId);
      res.json({ message: 'Notification marked as read' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to mark notification as read' });
    }
  })
);

// PUT /api/user/notifications/read-all - Mark all notifications as read
router.put(
  '/read-all',
  [],
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;
    const { notification_ids } = req.body; // Optional array of notification IDs

    try {
      await UserNotificationService.markAllAsRead(userId, notification_ids);
      res.json({ message: 'Notifications marked as read' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to mark notifications as read' });
    }
  })
);

// GET /api/user/notifications/unread-count - Get unread count
router.get('/unread-count', asyncHandler(async (req, res) => {
  const userId = req.user!.id;

  try {
    const count = await UserNotificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    console.error('Error getting unread count:', error);
    return res.status(500).json({ error: 'Failed to get unread count' });
  }
}));

// DELETE /api/user/notifications/:id - Delete notification
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid notification ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const notificationId = parseInt(req.params.id);
    const userId = req.user!.id;

    try {
      await UserNotificationService.deleteNotification(notificationId, userId);
      res.json({ message: 'Notification deleted successfully' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to delete notification' });
    }
  })
);

export default router;

