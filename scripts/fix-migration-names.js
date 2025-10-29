#!/usr/bin/env node
// Script to fix migration names in knex_migrations table
// Changes .ts to .js for production compatibility

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function fixMigrationNames() {
  const client = await pool.connect();
  
  try {
    console.log('🔧 Fixing migration names in knex_migrations table...');
    
    // Get current migrations
    const current = await client.query('SELECT * FROM knex_migrations ORDER BY id');
    console.log('Current migrations:');
    current.rows.forEach(row => {
      console.log(`  - ${row.name}`);
    });
    
    // Update .ts to .js
    const result = await client.query(`
      UPDATE knex_migrations 
      SET name = REPLACE(name, '.ts', '.js') 
      WHERE name LIKE '%.ts'
    `);
    
    console.log(`✅ Updated ${result.rowCount} migration name(s)`);
    
    // Verify
    const updated = await client.query('SELECT * FROM knex_migrations ORDER BY id');
    console.log('\nUpdated migrations:');
    updated.rows.forEach(row => {
      console.log(`  - ${row.name}`);
    });
    
    console.log('\n✅ Migration names fixed successfully!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

fixMigrationNames();

