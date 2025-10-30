import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if there are already notifications
  const existingNotifications = await knex('admin_notifications').count('* as count').first();
  
  if (parseInt(existingNotifications?.count as string) === 0) {
    console.log('Adding sample admin notifications...');
    
    // Insert sample notifications
    await knex('admin_notifications').insert([
      {
        type: 'security_alert',
        user_id: null,
        title: 'Suspicious Login Attempt',
        message: 'Multiple failed login attempts detected from IP 192.168.1.100',
        severity: 'warning',
        read: false
      },
      {
        type: 'user_created',
        user_id: 1,
        title: 'New User Created',
        message: 'New user account created for test@example.com',
        severity: 'info',
        read: false
      },
      {
        type: 'system_alert',
        user_id: null,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight at 2 AM',
        severity: 'info',
        read: true
      },
      {
        type: 'security_alert',
        user_id: null,
        title: 'Critical Security Issue',
        message: 'Unauthorized access attempt detected',
        severity: 'critical',
        read: false
      },
      {
        type: 'system_alert',
        user_id: null,
        title: 'Database Backup Complete',
        message: 'Daily database backup completed successfully',
        severity: 'info',
        read: true
      }
    ]);
    
    console.log('✅ Sample notifications added successfully');
  } else {
    console.log('⚠️  Notifications already exist. Skipping sample data creation.');
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remove sample notifications (only if they match our sample data)
  await knex('admin_notifications')
    .whereIn('title', [
      'Suspicious Login Attempt',
      'New User Created',
      'System Maintenance',
      'Critical Security Issue',
      'Database Backup Complete'
    ])
    .del();
}

