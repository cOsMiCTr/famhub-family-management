import { query } from '../config/database';
import { UserNotificationService } from './userNotificationService';

export interface ExternalPersonConnection {
  id: number;
  external_person_id: number;
  invited_user_id: number;
  invited_by_user_id: number;
  status: 'pending' | 'accepted' | 'rejected' | 'revoked' | 'expired';
  invited_at: Date;
  responded_at: Date | null;
  expires_at: Date;
  created_at: Date;
  updated_at: Date;
  // Additional info from joins
  external_person_name?: string;
  external_person_email?: string;
  invited_user_email?: string;
  invited_by_user_email?: string;
}

export interface EmailMatchResult {
  userId: number | null;
  userEmail: string | null;
}

export interface CanInviteResult {
  canInvite: boolean;
  reason?: string;
}

export class InvitationService {
  /**
   * Check if an email matches a registered user
   */
  static async checkEmailMatchesUser(email: string): Promise<EmailMatchResult> {
    if (!email) {
      return { userId: null, userEmail: null };
    }

    try {
      const normalizedEmail = email.toLowerCase().trim();
      const result = await query(
        `SELECT id, email FROM users WHERE LOWER(email) = $1`,
        [normalizedEmail]
      );

      if (result.rows.length > 0) {
        return {
          userId: result.rows[0].id,
          userEmail: result.rows[0].email,
        };
      }

      return { userId: null, userEmail: null };
    } catch (error) {
      console.error('Error checking email match:', error);
      return { userId: null, userEmail: null };
    }
  }

  /**
   * Check if a user can invite an external person
   */
  static async canInvite(
    externalPersonId: number,
    userId: number
  ): Promise<CanInviteResult> {
    try {
      // Get external person details
      const personResult = await query(
        `SELECT id, email, household_id, created_by_user_id 
         FROM external_persons 
         WHERE id = $1`,
        [externalPersonId]
      );

      if (personResult.rows.length === 0) {
        return { canInvite: false, reason: 'External person not found' };
      }

      const person = personResult.rows[0];

      // Verify user belongs to the same household
      const userResult = await query(
        `SELECT household_id FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        return { canInvite: false, reason: 'User not found' };
      }

      const userHouseholdId = userResult.rows[0].household_id;
      if (userHouseholdId !== person.household_id) {
        return {
          canInvite: false,
          reason: 'User does not belong to the same household',
        };
      }

      // Check if external person has an email
      if (!person.email) {
        return { canInvite: false, reason: 'External person has no email' };
      }

      // Check if email matches a user
      const emailMatch = await this.checkEmailMatchesUser(person.email);
      if (!emailMatch.userId) {
        return {
          canInvite: false,
          reason: 'No registered user found with this email',
        };
      }

      // Prevent self-invitation
      if (emailMatch.userId === userId) {
        return { canInvite: false, reason: 'Cannot invite yourself' };
      }

      // Check if invitation already exists (pending or accepted)
      const existingConnection = await query(
        `SELECT id, status 
         FROM external_person_user_connections 
         WHERE external_person_id = $1 AND invited_user_id = $2 
         AND status IN ('pending', 'accepted')`,
        [externalPersonId, emailMatch.userId]
      );

      if (existingConnection.rows.length > 0) {
        const connection = existingConnection.rows[0];
        if (connection.status === 'pending') {
          return {
            canInvite: false,
            reason: 'An invitation is already pending',
          };
        }
        if (connection.status === 'accepted') {
          return {
            canInvite: false,
            reason: 'Invitation already accepted',
          };
        }
      }

      return { canInvite: true };
    } catch (error) {
      console.error('Error checking if can invite:', error);
      return { canInvite: false, reason: 'Database error' };
    }
  }

  /**
   * Send an invitation
   */
  static async sendInvitation(
    externalPersonId: number,
    invitedByUserId: number
  ): Promise<ExternalPersonConnection> {
    try {
      // Verify can invite
      const canInviteResult = await this.canInvite(externalPersonId, invitedByUserId);
      if (!canInviteResult.canInvite) {
        throw new Error(canInviteResult.reason || 'Cannot send invitation');
      }

      // Get external person email
      const personResult = await query(
        `SELECT email FROM external_persons WHERE id = $1`,
        [externalPersonId]
      );
      const personEmail = personResult.rows[0].email;

      // Get invited user ID
      const emailMatch = await this.checkEmailMatchesUser(personEmail);
      if (!emailMatch.userId) {
        throw new Error('No user found with matching email');
      }

      const invitedUserId = emailMatch.userId;

      // Calculate expiry (5 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 5);

      // Create connection
      const result = await query(
        `INSERT INTO external_person_user_connections 
         (external_person_id, invited_user_id, invited_by_user_id, status, expires_at)
         VALUES ($1, $2, $3, 'pending', $4)
         RETURNING *`,
        [externalPersonId, invitedUserId, invitedByUserId, expiresAt]
      );

      const connection = result.rows[0];

      // Get inviter email for notification
      const inviterResult = await query(
        `SELECT email FROM users WHERE id = $1`,
        [invitedByUserId]
      );
      const inviterEmail = inviterResult.rows[0]?.email || 'Someone';

      // Create notification for invited user
      await UserNotificationService.createNotification(
        invitedUserId,
        'invitation_received',
        'You have been invited to view linked financial data',
        `${inviterEmail} has invited you to view expenses, income, and assets linked to you. Click to accept or reject.`,
        'external_person_connection',
        connection.id
      );

      return this.enrichConnection(connection);
    } catch (error) {
      console.error('Error sending invitation:', error);
      throw error;
    }
  }

  /**
   * Accept an invitation
   */
  static async acceptInvitation(
    connectionId: number,
    userId: number
  ): Promise<void> {
    try {
      // Verify connection belongs to user and is pending
      const connectionResult = await query(
        `SELECT * FROM external_person_user_connections 
         WHERE id = $1 AND invited_user_id = $2 AND status = 'pending'`,
        [connectionId, userId]
      );

      if (connectionResult.rows.length === 0) {
        throw new Error('Invitation not found or already processed');
      }

      const connection = connectionResult.rows[0];

      // Check if expired
      if (new Date() > new Date(connection.expires_at)) {
        // Update to expired
        await query(
          `UPDATE external_person_user_connections 
           SET status = 'expired', responded_at = NOW() 
           WHERE id = $1`,
          [connectionId]
        );
        throw new Error('Invitation has expired');
      }

      // Update connection to accepted
      await query(
        `UPDATE external_person_user_connections 
         SET status = 'accepted', responded_at = NOW() 
         WHERE id = $1`,
        [connectionId]
      );

      // Create notification for inviter
      await UserNotificationService.createNotification(
        connection.invited_by_user_id,
        'invitation_accepted',
        'Your invitation was accepted',
        `Your invitation to view linked financial data has been accepted.`,
        'external_person_connection',
        connectionId
      );
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Reject an invitation
   */
  static async rejectInvitation(
    connectionId: number,
    userId: number
  ): Promise<void> {
    try {
      // Verify connection belongs to user and is pending
      const connectionResult = await query(
        `SELECT * FROM external_person_user_connections 
         WHERE id = $1 AND invited_user_id = $2 AND status = 'pending'`,
        [connectionId, userId]
      );

      if (connectionResult.rows.length === 0) {
        throw new Error('Invitation not found or already processed');
      }

      const connection = connectionResult.rows[0];

      // Update connection to rejected
      await query(
        `UPDATE external_person_user_connections 
         SET status = 'rejected', responded_at = NOW() 
         WHERE id = $1`,
        [connectionId]
      );
    } catch (error) {
      console.error('Error rejecting invitation:', error);
      throw error;
    }
  }

  /**
   * Revoke an invitation (inviter only)
   */
  static async revokeInvitation(
    connectionId: number,
    userId: number,
    allowInvitee: boolean = false
  ): Promise<void> {
    try {
      // Verify connection belongs to user
      // If allowInvitee is true, either party can revoke (for disconnect)
      // If false, only inviter can revoke
      let connectionResult;
      if (allowInvitee) {
        connectionResult = await query(
          `SELECT * FROM external_person_user_connections 
           WHERE id = $1 
           AND (invited_by_user_id = $2 OR invited_user_id = $2)
           AND status IN ('pending', 'accepted')`,
          [connectionId, userId]
        );
      } else {
        connectionResult = await query(
          `SELECT * FROM external_person_user_connections 
           WHERE id = $1 AND invited_by_user_id = $2 
           AND status IN ('pending', 'accepted')`,
          [connectionId, userId]
        );
      }

      if (connectionResult.rows.length === 0) {
        throw new Error('Invitation not found or cannot be revoked');
      }

      const connection = connectionResult.rows[0];

      // Update connection to revoked
      await query(
        `UPDATE external_person_user_connections 
         SET status = 'revoked', responded_at = NOW() 
         WHERE id = $1`,
        [connectionId]
      );

      // Create notification for invitee (if accepted)
      if (connection.status === 'accepted') {
        await UserNotificationService.createNotification(
          connection.invited_user_id,
          'invitation_revoked',
          'Your invitation was revoked',
          `Your access to view linked financial data has been revoked.`,
          'external_person_connection',
          connectionId
        );
      }
    } catch (error) {
      console.error('Error revoking invitation:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for a user
   */
  static async getPendingInvitations(
    userId: number
  ): Promise<ExternalPersonConnection[]> {
    try {
      const result = await query(
        `SELECT c.*, 
                ep.name as external_person_name, 
                ep.email as external_person_email,
                u1.email as invited_user_email,
                u2.email as invited_by_user_email
         FROM external_person_user_connections c
         LEFT JOIN external_persons ep ON c.external_person_id = ep.id
         LEFT JOIN users u1 ON c.invited_user_id = u1.id
         LEFT JOIN users u2 ON c.invited_by_user_id = u2.id
         WHERE c.invited_user_id = $1 AND c.status = 'pending'
         ORDER BY c.invited_at DESC`,
        [userId]
      );

      return result.rows.map((row) => this.enrichConnection(row));
    } catch (error) {
      console.error('Error getting pending invitations:', error);
      return [];
    }
  }

  /**
   * Get accepted connections for a user
   */
  static async getAcceptedConnections(
    userId: number
  ): Promise<ExternalPersonConnection[]> {
    try {
      const result = await query(
        `SELECT c.*, 
                ep.name as external_person_name, 
                ep.email as external_person_email,
                u1.email as invited_user_email,
                u2.email as invited_by_user_email
         FROM external_person_user_connections c
         LEFT JOIN external_persons ep ON c.external_person_id = ep.id
         LEFT JOIN users u1 ON c.invited_user_id = u1.id
         LEFT JOIN users u2 ON c.invited_by_user_id = u2.id
         WHERE (c.invited_user_id = $1 OR c.invited_by_user_id = $1) 
         AND c.status = 'accepted'
         ORDER BY c.responded_at DESC`,
        [userId]
      );

      return result.rows.map((row) => this.enrichConnection(row));
    } catch (error) {
      console.error('Error getting accepted connections:', error);
      return [];
    }
  }

  /**
   * Expire old invitations (called by cron job)
   */
  static async expireOldInvitations(): Promise<number> {
    try {
      const result = await query(
        `UPDATE external_person_user_connections 
         SET status = 'expired', responded_at = NOW()
         WHERE status = 'pending' AND expires_at <= NOW()
         RETURNING id, external_person_id, invited_user_id, invited_by_user_id`,
        []
      );

      const expiredCount = result.rows.length;

      // Create notifications for expired invitations
      for (const connection of result.rows) {
        // Notify invitee
        await UserNotificationService.createNotification(
          connection.invited_user_id,
          'invitation_expired',
          'Invitation expired',
          `Your invitation to view linked financial data has expired.`,
          'external_person_connection',
          connection.id
        );

        // Notify inviter
        await UserNotificationService.createNotification(
          connection.invited_by_user_id,
          'invitation_expired',
          'Invitation expired',
          `Your invitation to external person (ID: ${connection.external_person_id}) has expired.`,
          'external_person_connection',
          connection.id
        );
      }

      return expiredCount;
    } catch (error) {
      console.error('Error expiring invitations:', error);
      return 0;
    }
  }

  /**
   * Validate if an invitation is expired
   */
  static validateExpiry(expiresAt: Date): boolean {
    return new Date() < new Date(expiresAt);
  }

  /**
   * Enrich connection with additional data
   */
  private static enrichConnection(
    row: any
  ): ExternalPersonConnection {
    return {
      id: row.id,
      external_person_id: row.external_person_id,
      invited_user_id: row.invited_user_id,
      invited_by_user_id: row.invited_by_user_id,
      status: row.status,
      invited_at: row.invited_at,
      responded_at: row.responded_at,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      external_person_name: row.external_person_name,
      external_person_email: row.external_person_email,
      invited_user_email: row.invited_user_email,
      invited_by_user_email: row.invited_by_user_email,
    };
  }
}

