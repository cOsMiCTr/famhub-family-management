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
    
    // Seed translations if table is empty or corrupted
    const seedClient = await pool.connect();
    try {
      const translationCount = await seedClient.query('SELECT COUNT(*) as count FROM translations');
      const corruptedCount = await seedClient.query('SELECT COUNT(*) as count FROM translations WHERE en = \'\' OR en IS NULL');
      
      if (parseInt(translationCount.rows[0].count) === 0 || parseInt(corruptedCount.rows[0].count) > 0 || true) {
        console.log('🌱 Seeding translations from JSON files...');
        const { default: seedTranslations } = await import('../migrations/seedTranslations');
        await seedTranslations();
        console.log('✅ Translations seeded successfully');
      } else {
        console.log('✅ Translations are intact');
      }
    } finally {
      seedClient.release();
    }

    // Seed income categories if table is empty
    const categoryClient = await pool.connect();
    try {
      const categoryCount = await categoryClient.query('SELECT COUNT(*) as count FROM income_categories');
      
      if (parseInt(categoryCount.rows[0].count) === 0) {
        console.log('🌱 Seeding income categories...');
        const { default: seedIncomeCategories } = await import('../migrations/seedIncomeCategories');
        await seedIncomeCategories();
        console.log('✅ Income categories seeded successfully');
      } else {
        console.log('✅ Income categories are intact');
      }
    } finally {
      categoryClient.release();
    }
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

// Database migrations
async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  
  try {
    // Don't use transactions for DDL operations as they can cause issues
    // Each operation will be atomic by default

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('admin', 'user')),
        household_id INTEGER,
        preferred_language VARCHAR(5) DEFAULT 'en' CHECK (preferred_language IN ('en', 'de', 'tr')),
        main_currency VARCHAR(4) DEFAULT 'USD' CHECK (main_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        must_change_password BOOLEAN DEFAULT false,
        password_changed_at TIMESTAMP,
        account_status VARCHAR(50) DEFAULT 'active' CHECK (account_status IN ('active', 'locked', 'pending_password_change')),
        failed_login_attempts INTEGER DEFAULT 0,
        last_failed_login_at TIMESTAMP,
        account_locked_until TIMESTAMP,
        last_login_at TIMESTAMP,
        last_activity_at TIMESTAMP,
        password_history TEXT[] DEFAULT ARRAY[]::TEXT[],
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
        currency VARCHAR(4) NOT NULL CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
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
        from_currency VARCHAR(4) NOT NULL,
        to_currency VARCHAR(4) NOT NULL,
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

    // Create login_attempts table
    await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        success BOOLEAN NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        failure_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create admin_notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create translations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS translations (
        id SERIAL PRIMARY KEY,
        translation_key VARCHAR(255) UNIQUE NOT NULL,
        category VARCHAR(100),
        en TEXT NOT NULL,
        de TEXT,
        tr TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create household_members table
    await client.query(`
      CREATE TABLE IF NOT EXISTS household_members (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        relationship VARCHAR(100),
        date_of_birth DATE,
        notes TEXT,
        is_shared BOOLEAN DEFAULT false,
        created_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create income_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS income_categories (
        id SERIAL PRIMARY KEY,
        name_en VARCHAR(255) NOT NULL,
        name_de VARCHAR(255) NOT NULL,
        name_tr VARCHAR(255) NOT NULL,
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create income table
    await client.query(`
      CREATE TABLE IF NOT EXISTS income (
        id SERIAL PRIMARY KEY,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        household_member_id INTEGER REFERENCES household_members(id) ON DELETE SET NULL,
        category_id INTEGER REFERENCES income_categories(id),
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(4) NOT NULL CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        source_currency VARCHAR(4) CHECK (source_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        description TEXT,
        start_date DATE NOT NULL,
        end_date DATE,
        is_recurring BOOLEAN DEFAULT false,
        frequency VARCHAR(20) CHECK (frequency IN ('monthly', 'weekly', 'yearly', 'one-time')),
        created_by_user_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create income_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS income_history (
        id SERIAL PRIMARY KEY,
        income_id INTEGER REFERENCES income(id) ON DELETE CASCADE,
        changed_by_user_id INTEGER REFERENCES users(id),
        change_type VARCHAR(20) CHECK (change_type IN ('created', 'updated', 'deleted')),
        old_values JSONB,
        new_values JSONB,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add missing columns to users table if they don't exist
    const addColumnIfNotExists = async (columnName: string, columnDefinition: string) => {
      try {
        await client.query(`ALTER TABLE users ADD COLUMN ${columnName} ${columnDefinition}`);
        console.log(`✅ Added column: ${columnName}`);
      } catch (error: any) {
        if (error.code === '42701') { // 42701 = duplicate column
          console.log(`ℹ️ Column ${columnName} already exists`);
        } else {
          throw error;
        }
      }
    };

    await addColumnIfNotExists('must_change_password', 'BOOLEAN DEFAULT false');
    await addColumnIfNotExists('password_changed_at', 'TIMESTAMP');
    await addColumnIfNotExists('account_status', "VARCHAR(50) DEFAULT 'active' CHECK (account_status IN ('active', 'locked', 'pending_password_change'))");
    await addColumnIfNotExists('failed_login_attempts', 'INTEGER DEFAULT 0');
    await addColumnIfNotExists('last_failed_login_at', 'TIMESTAMP');
    await addColumnIfNotExists('account_locked_until', 'TIMESTAMP');
    await addColumnIfNotExists('last_login_at', 'TIMESTAMP');
    await addColumnIfNotExists('last_activity_at', 'TIMESTAMP');
    await addColumnIfNotExists('password_history', 'TEXT[] DEFAULT ARRAY[]::TEXT[]');

    // Add household_member_id column to assets table
    const addColumnToTable = async (tableName: string, columnName: string, columnDefinition: string) => {
      try {
        await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
        console.log(`✅ Added column ${columnName} to ${tableName}`);
      } catch (error: any) {
        if (error.code === '42701') {
          console.log(`ℹ️ Column ${columnName} in ${tableName} already exists`);
        } else {
          throw error;
        }
      }
    };

    await addColumnToTable('assets', 'household_member_id', 'INTEGER REFERENCES household_members(id) ON DELETE SET NULL');
    await addColumnToTable('contracts', 'assigned_member_ids', 'INTEGER[] DEFAULT ARRAY[]::INTEGER[]');

    // Add foreign key constraint for users.household_id (if not exists)
    try {
      await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_household 
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
      `);
    } catch (error: any) {
      if (error.code !== '42710') { // 42710 = duplicate constraint
        throw error;
      }
      // Constraint already exists, continue
    }

    // Update foreign key constraints to include CASCADE for existing tables
    try {
      // Drop and recreate foreign key constraint for login_attempts
      await client.query(`
        ALTER TABLE login_attempts 
        DROP CONSTRAINT IF EXISTS login_attempts_user_id_fkey
      `);
      await client.query(`
        ALTER TABLE login_attempts 
        ADD CONSTRAINT login_attempts_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('✅ Updated login_attempts foreign key constraint');
    } catch (error: any) {
      console.log('ℹ️ login_attempts foreign key constraint already updated or table does not exist');
    }

    try {
      // Drop and recreate foreign key constraint for admin_notifications
      await client.query(`
        ALTER TABLE admin_notifications 
        DROP CONSTRAINT IF EXISTS admin_notifications_user_id_fkey
      `);
      await client.query(`
        ALTER TABLE admin_notifications 
        ADD CONSTRAINT admin_notifications_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      `);
      console.log('✅ Updated admin_notifications foreign key constraint');
    } catch (error: any) {
      console.log('ℹ️ admin_notifications foreign key constraint already updated or table does not exist');
    }

    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(account_locked_until)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_user_date ON assets(user_id, date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_household ON assets(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contracts_household ON contracts(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at)`);

    console.log('✅ Database migrations completed successfully');
  } catch (error) {
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
