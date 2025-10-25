"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
        const seedClient = await exports.pool.connect();
        try {
            const translationCount = await seedClient.query('SELECT COUNT(*) as count FROM translations');
            const corruptedCount = await seedClient.query('SELECT COUNT(*) as count FROM translations WHERE en = \'\' OR en IS NULL');
            console.log('🔄 Forcing translation reseed to add missing keys...');
            const { default: seedTranslations } = await Promise.resolve().then(() => __importStar(require('../migrations/seedTranslations')));
            await seedTranslations();
            console.log('✅ Translations reseeded successfully');
        }
        finally {
            seedClient.release();
        }
        const categoryClient = await exports.pool.connect();
        try {
            const categoryCount = await categoryClient.query('SELECT COUNT(*) as count FROM income_categories');
            if (parseInt(categoryCount.rows[0].count) === 0) {
                console.log('🌱 Seeding income categories...');
                const { default: seedIncomeCategories } = await Promise.resolve().then(() => __importStar(require('../migrations/seedIncomeCategories')));
                await seedIncomeCategories();
                console.log('✅ Income categories seeded successfully');
            }
            else {
                console.log('✅ Income categories are intact');
            }
        }
        finally {
            categoryClient.release();
        }
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
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
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
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        severity VARCHAR(20) DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical')),
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
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
        const addColumnIfNotExists = async (columnName, columnDefinition) => {
            try {
                await client.query(`ALTER TABLE users ADD COLUMN ${columnName} ${columnDefinition}`);
                console.log(`✅ Added column: ${columnName}`);
            }
            catch (error) {
                if (error.code === '42701') {
                    console.log(`ℹ️ Column ${columnName} already exists`);
                }
                else {
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
        const addColumnToTable = async (tableName, columnName, columnDefinition) => {
            try {
                await client.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition}`);
                console.log(`✅ Added column ${columnName} to ${tableName}`);
            }
            catch (error) {
                if (error.code === '42701') {
                    console.log(`ℹ️ Column ${columnName} in ${tableName} already exists`);
                }
                else {
                    throw error;
                }
            }
        };
        await addColumnToTable('assets', 'household_member_id', 'INTEGER REFERENCES household_members(id) ON DELETE SET NULL');
        await addColumnToTable('contracts', 'assigned_member_ids', 'INTEGER[] DEFAULT ARRAY[]::INTEGER[]');
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
        try {
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
        }
        catch (error) {
            console.log('ℹ️ login_attempts foreign key constraint already updated or table does not exist');
        }
        try {
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
        }
        catch (error) {
            console.log('ℹ️ admin_notifications foreign key constraint already updated or table does not exist');
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