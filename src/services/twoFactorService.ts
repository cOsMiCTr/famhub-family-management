import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import crypto from 'crypto';
import { query } from '../config/database';

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  manualEntryKey: string;
}

export interface VerifyResult {
  valid: boolean;
  verified: boolean;
}

/**
 * Generate a TOTP secret for a user
 */
export async function generateTwoFactorSecret(email: string): Promise<TwoFactorSetup> {
  const secret = speakeasy.generateSecret({
    name: `FamHub (${email})`,
    length: 32
  });

  // Generate QR code
  const otpAuthUrl = secret.otpauth_url!;
  const qrCodeUrl = await QRCode.toDataURL(otpAuthUrl);

  return {
    secret: secret.base32!,
    qrCodeUrl,
    manualEntryKey: secret.base32!
  };
}

/**
 * Verify a TOTP token for a user
 */
export async function verifyTwoFactorToken(userId: number, token: string): Promise<VerifyResult> {
  // Get user's 2FA secret from database
  const userResult = await query(
    'SELECT two_factor_secret FROM users WHERE id = $1',
    [userId]
  );

  if (userResult.rows.length === 0 || !userResult.rows[0].two_factor_secret) {
    return { valid: false, verified: false };
  }

  const encryptedSecret = userResult.rows[0].two_factor_secret;
  
  // Decrypt the secret
  const secret = decryptSecret(encryptedSecret);

  // Verify the token
  const verified = speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 2 // Allow 2 time steps of tolerance (±60 seconds)
  });

  return {
    valid: verified !== null,
    verified: verified === true
  };
}

/**
 * Save 2FA secret for a user
 */
export async function saveTwoFactorSecret(userId: number, secret: string, backupCodes: string[]): Promise<void> {
  // Encrypt the secret before storing
  const encryptedSecret = encryptSecret(secret);
  
  await query(
    `UPDATE users 
     SET two_factor_secret = $1, 
         backup_codes = $2::jsonb
     WHERE id = $3`,
    [encryptedSecret, JSON.stringify(backupCodes), userId]
  );
}

/**
 * Enable 2FA for a user
 */
export async function enableTwoFactor(userId: number): Promise<void> {
  await query(
    'UPDATE users SET two_factor_enabled = true WHERE id = $1',
    [userId]
  );
}

/**
 * Disable 2FA for a user
 */
export async function disableTwoFactor(userId: number): Promise<void> {
  await query(
    `UPDATE users 
     SET two_factor_enabled = false,
         two_factor_secret = NULL,
         backup_codes = NULL
     WHERE id = $1`,
    [userId]
  );
}

/**
 * Generate backup codes for 2FA
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric codes
    const code = crypto.randomBytes(4).toString('hex').toUpperCase();
    codes.push(code);
  }
  return codes;
}

/**
 * Encrypt a 2FA secret (simple base64 encoding for now)
 * In production, use proper encryption with a master key
 */
function encryptSecret(secret: string): string {
  // Simple base64 encoding for demo
  // In production, use crypto.createCipher
  return Buffer.from(secret).toString('base64');
}

/**
 * Decrypt a 2FA secret
 */
function decryptSecret(encryptedSecret: string): string {
  return Buffer.from(encryptedSecret, 'base64').toString('utf-8');
}

