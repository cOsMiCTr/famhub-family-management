import cron from 'node-cron';
import { InvitationService } from '../services/invitationService';

/**
 * Expire old invitations that have passed their expiry date
 * Runs daily at 2 AM
 */
export function startExpireInvitationsJob() {
  console.log('📅 Starting invitation expiry cron job (runs daily at 2 AM)...');

  cron.schedule('0 2 * * *', async () => {
    try {
      console.log('⏰ Running invitation expiry job...');
      const expiredCount = await InvitationService.expireOldInvitations();
      
      if (expiredCount > 0) {
        console.log(`✅ Expired ${expiredCount} invitation(s)`);
      } else {
        console.log('✅ No invitations to expire');
      }
    } catch (error) {
      console.error('❌ Error running invitation expiry job:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  // Also run on startup to catch any expired invitations
  (async () => {
    try {
      console.log('🔍 Checking for expired invitations on startup...');
      const expiredCount = await InvitationService.expireOldInvitations();
      
      if (expiredCount > 0) {
        console.log(`✅ Expired ${expiredCount} invitation(s) on startup`);
      } else {
        console.log('✅ No expired invitations found on startup');
      }
    } catch (error) {
      console.error('❌ Error checking expired invitations on startup:', error);
    }
  })();
}

