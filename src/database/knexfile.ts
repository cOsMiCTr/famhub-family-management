import type { Knex } from 'knex';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Determine paths - in production (compiled), __dirname points to dist/database
// In development, __dirname points to src/database
const baseDir = __dirname;
const migrationsDir = path.join(baseDir, 'migrations');
const seedsDir = path.join(baseDir, 'seeds');

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'postgresql',
    connection: process.env.DATABASE_URL || 'postgresql://localhost:5432/famhub_dev',
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 2000,
    },
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: seedsDir,
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  },

  staging: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    },
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 2000,
    },
    migrations: {
      directory: migrationsDir,
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
    seeds: {
      directory: seedsDir,
      extension: 'ts',
      loadExtensions: ['.ts', '.js'],
    },
  },

  production: {
    client: 'postgresql',
    connection: {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    },
    pool: {
      min: 2,
      max: 20,
      idleTimeoutMillis: 30000,
      acquireTimeoutMillis: 2000,
    },
    migrations: {
      directory: migrationsDir,
      extension: 'js', // Use .js in production since files are compiled
      loadExtensions: ['.js', '.ts'], // Prefer .js, fallback to .ts for ts-node
    },
    seeds: {
      directory: seedsDir,
      extension: 'js', // Use .js in production since files are compiled
      loadExtensions: ['.js', '.ts'], // Prefer .js, fallback to .ts for ts-node
    },
  },
};

export default config;
