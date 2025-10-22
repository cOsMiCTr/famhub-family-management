const { Pool } = require('pg');

async function fixDatabaseSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing database schema...');
    
    // First, drop the existing constraints
    try {
      await client.query('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_main_currency_check');
      console.log('✅ Dropped users currency constraint');
    } catch (e) { console.log('ℹ️ Constraint already dropped or not exists'); }
    
    try {
      await client.query('ALTER TABLE assets DROP CONSTRAINT IF EXISTS assets_currency_check');
      console.log('✅ Dropped assets currency constraint');
    } catch (e) { console.log('ℹ️ Constraint already dropped or not exists'); }
    
    // Alter currency columns to VARCHAR(4)
    await client.query('ALTER TABLE users ALTER COLUMN main_currency TYPE VARCHAR(4)');
    console.log('✅ Fixed users.main_currency');
    
    await client.query('ALTER TABLE assets ALTER COLUMN currency TYPE VARCHAR(4)');
    console.log('✅ Fixed assets.currency');
    
    await client.query('ALTER TABLE exchange_rates ALTER COLUMN from_currency TYPE VARCHAR(4)');
    console.log('✅ Fixed exchange_rates.from_currency');
    
    await client.query('ALTER TABLE exchange_rates ALTER COLUMN to_currency TYPE VARCHAR(4)');
    console.log('✅ Fixed exchange_rates.to_currency');
    
    // Re-add the constraints with the new currency list
    await client.query(`ALTER TABLE users ADD CONSTRAINT users_main_currency_check 
      CHECK (main_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))`);
    console.log('✅ Added users currency constraint');
    
    await client.query(`ALTER TABLE assets ADD CONSTRAINT assets_currency_check 
      CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))`);
    console.log('✅ Added assets currency constraint');
    
    console.log('🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabaseSchema();
