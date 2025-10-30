import { query } from '../config/database';
import { cleanIPAddress } from '../utils/ipUtils';

export interface SecurityMetrics {
  // Login Security
  totalLogins24h: number;
  failedLogins24h: number;
  uniqueIpAddresses24h: number;
  suspiciousLoginPatterns: number;
  
  // Account Security
  lockedAccounts: number;
  accountsPendingPasswordChange: number;
  accountsWith2FA: number;
  accountsWithout2FA: number;
  
  // Activity Security
  totalActivities24h: number;
  criticalActivities24h: number;
  unusualActivityPatterns: number;
  
  // Token Security
  tokenTransactions24h: number;
  suspiciousTokenActivity: number;
  voucherAbuseAttempts: number;
  
  // System Security
  systemHealthScore: number;
  securityAlerts: number;
  dataIntegrityIssues: number;
}

export interface SecurityEvent {
  id: number;
  event_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  user_id?: number;
  user_email?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
}

export interface SecurityFilter {
  dateRange?: {
    start: string;
    end: string;
  };
  severity?: string[];
  eventTypes?: string[];
  userIds?: number[];
  ipAddresses?: string[];
  searchTerm?: string;
}

export interface SecurityAnalytics {
  loginTrends: Array<{
    date: string;
    successful: number;
    failed: number;
    unique_ips: number;
  }>;
  activityTrends: Array<{
    date: string;
    total_activities: number;
    critical_activities: number;
  }>;
  topIpAddresses: Array<{
    ip_address: string;
    count: number;
    last_seen: string;
    risk_level: 'low' | 'medium' | 'high';
  }>;
  topUsers: Array<{
    user_id: number;
    email: string;
    activity_count: number;
    last_activity: string;
    risk_score: number;
  }>;
  securityThreats: Array<{
    threat_type: string;
    count: number;
    severity: string;
    last_detected: string;
  }>;
}

export class EnhancedSecurityService {
  /**
   * Get comprehensive security metrics
   */
  static async getSecurityMetrics(): Promise<SecurityMetrics> {
    try {
      const [
        loginStats,
        accountStats,
        activityStats,
        tokenStats,
        systemStats
      ] = await Promise.all([
        this.getLoginSecurityMetrics(),
        this.getAccountSecurityMetrics(),
        this.getActivitySecurityMetrics(),
        this.getTokenSecurityMetrics(),
        this.getSystemSecurityMetrics()
      ]);

      return {
        // Login Security
        totalLogins24h: loginStats.totalLogins24h || 0,
        failedLogins24h: loginStats.failedLogins24h || 0,
        uniqueIpAddresses24h: loginStats.uniqueIpAddresses24h || 0,
        suspiciousLoginPatterns: loginStats.suspiciousLoginPatterns || 0,
        
        // Account Security
        lockedAccounts: accountStats.lockedAccounts || 0,
        accountsPendingPasswordChange: accountStats.accountsPendingPasswordChange || 0,
        accountsWith2FA: accountStats.accountsWith2FA || 0,
        accountsWithout2FA: accountStats.accountsWithout2FA || 0,
        
        // Activity Security
        totalActivities24h: activityStats.totalActivities24h || 0,
        criticalActivities24h: activityStats.criticalActivities24h || 0,
        unusualActivityPatterns: activityStats.unusualActivityPatterns || 0,
        
        // Token Security
        tokenTransactions24h: tokenStats.tokenTransactions24h || 0,
        suspiciousTokenActivity: tokenStats.suspiciousTokenActivity || 0,
        voucherAbuseAttempts: tokenStats.voucherAbuseAttempts || 0,
        
        // System Security
        systemHealthScore: systemStats.systemHealthScore || 0,
        securityAlerts: systemStats.securityAlerts || 0,
        dataIntegrityIssues: systemStats.dataIntegrityIssues || 0
      };
    } catch (error) {
      console.error('Error getting security metrics:', error);
      throw error;
    }
  }

  /**
   * Get login security metrics
   */
  private static async getLoginSecurityMetrics(): Promise<Partial<SecurityMetrics>> {
    const [
      totalLogins,
      failedLogins,
      uniqueIps,
      suspiciousPatterns
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM login_attempts 
             WHERE success = true AND created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as count FROM login_attempts 
             WHERE success = false AND created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(DISTINCT ip_address) as count FROM login_attempts 
             WHERE created_at > NOW() - INTERVAL '24 hours' AND ip_address IS NOT NULL`),
      query(`SELECT COUNT(*) as count FROM (
               SELECT ip_address, COUNT(*) as attempts
               FROM login_attempts 
               WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
               GROUP BY ip_address 
               HAVING COUNT(*) > 10
             ) as suspicious`)
    ]);

    return {
      totalLogins24h: parseInt(totalLogins.rows[0]?.count || '0'),
      failedLogins24h: parseInt(failedLogins.rows[0]?.count || '0'),
      uniqueIpAddresses24h: parseInt(uniqueIps.rows[0]?.count || '0'),
      suspiciousLoginPatterns: parseInt(suspiciousPatterns.rows[0]?.count || '0')
    };
  }

  /**
   * Get account security metrics
   */
  private static async getAccountSecurityMetrics(): Promise<Partial<SecurityMetrics>> {
    const [
      lockedAccounts,
      pendingPasswordChange,
      accountsWith2FA,
      accountsWithout2FA
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM users 
             WHERE account_status = 'locked' OR 
             (account_locked_until IS NOT NULL AND account_locked_until > NOW())`),
      query(`SELECT COUNT(*) as count FROM users 
             WHERE account_status = 'pending_password_change'`),
      query(`SELECT COUNT(*) as count FROM users 
             WHERE two_factor_enabled = true`),
      query(`SELECT COUNT(*) as count FROM users 
             WHERE two_factor_enabled = false OR two_factor_enabled IS NULL`)
    ]);

    return {
      lockedAccounts: parseInt(lockedAccounts.rows[0]?.count || '0'),
      accountsPendingPasswordChange: parseInt(pendingPasswordChange.rows[0]?.count || '0'),
      accountsWith2FA: parseInt(accountsWith2FA.rows[0]?.count || '0'),
      accountsWithout2FA: parseInt(accountsWithout2FA.rows[0]?.count || '0')
    };
  }

  /**
   * Get activity security metrics
   */
  private static async getActivitySecurityMetrics(): Promise<Partial<SecurityMetrics>> {
    const [
      totalActivities,
      criticalActivities,
      unusualPatterns
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM user_activity 
             WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as count FROM user_activity 
             WHERE action_type IN ('password_change', 'account_deletion', 'admin_action', 'sensitive_data_access')
             AND created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as count FROM (
               SELECT user_id, COUNT(*) as activities
               FROM user_activity 
               WHERE created_at > NOW() - INTERVAL '1 hour'
               GROUP BY user_id 
               HAVING COUNT(*) > 50
             ) as unusual`)
    ]);

    return {
      totalActivities24h: parseInt(totalActivities.rows[0]?.count || '0'),
      criticalActivities24h: parseInt(criticalActivities.rows[0]?.count || '0'),
      unusualActivityPatterns: parseInt(unusualPatterns.rows[0]?.count || '0')
    };
  }

  /**
   * Get token security metrics
   */
  private static async getTokenSecurityMetrics(): Promise<Partial<SecurityMetrics>> {
    const [
      tokenTransactions,
      suspiciousTokenActivity,
      voucherAbuse
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM token_transactions 
             WHERE created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as count FROM token_transactions 
             WHERE amount > 100 AND created_at > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) as count FROM voucher_usages vu
             JOIN voucher_codes vc ON vu.voucher_id = vc.id
             WHERE vu.created_at > NOW() - INTERVAL '24 hours'
             AND vc.usage_count > vc.max_uses * 0.8`)
    ]);

    return {
      tokenTransactions24h: parseInt(tokenTransactions.rows[0]?.count || '0'),
      suspiciousTokenActivity: parseInt(suspiciousTokenActivity.rows[0]?.count || '0'),
      voucherAbuseAttempts: parseInt(voucherAbuse.rows[0]?.count || '0')
    };
  }

  /**
   * Get system security metrics
   */
  private static async getSystemSecurityMetrics(): Promise<Partial<SecurityMetrics>> {
    const [
      securityAlerts,
      dataIntegrity
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM admin_notifications 
             WHERE read = false AND type IN ('warning', 'error')`),
      query(`SELECT COUNT(*) as count FROM (
               SELECT 'orphaned_assets' as issue FROM assets a
               LEFT JOIN households h ON a.household_id = h.id
               WHERE a.household_id IS NOT NULL AND h.id IS NULL
               UNION ALL
               SELECT 'orphaned_activities' as issue FROM user_activity ua
               LEFT JOIN users u ON ua.user_id = u.id
               WHERE u.id IS NULL
             ) as integrity_issues`)
    ]);

    // Calculate system health score (0-100)
    const alertsCount = parseInt(securityAlerts.rows[0]?.count || '0');
    const integrityCount = parseInt(dataIntegrity.rows[0]?.count || '0');
    const systemHealthScore = Math.max(0, 100 - (alertsCount * 5) - (integrityCount * 10));

    return {
      systemHealthScore,
      securityAlerts: alertsCount,
      dataIntegrityIssues: integrityCount
    };
  }

  /**
   * Get security events with filtering
   */
  static async getSecurityEvents(
    page: number = 1,
    limit: number = 50,
    filters: SecurityFilter = {}
  ): Promise<{ events: SecurityEvent[]; total: number }> {
    try {
      const offset = (page - 1) * limit;
      let whereConditions = [];
      let queryParams: any[] = [];
      let paramIndex = 1;

      // Date range filter
      if (filters.dateRange) {
        whereConditions.push(`created_at >= $${paramIndex} AND created_at <= $${paramIndex + 1}`);
        queryParams.push(filters.dateRange.start, filters.dateRange.end);
        paramIndex += 2;
      }

      // Severity filter
      if (filters.severity && filters.severity.length > 0) {
        const severityPlaceholders = filters.severity.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`severity IN (${severityPlaceholders})`);
        queryParams.push(...filters.severity);
      }

      // Event types filter
      if (filters.eventTypes && filters.eventTypes.length > 0) {
        const eventTypePlaceholders = filters.eventTypes.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`event_type IN (${eventTypePlaceholders})`);
        queryParams.push(...filters.eventTypes);
      }

      // User IDs filter
      if (filters.userIds && filters.userIds.length > 0) {
        const userIdPlaceholders = filters.userIds.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`user_id IN (${userIdPlaceholders})`);
        queryParams.push(...filters.userIds);
      }

      // IP addresses filter
      if (filters.ipAddresses && filters.ipAddresses.length > 0) {
        const ipPlaceholders = filters.ipAddresses.map(() => `$${paramIndex++}`).join(',');
        whereConditions.push(`ip_address IN (${ipPlaceholders})`);
        queryParams.push(...filters.ipAddresses);
      }

      // Search term filter
      if (filters.searchTerm) {
        whereConditions.push(`(description ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex})`);
        queryParams.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM (
          SELECT 'login_attempt' as event_type, 
                 CASE WHEN success = false THEN 'high' ELSE 'low' END as severity,
                 user_id, email as user_email, 
                 CONCAT('Login attempt: ', COALESCE(failure_reason, success::text)) as description,
                 ip_address, user_agent, created_at
          FROM login_attempts
          UNION ALL
          SELECT 'user_activity' as event_type,
                 CASE 
                   WHEN action_type IN ('password_change', 'account_deletion', 'admin_action') THEN 'high'
                   WHEN action_type IN ('sensitive_data_access', 'module_activation') THEN 'medium'
                   ELSE 'low'
                 END as severity,
                 user_id, NULL as user_email, description, ip_address, user_agent, created_at
          FROM user_activity
          UNION ALL
          SELECT 'token_transaction' as event_type,
                 CASE WHEN amount > 50 THEN 'medium' ELSE 'low' END as severity,
                 user_id, NULL as user_email, description, NULL as ip_address, NULL as user_agent, created_at
          FROM token_transactions
        ) as security_events
        ${whereClause}
      `;

      const countResult = await query(countQuery, queryParams);
      const total = parseInt(countResult.rows[0]?.total || '0');

      // Get events with pagination
      const eventsQuery = `
        SELECT *, 
               ROW_NUMBER() OVER (ORDER BY created_at DESC) as rn
        FROM (
          SELECT 'login_attempt' as event_type, 
                 CASE WHEN success = false THEN 'high' ELSE 'low' END as severity,
                 user_id, email as user_email, 
                 CONCAT('Login attempt: ', COALESCE(failure_reason, success::text)) as description,
                 ip_address, user_agent, created_at,
                 jsonb_build_object('success', success, 'failure_reason', failure_reason) as metadata
          FROM login_attempts
          UNION ALL
          SELECT 'user_activity' as event_type,
                 CASE 
                   WHEN action_type IN ('password_change', 'account_deletion', 'admin_action') THEN 'high'
                   WHEN action_type IN ('sensitive_data_access', 'module_activation') THEN 'medium'
                   ELSE 'low'
                 END as severity,
                 user_id, NULL as user_email, description, ip_address, user_agent, created_at,
                 jsonb_build_object('action_type', action_type) as metadata
          FROM user_activity
          UNION ALL
          SELECT 'token_transaction' as event_type,
                 CASE WHEN amount > 50 THEN 'medium' ELSE 'low' END as severity,
                 user_id, NULL as user_email, description, NULL as ip_address, NULL as user_agent, created_at,
                 jsonb_build_object('transaction_type', transaction_type, 'amount', amount) as metadata
          FROM token_transactions
        ) as security_events
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      queryParams.push(limit, offset);
      const eventsResult = await query(eventsQuery, queryParams);

      const events: SecurityEvent[] = eventsResult.rows.map((row: any) => ({
        id: row.rn,
        event_type: row.event_type,
        severity: row.severity,
        user_id: row.user_id,
        user_email: row.user_email,
        description: row.description,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        metadata: row.metadata,
        created_at: row.created_at
      }));

      return { events, total };
    } catch (error) {
      console.error('Error getting security events:', error);
      throw error;
    }
  }

  /**
   * Get security analytics and trends
   */
  static async getSecurityAnalytics(days: number = 30): Promise<SecurityAnalytics> {
    try {
      const [
        loginTrends,
        activityTrends,
        topIpAddresses,
        topUsers,
        securityThreats
      ] = await Promise.all([
        this.getLoginTrends(days),
        this.getActivityTrends(days),
        this.getTopIpAddresses(days),
        this.getTopUsers(days),
        this.getSecurityThreats(days)
      ]);

      return {
        loginTrends,
        activityTrends,
        topIpAddresses,
        topUsers,
        securityThreats
      };
    } catch (error) {
      console.error('Error getting security analytics:', error);
      throw error;
    }
  }

  private static async getLoginTrends(days: number): Promise<any[]> {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(CASE WHEN success = true THEN 1 END) as successful,
        COUNT(CASE WHEN success = false THEN 1 END) as failed,
        COUNT(DISTINCT ip_address) as unique_ips
      FROM login_attempts
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    return result.rows;
  }

  private static async getActivityTrends(days: number): Promise<any[]> {
    const result = await query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_activities,
        COUNT(CASE WHEN action_type IN ('password_change', 'account_deletion', 'admin_action', 'sensitive_data_access') THEN 1 END) as critical_activities
      FROM user_activity
      WHERE created_at > NOW() - INTERVAL '${days} days'
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `);
    return result.rows;
  }

  private static async getTopIpAddresses(days: number): Promise<any[]> {
    const result = await query(`
      SELECT 
        ip_address,
        COUNT(*) as count,
        MAX(created_at) as last_seen,
        CASE 
          WHEN COUNT(*) > 100 THEN 'high'
          WHEN COUNT(*) > 20 THEN 'medium'
          ELSE 'low'
        END as risk_level
      FROM login_attempts
      WHERE created_at > NOW() - INTERVAL '${days} days'
        AND ip_address IS NOT NULL
        AND ip_address != 'unknown'
      GROUP BY ip_address
      ORDER BY count DESC
      LIMIT 20
    `);
    
    // Clean IP addresses to remove IPv4-mapped IPv6 prefixes
    return result.rows.map(row => ({
      ...row,
      ip_address: cleanIPAddress(row.ip_address)
    }));
  }

  private static async getTopUsers(days: number): Promise<any[]> {
    const result = await query(`
      SELECT 
        u.id as user_id,
        u.email,
        COUNT(ua.id) as activity_count,
        MAX(ua.created_at) as last_activity,
        CASE 
          WHEN COUNT(ua.id) > 200 THEN 90
          WHEN COUNT(ua.id) > 100 THEN 70
          WHEN COUNT(ua.id) > 50 THEN 50
          ELSE 20
        END as risk_score
      FROM users u
      LEFT JOIN user_activity ua ON u.id = ua.user_id
      WHERE ua.created_at > NOW() - INTERVAL '${days} days' OR ua.created_at IS NULL
      GROUP BY u.id, u.email
      ORDER BY activity_count DESC
      LIMIT 20
    `);
    return result.rows;
  }

  private static async getSecurityThreats(days: number): Promise<any[]> {
    const result = await query(`
      SELECT 
        'failed_login_attempts' as threat_type,
        COUNT(*) as count,
        'high' as severity,
        MAX(created_at) as last_detected
      FROM login_attempts
      WHERE success = false AND created_at > NOW() - INTERVAL '${days} days'
      GROUP BY threat_type
      UNION ALL
      SELECT 
        'suspicious_ip_activity' as threat_type,
        COUNT(*) as count,
        'medium' as severity,
        MAX(created_at) as last_detected
      FROM (
        SELECT ip_address, COUNT(*) as attempts
        FROM login_attempts
        WHERE success = false AND created_at > NOW() - INTERVAL '${days} days'
        GROUP BY ip_address
        HAVING COUNT(*) > 10
      ) as suspicious_ips
      UNION ALL
      SELECT 
        'unusual_user_activity' as threat_type,
        COUNT(*) as count,
        'medium' as severity,
        MAX(created_at) as last_detected
      FROM (
        SELECT user_id, COUNT(*) as activities
        FROM user_activity
        WHERE created_at > NOW() - INTERVAL '${days} days'
        GROUP BY user_id
        HAVING COUNT(*) > 100
      ) as unusual_users
      ORDER BY count DESC
    `);
    return result.rows;
  }

  /**
   * Get real-time security alerts
   */
  static async getRealTimeAlerts(): Promise<SecurityEvent[]> {
    try {
      const result = await query(`
        SELECT 
          'critical_login_attempts' as event_type,
          'critical' as severity,
          user_id,
          email as user_email,
          CONCAT('Multiple failed login attempts from IP: ', ip_address) as description,
          ip_address,
          user_agent,
          created_at,
          jsonb_build_object('attempts', attempt_count) as metadata
        FROM (
          SELECT user_id, email, ip_address, user_agent, created_at, COUNT(*) as attempt_count
          FROM login_attempts
          WHERE success = false AND created_at > NOW() - INTERVAL '1 hour'
          GROUP BY user_id, email, ip_address, user_agent, created_at
          HAVING COUNT(*) > 5
        ) as critical_attempts
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      return result.rows.map((row: any) => ({
        id: Math.random(),
        event_type: row.event_type,
        severity: row.severity,
        user_id: row.user_id,
        user_email: row.user_email,
        description: row.description,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        metadata: row.metadata,
        created_at: row.created_at
      }));
    } catch (error) {
      console.error('Error getting real-time alerts:', error);
      return [];
    }
  }
}
