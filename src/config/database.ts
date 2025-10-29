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

    // Import Knex db instance (needed for seeds)
    const { db } = await import('../database/connection');
    
    // Run Knex migrations (only in development, production uses release phase)
    // Skip migration validation on app startup in production to avoid file mismatch issues
    if (process.env.NODE_ENV !== 'production') {
      console.log('🔄 Running database migrations...');
      await db.migrate.latest();
      console.log('✅ Database migrations completed');
    } else {
      console.log('✅ Skipping migrations (handled by release phase in production)');
    }
    
    // Seed translations if table is empty or corrupted
    const seedClient = await pool.connect();
    try {
      const translationCount = await seedClient.query('SELECT COUNT(*) as count FROM translations');
      const corruptedCount = await seedClient.query('SELECT COUNT(*) as count FROM translations WHERE en = \'\' OR en IS NULL');
      
      if (parseInt(translationCount.rows[0].count) === 0 || parseInt(corruptedCount.rows[0].count) > 0) {
        console.log('🌱 Seeding translations...');
        const { seed: seedTranslations } = await import('../database/seeds/02_translations');
        await seedTranslations(db);
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
        const { seed: seedIncomeCategories } = await import('../database/seeds/03_income_categories');
        await seedIncomeCategories(db);
        console.log('✅ Income categories seeded successfully');
      } else {
        console.log('✅ Income categories are intact');
      }
    } finally {
      categoryClient.release();
    }

    // Seed asset categories if table is empty or has wrong type
    const assetCategoryClient = await pool.connect();
    try {
      const assetCategoryCount = await assetCategoryClient.query('SELECT COUNT(*) as count FROM asset_categories');
      const wrongTypeCount = await assetCategoryClient.query('SELECT COUNT(*) as count FROM asset_categories WHERE type = \'income\'');
      
      if (parseInt(assetCategoryCount.rows[0].count) === 0 || parseInt(wrongTypeCount.rows[0].count) > 0) {
        console.log('🌱 Seeding asset categories...');
        const { seed: seedAssetCategories } = await import('../database/seeds/04_asset_categories');
        await seedAssetCategories(db);
        console.log('✅ Asset categories seeded successfully');
      } else {
        console.log('✅ Asset categories are intact');
      }
    } finally {
      assetCategoryClient.release();
    }

    // Seed currencies if table is empty
    const currencyClient = await pool.connect();
    try {
      const currencyCount = await currencyClient.query('SELECT COUNT(*) as count FROM currencies');
      
      if (parseInt(currencyCount.rows[0].count) === 0) {
        console.log('🌱 Seeding currencies...');
        const { seed: seedCurrencies } = await import('../database/seeds/01_currencies');
        await seedCurrencies(db);
        console.log('✅ Currencies seeded successfully');
      } else {
        console.log('✅ Currencies are intact');
      }
    } finally {
      currencyClient.release();
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

    // Create household_members table first (needed by assets table)
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

    // Create asset_categories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_categories (
        id SERIAL PRIMARY KEY,
        name_de VARCHAR(255) NOT NULL,
        name_en VARCHAR(255) NOT NULL,
        name_tr VARCHAR(255) NOT NULL,
        type VARCHAR(20) DEFAULT 'income' CHECK (type IN ('income', 'expense', 'asset')),
        category_type VARCHAR(50) DEFAULT 'other' CHECK (category_type IN ('real_estate', 'stocks', 'etf', 'bonds', 'crypto', 'gold', 'vehicles', 'collectibles', 'cash', 'other')),
        icon VARCHAR(50),
        requires_ticker BOOLEAN DEFAULT false,
        depreciation_enabled BOOLEAN DEFAULT false,
        is_default BOOLEAN DEFAULT false,
        allowed_currency_types JSONB DEFAULT '["fiat"]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create assets table
    await client.query(`
      CREATE TABLE IF NOT EXISTS assets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        household_id INTEGER REFERENCES households(id) ON DELETE CASCADE,
        household_member_id INTEGER REFERENCES household_members(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        amount DECIMAL(15,2) NOT NULL,
        currency VARCHAR(4) NOT NULL CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        category_id INTEGER REFERENCES asset_categories(id),
        description TEXT,
        date DATE NOT NULL,
        purchase_date DATE,
        purchase_price DECIMAL(15,2),
        purchase_currency VARCHAR(4) CHECK (purchase_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        current_value DECIMAL(15,2),
        last_valuation_date DATE,
        valuation_method VARCHAR(50),
        ownership_type VARCHAR(20) DEFAULT 'single' CHECK (ownership_type IN ('single', 'shared', 'household')),
        ownership_percentage DECIMAL(5,2) DEFAULT 100.00,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'transferred', 'inactive')),
        location TEXT,
        notes TEXT,
        photo_url TEXT,
        linked_loan_id INTEGER,
        linked_contract_id INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create asset_valuation_history table
    await client.query(`
      CREATE TABLE IF NOT EXISTS asset_valuation_history (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER,
        valuation_date DATE NOT NULL,
        value DECIMAL(15,2) NOT NULL,
        currency VARCHAR(4) NOT NULL CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD')),
        valuation_method VARCHAR(50),
        notes TEXT,
        created_by INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add foreign key constraints separately if they don't exist
    try {
      await client.query(`
        ALTER TABLE asset_valuation_history 
        ADD CONSTRAINT IF NOT EXISTS asset_valuation_history_asset_id_fkey 
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      `);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('ℹ️ Constraint may already exist or could not be added');
      }
    }

    try {
      await client.query(`
        ALTER TABLE asset_valuation_history 
        ADD CONSTRAINT IF NOT EXISTS asset_valuation_history_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES users(id)
      `);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('ℹ️ Constraint may already exist or could not be added');
      }
    }

    // Create shared_ownership_distribution table
    await client.query(`
      CREATE TABLE IF NOT EXISTS shared_ownership_distribution (
        id SERIAL PRIMARY KEY,
        asset_id INTEGER,
        household_member_id INTEGER,
        ownership_percentage DECIMAL(5,2) NOT NULL CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(asset_id, household_member_id)
      )
    `);

    // Add foreign key constraints for shared_ownership_distribution
    try {
      await client.query(`
        ALTER TABLE shared_ownership_distribution 
        ADD CONSTRAINT IF NOT EXISTS shared_ownership_distribution_asset_id_fkey 
        FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE
      `);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('ℹ️ Constraint may already exist or could not be added');
      }
    }

    try {
      await client.query(`
        ALTER TABLE shared_ownership_distribution 
        ADD CONSTRAINT IF NOT EXISTS shared_ownership_distribution_household_member_id_fkey 
        FOREIGN KEY (household_member_id) REFERENCES household_members(id) ON DELETE CASCADE
      `);
    } catch (e: any) {
      if (!e.message.includes('already exists')) {
        console.log('ℹ️ Constraint may already exist or could not be added');
      }
    }

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

    // Create currencies table
    await client.query(`
      CREATE TABLE IF NOT EXISTS currencies (
        id SERIAL PRIMARY KEY,
        code VARCHAR(10) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        name_de VARCHAR(100),
        name_tr VARCHAR(100),
        symbol VARCHAR(10) NOT NULL,
        currency_type VARCHAR(20) NOT NULL CHECK (currency_type IN ('fiat', 'cryptocurrency', 'precious_metal')),
        is_active BOOLEAN DEFAULT true,
        display_order INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    
    // Add user_id to household_members if it doesn't exist
    await addColumnToTable('household_members', 'user_id', 'INTEGER REFERENCES users(id) ON DELETE SET NULL');
    
    // Add allowed_currency_types to asset_categories if it doesn't exist
    await addColumnToTable('asset_categories', 'allowed_currency_types', "JSONB DEFAULT '[\"fiat\"]'::jsonb");

    // Add created_at to users table if it doesn't exist
    await addColumnToTable('users', 'created_at', 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP');
    
    // Update all users without created_at to use current timestamp
    try {
      await client.query(
        `UPDATE users 
         SET created_at = CURRENT_TIMESTAMP 
         WHERE created_at IS NULL`
      );
      console.log('✅ Updated users with created_at timestamps');
    } catch (error) {
      console.log('ℹ️ Error updating user created_at:', error);
    }

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

    // Add new columns to existing assets table
    try {
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS household_member_id INTEGER REFERENCES household_members(id) ON DELETE SET NULL`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS name VARCHAR(255)`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_price DECIMAL(15,2)`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_currency VARCHAR(4) CHECK (purchase_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS current_value DECIMAL(15,2)`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS last_valuation_date DATE`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(50)`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ownership_type VARCHAR(20) DEFAULT 'single' CHECK (ownership_type IN ('single', 'shared', 'household'))`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS ownership_percentage DECIMAL(5,2) DEFAULT 100.00`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'transferred', 'inactive'))`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS location TEXT`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS notes TEXT`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS photo_url TEXT`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS linked_loan_id INTEGER`);
      await client.query(`ALTER TABLE assets ADD COLUMN IF NOT EXISTS linked_contract_id INTEGER`);
      
      // Update existing records to have name = description if name is null
      await client.query(`UPDATE assets SET name = COALESCE(description, 'Unnamed Asset') WHERE name IS NULL`);
      await client.query(`ALTER TABLE assets ALTER COLUMN name SET NOT NULL`);
      
      console.log('✅ Updated assets table with new columns');
    } catch (error: any) {
      console.log('ℹ️ Assets table columns already updated or table does not exist');
    }

    // Add new columns to existing asset_categories table
    try {
      await client.query(`ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS category_type VARCHAR(50) DEFAULT 'other' CHECK (category_type IN ('real_estate', 'stocks', 'etf', 'bonds', 'crypto', 'gold', 'vehicles', 'collectibles', 'cash', 'other'))`);
      await client.query(`ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS icon VARCHAR(50)`);
      await client.query(`ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS requires_ticker BOOLEAN DEFAULT false`);
      await client.query(`ALTER TABLE asset_categories ADD COLUMN IF NOT EXISTS depreciation_enabled BOOLEAN DEFAULT false`);
      
      // Update the type constraint to allow 'asset'
      await client.query(`ALTER TABLE asset_categories DROP CONSTRAINT IF EXISTS asset_categories_type_check`);
      await client.query(`ALTER TABLE asset_categories ADD CONSTRAINT asset_categories_type_check CHECK (type IN ('income', 'expense', 'asset'))`);
      
      console.log('✅ Updated asset_categories table with new columns and constraint');
    } catch (error: any) {
      console.log('ℹ️ Asset_categories table columns already updated or table does not exist');
    }

    // Create indexes for better performance
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_account_status ON users(account_status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_locked_until ON users(account_locked_until)`);
    // Skip idx_assets_user_date as user_id column doesn't exist
    // await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_user_date ON assets(user_id, date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_household ON assets(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_member ON assets(household_member_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_assets_ownership ON assets(ownership_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_asset_valuation_history_asset ON asset_valuation_history(asset_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_asset_valuation_history_date ON asset_valuation_history(valuation_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contracts_household ON contracts(household_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_contracts_status ON contracts(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_exchange_rates_currencies ON exchange_rates(from_currency, to_currency)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_currencies_type ON currencies(currency_type)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_currencies_active ON currencies(is_active)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_currencies_display_order ON currencies(display_order)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_token ON invitation_tokens(token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_invitation_tokens_email ON invitation_tokens(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON admin_notifications(read)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_admin_notifications_created_at ON admin_notifications(created_at)`);

    // Add two-factor authentication columns to users table
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN DEFAULT false`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_secret TEXT`);
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS backup_codes JSONB`);
      console.log('✅ Added two-factor authentication columns to users table');
    } catch (error: any) {
      console.log('ℹ️ Two-factor columns already exist or users table does not exist');
    }

    // Create user_activity table
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS user_activity (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          action_type VARCHAR(50) NOT NULL,
          description TEXT,
          ip_address VARCHAR(45),
          user_agent TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_user_created ON user_activity(user_id, created_at DESC)`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_user_activity_action ON user_activity(action_type)`);
      console.log('✅ Created user_activity table');
    } catch (error: any) {
      console.log('ℹ️ user_activity table already exists');
    }

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
