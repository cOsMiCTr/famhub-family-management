import knex, { Knex } from 'knex';
import config from './knexfile';
import { pool } from '../config/database';

// Determine environment
const env = process.env.NODE_ENV || 'development';

// Create Knex instance
export const db: Knex = knex(config[env]);

// Export the pool for backward compatibility (still used in some files)
export { pool };

export default db;

