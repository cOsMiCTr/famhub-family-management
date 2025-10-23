"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initializeDatabase = initializeDatabase;
exports.getClient = getClient;
exports.query = query;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});
async function initializeDatabase() {
    try {
        const client = await exports.pool.connect();
        console.log('📊 Database connection established');
        client.release();
        await runMigrations();
    }
    catch (error) {
        console.error('❌ Database initialization failed:', error);
        throw error;
    }
}
async function runMigrations() {
    const client = await exports.pool.connect();
    try {
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
        await client.query(`
      CREATE TABLE IF NOT EXISTS households (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        created_by_admin_id INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
        await client.query(`
      CREATE TABLE IF NOT EXISTS login_attempts (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        success BOOLEAN NOT NULL,
        ip_address VARCHAR(50),
        user_agent TEXT,
        failure_reason VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        await client.query(`
      CREATE TABLE IF NOT EXISTS admin_notifications (
        id SERIAL PRIMARY KEY,
        type VARCHAR(50) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
        try {
            await client.query(`
        ALTER TABLE users 
        ADD CONSTRAINT fk_users_household 
        FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE SET NULL
      `);
        }
        catch (error) {
            if (error.code !== '42710') {
                throw error;
            }
        }
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
    }
    catch (error) {
        console.error('❌ Database migration failed:', error);
        throw error;
    }
    finally {
        client.release();
    }
}
async function getClient() {
    return await exports.pool.connect();
}
async function query(text, params) {
    const client = await exports.pool.connect();
    try {
        const result = await client.query(text, params);
        return result;
    }
    finally {
        client.release();
    }
}
process.on('SIGINT', async () => {
    console.log('🛑 Shutting down database connection...');
    await exports.pool.end();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down database connection...');
    await exports.pool.end();
    process.exit(0);
});
//# sourceMappingURL=database.js.map