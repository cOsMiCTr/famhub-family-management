require('dotenv').config();
const { query } = require('./config/database');

async function createTestNotifications() {
  try {
    console.log('Creating test admin notifications...');
    
    // Create some test notifications
    const notifications = [
      {
        type: 'security_alert',
        user_id: null,
        title: 'Suspicious Login Attempt',
        message: 'Multiple failed login attempts detected from IP 192.168.1.100',
        severity: 'warning'
      },
      {
        type: 'user_created',
        user_id: 1,
        title: 'New User Created',
        message: 'New user account created for test@example.com',
        severity: 'info'
      },
      {
        type: 'system_alert',
        user_id: null,
        title: 'System Maintenance',
        message: 'Scheduled maintenance will occur tonight at 2 AM',
        severity: 'info'
      },
      {
        type: 'security_alert',
        user_id: null,
        title: 'Critical Security Issue',
        message: 'Unauthorized access attempt detected',
        severity: 'critical'
      }
    ];

    for (const notification of notifications) {
      await query(
        `INSERT INTO admin_notifications (type, user_id, title, message, severity)
         VALUES ($1, $2, $3, $4, $5)`,
        [notification.type, notification.user_id, notification.title, notification.message, notification.severity]
      );
    }

    console.log('✅ Test notifications created successfully');
    
    // Check if notifications were created
    const result = await query('SELECT COUNT(*) as count FROM admin_notifications');
    console.log(`Total notifications in database: ${result.rows[0].count}`);
    
  } catch (error) {
    console.error('Error creating test notifications:', error);
  }
}

createTestNotifications().then(() => {
  console.log('Done');
  process.exit(0);
});
