import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { query } from '../config/database';

export class PasswordService {
  private static readonly SALT_ROUNDS = 12;
  private static readonly PASSWORD_HISTORY_LIMIT = 5;

  /**
   * Generate a secure random password
   */
  static generateSecurePassword(): string {
    const length = 12;
    const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    
    // Ensure at least one character from each required category
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    
    password += uppercase[crypto.randomInt(0, uppercase.length)];
    password += lowercase[crypto.randomInt(0, lowercase.length)];
    password += numbers[crypto.randomInt(0, numbers.length)];
    password += special[crypto.randomInt(0, special.length)];
    
    // Fill the rest with random characters
    for (let i = 4; i < length; i++) {
      password += charset[crypto.randomInt(0, charset.length)];
    }
    
    // Shuffle the password
    return password.split('').sort(() => crypto.randomInt(0, 2) - 1).join('');
  }

  /**
   * Validate password complexity requirements
   */
  static validatePasswordComplexity(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (!/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Hash a password using bcrypt
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, this.SALT_ROUNDS);
  }

  /**
   * Compare a password with its hash
   */
  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(password, hash);
  }

  /**
   * Check if password has been used recently (last 5 passwords)
   */
  static async checkPasswordHistory(userId: number, newPassword: string): Promise<boolean> {
    try {
      const result = await query(
        'SELECT password_history FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        return false;
      }

      const passwordHistory = result.rows[0].password_history || [];
      
      // Check against the last 5 passwords
      const recentPasswords = passwordHistory.slice(-this.PASSWORD_HISTORY_LIMIT);
      
      for (const oldHash of recentPasswords) {
        const isMatch = await bcrypt.compare(newPassword, oldHash);
        if (isMatch) {
          return true; // Password was used recently
        }
      }
      
      return false; // Password is new
    } catch (error) {
      console.error('Error checking password history:', error);
      return false;
    }
  }

  /**
   * Add password hash to user's password history
   */
  static async addToPasswordHistory(userId: number, passwordHash: string): Promise<void> {
    try {
      const result = await query(
        'SELECT password_history FROM users WHERE id = $1',
        [userId]
      );

      if (result.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentHistory = result.rows[0].password_history || [];
      
      // Add new hash and keep only the last 5
      const updatedHistory = [...currentHistory, passwordHash].slice(-this.PASSWORD_HISTORY_LIMIT);
      
      await query(
        'UPDATE users SET password_history = $1 WHERE id = $2',
        [updatedHistory, userId]
      );
    } catch (error) {
      console.error('Error adding to password history:', error);
      throw error;
    }
  }

  /**
   * Calculate password strength score (0-100)
   */
  static calculatePasswordStrength(password: string): number {
    let score = 0;
    
    // Length score (0-25 points)
    if (password.length >= 8) score += 10;
    if (password.length >= 12) score += 10;
    if (password.length >= 16) score += 5;
    
    // Character variety score (0-50 points)
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[^a-zA-Z0-9]/.test(password)) score += 20;
    
    // Pattern penalty (0-25 points deducted)
    if (/(.)\1{2,}/.test(password)) score -= 10; // Repeated characters
    if (/123|abc|qwe/i.test(password)) score -= 10; // Common sequences
    if (/password|admin|user/i.test(password)) score -= 15; // Common words
    
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Get password strength label
   */
  static getPasswordStrengthLabel(score: number): string {
    if (score < 25) return 'Very Weak';
    if (score < 50) return 'Weak';
    if (score < 75) return 'Medium';
    if (score < 90) return 'Strong';
    return 'Very Strong';
  }
}
