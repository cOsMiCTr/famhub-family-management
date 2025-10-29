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

// Old runMigrations() function removed - now using Knex migrations
// See src/database/migrations/ for migration files

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
