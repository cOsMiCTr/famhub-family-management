// Development configuration
export const devConfig = {
  NODE_ENV: 'development',
  PORT: 5000,
  DATABASE_URL: 'postgresql://localhost:5432/famhub_dev',
  JWT_SECRET: 'test-secret-key-for-development-only',
  JWT_EXPIRES_IN: '7d',
  CURRENCY_API_KEY: '',
  GOLD_API_KEY: '',
  CLIENT_URL: 'http://localhost:3000'
};

// Production configuration template
export const prodConfig = {
  NODE_ENV: 'production',
  PORT: process.env.PORT || 5000,
  DATABASE_URL: process.env.DATABASE_URL,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  CURRENCY_API_KEY: process.env.CURRENCY_API_KEY,
  GOLD_API_KEY: process.env.GOLD_API_KEY,
  CLIENT_URL: process.env.CLIENT_URL
};
