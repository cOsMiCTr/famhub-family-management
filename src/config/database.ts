import { Pool, PoolClient } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Database connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Database initialization
export async function initializeDatabase(): Promise<void> {
  try {
    // Test connection
    const client = await pool.connect();
    console.log('📊 Database connection established');
    client.release();

    // Run migrations
    await runMigrations();
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Database migrations
async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        household_id INTEGER,
        preferred_language VARCHAR(5) DEFAULT 'en' CHECK (preferred_language IN ('en', 'de', 'tr')),
        main_currency VARCHAR(3) DEFAULT 'USD' CHECK (main_currency IN ('TRY', 'GBP', 'USD', 'EUR')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create households table
    await client.query(`
      CREATE TABLE IF NOT EXISTS households (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by_admin_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create household_permissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS household_permissions (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        can_view_contracts BOOLEAN DEFAULT false,
        can_view_income BOOLEAN DEFAULT false,
        can_edit BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(household_id, user_id)
      )
    `);

    // Create asset_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id SERIAL PRIMARY KEY,
        name_de VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_tr VARCHAR(255) NOT NULL,
        type VARCHAR(20) DEFAULT 'income' CHECK (type IN ('income', 'expense')),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(3) NOT NULL CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        category_id INTEGER REFERENCES asset_categories(id),
        description TEXT,
        date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contract_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contract_categories (
        id SERIAL PRIMARY KEY,
        name_de VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_tr VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create contracts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS contracts (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        category_id INTEGER REFERENCES contract_categories(id),
        parties TEXT NOT NULL,
        start_date DATE,
        end_date DATE,
        renewal_date DATE,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled', 'pending')),
        created_by INTEGER REFERENCES users(id),
        visibility VARCHAR(20) DEFAULT 'household' CHECK (visibility IN ('household', 'specific_users')),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create exchange_rates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS exchange_rates (
        id SERIAL PRIMARY KEY,
        from_currency VARCHAR(3) NOT NULL,
        to_currency VARCHAR(3) NOT NULL,
        rate DECIMAL(15,8) NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_currency, to_currency)
      )
    `);

    // Create invitation_tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS invitation_tokens (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        token VARCHAR(255) UNIQUE NOT NULL,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        expires_at TIMESTAMP NOT NULL,
        used BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add foreign key constraint for users.household_id
    await client.query(`
      ALTER TABLE users 
      ADD CONSTRAINT fk_users_household 
      FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
    `);

    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_user_date ON assets(user_id, date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_household ON assets(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contracts_household ON contracts(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email)`);

    await client.query('COMMIT');
    console.log('✅ Database migrations completed successfully');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Database migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Helper function to get a database client
export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

// Helper function to execute a query
export async function query(text: string, params?: any[]): Promise<any> {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down database connection...');
  await pool.end();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('🛑 Shutting down database connection...');
  await pool.end();
  process.exit(0);
});
