import { config as dotenvConfig } from 'dotenv';

// Load environment variables
dotenvConfig();

export const config = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001', 10),
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  WEB_ORIGIN: process.env.WEB_ORIGIN || 'http://localhost:5173',
  
  // S3 Configuration
  S3_REGION: process.env.S3_REGION || 'eu-central-1',
  S3_BUCKET: process.env.S3_BUCKET || 'famhub-dev',
  S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID || '',
  S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY || '',
  
  // Email Configuration
  EMAIL_PROVIDER: process.env.EMAIL_PROVIDER || 'RESEND',
  RESEND_API_KEY: process.env.RESEND_API_KEY || '',
  SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '',
  
  // VAPID Configuration for Web Push
  VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || '',
  VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || '',
  VAPID_SUBJECT: process.env.VAPID_SUBJECT || 'mailto:admin@famhub.app',
  
  // ICS Calendar
  ICS_PUBLIC_TOKEN: process.env.ICS_PUBLIC_TOKEN || 'public-token',
  
  // Upload directory
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  
  // Rate limiting
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100', 10),
  RATE_LIMIT_WINDOW: process.env.RATE_LIMIT_WINDOW || '1 minute',
} as const;

// Validate required environment variables
const requiredEnvVars = [
  'DATABASE_URL',
  'JWT_SECRET',
] as const;

for (const envVar of requiredEnvVars) {
  if (!config[envVar as keyof typeof config]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
}
