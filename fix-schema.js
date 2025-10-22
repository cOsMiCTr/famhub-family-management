const { Pool } = require('pg');

async function fixDatabaseSchema() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing database schema...');
    
    // Alter currency columns to VARCHAR(4)
    await client.query('ALTER TABLE users ALTER COLUMN main_currency TYPE VARCHAR(4)');
    console.log('✅ Fixed users.main_currency');
    
    await client.query('ALTER TABLE assets ALTER COLUMN currency TYPE VARCHAR(4)');
    console.log('✅ Fixed assets.currency');
    
    await client.query('ALTER TABLE exchange_rates ALTER COLUMN from_currency TYPE VARCHAR(4)');
    console.log('✅ Fixed exchange_rates.from_currency');
    
    await client.query('ALTER TABLE exchange_rates ALTER COLUMN to_currency TYPE VARCHAR(4)');
    console.log('✅ Fixed exchange_rates.to_currency');
    
    console.log('🎉 Database schema fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error fixing schema:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixDatabaseSchema();
