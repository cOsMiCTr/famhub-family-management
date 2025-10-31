import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth';
import { InvitationService } from '../services/invitationService';
import { asyncHandler } from '../middleware/errorHandler';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticateToken);

// POST /api/invitations - Send invitation
router.post(
  '/',
  [body('external_person_id').isInt({ min: 1 }).withMessage('Valid external person ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { external_person_id } = req.body;
    const userId = req.user!.id;

    try {
      const connection = await InvitationService.sendInvitation(external_person_id, userId);
      res.status(201).json(connection);
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to send invitation' });
    }
  })
);

// GET /api/invitations - Get invitations for current user
router.get('/', asyncHandler(async (req, res) => {
  const userId = req.user!.id;
  const { status } = req.query; // 'pending', 'accepted', 'all'

  try {
    if (status === 'pending') {
      const invitations = await InvitationService.getPendingInvitations(userId);
      return res.json({ invitations });
    } else if (status === 'accepted') {
      const connections = await InvitationService.getAcceptedConnections(userId);
      return res.json({ connections });
    } else {
      // Return both pending and accepted
      const [invitations, connections] = await Promise.all([
        InvitationService.getPendingInvitations(userId),
        InvitationService.getAcceptedConnections(userId),
      ]);
      return res.json({ invitations, connections });
    }
  } catch (error) {
    console.error('Error getting invitations:', error);
    return res.status(500).json({ error: 'Failed to fetch invitations' });
  }
}));

// POST /api/invitations/:id/accept - Accept invitation
router.post(
  '/:id/accept',
  [param('id').isInt({ min: 1 }).withMessage('Valid invitation ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.id);
    const userId = req.user!.id;

    try {
      await InvitationService.acceptInvitation(connectionId, userId);
      res.json({ message: 'Invitation accepted successfully' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to accept invitation' });
    }
  })
);

// POST /api/invitations/:id/reject - Reject invitation
router.post(
  '/:id/reject',
  [param('id').isInt({ min: 1 }).withMessage('Valid invitation ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.id);
    const userId = req.user!.id;

    try {
      await InvitationService.rejectInvitation(connectionId, userId);
      res.json({ message: 'Invitation rejected successfully' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to reject invitation' });
    }
  })
);

// DELETE /api/invitations/:id - Revoke invitation (inviter only)
router.delete(
  '/:id',
  [param('id').isInt({ min: 1 }).withMessage('Valid invitation ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.id);
    const userId = req.user!.id;

    try {
      await InvitationService.revokeInvitation(connectionId, userId);
      res.json({ message: 'Invitation revoked successfully' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to revoke invitation' });
    }
  })
);

// POST /api/invitations/:id/disconnect - Disconnect accepted invitation (either party)
router.post(
  '/:id/disconnect',
  [param('id').isInt({ min: 1 }).withMessage('Valid connection ID required')],
  asyncHandler(async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const connectionId = parseInt(req.params.id);
    const userId = req.user!.id;

    try {
      // Check if user is either inviter or invitee
      const { query } = await import('../config/database');
      const connectionResult = await query(
        `SELECT * FROM external_person_user_connections 
         WHERE id = $1 AND status = 'accepted'
         AND (invited_user_id = $2 OR invited_by_user_id = $2)`,
        [connectionId, userId]
      );

      if (connectionResult.rows.length === 0) {
        return res.status(403).json({ error: 'Connection not found or access denied' });
      }

      // Revoke the connection (which handles notifications)
      // allowInvitee=true allows either party to disconnect
      await InvitationService.revokeInvitation(connectionId, userId, true);
      res.json({ message: 'Connection disconnected successfully' });
    } catch (error: any) {
      return res.status(400).json({ error: error.message || 'Failed to disconnect' });
    }
  })
);

export default router;

