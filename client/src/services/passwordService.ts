export class PasswordService {
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
}
