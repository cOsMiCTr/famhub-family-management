#!/usr/bin/env node
// Script to mark Knex migrations as already applied when tables exist
// This is needed when migrating from the old system to Knex

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function markMigrationsApplied() {
  const client = await pool.connect();
  
  try {
    // Check if knex_migrations table exists, if not create it
    const migrationsTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knex_migrations'
      )
    `);

    if (!migrationsTableExists.rows[0].exists) {
      console.log('Creating knex_migrations table...');
      await client.query(`
        CREATE TABLE knex_migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          batch INTEGER NOT NULL,
          migration_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
    }

    // Check if knex_migrations_lock table exists
    const lockTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'knex_migrations_lock'
      )
    `);

    if (!lockTableExists.rows[0].exists) {
      console.log('Creating knex_migrations_lock table...');
      await client.query(`
        CREATE TABLE knex_migrations_lock (
          is_locked INTEGER DEFAULT 0,
          CONSTRAINT knex_migrations_lock_pkey PRIMARY KEY (is_locked)
        )
      `);
      await client.query('INSERT INTO knex_migrations_lock (is_locked) VALUES (0)');
    }

    // Check if users table exists (indicating tables were created by old system)
    const usersTableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'users'
      )
    `);

    if (!usersTableExists.rows[0].exists) {
      console.log('❌ Users table does not exist. Cannot mark migrations as applied.');
      process.exit(1);
    }

    // Check if migrations are already marked
    const existingMigrations = await client.query(`
      SELECT name FROM knex_migrations 
      WHERE name IN ('0000000000000_initial_schema.ts', '0000000000001_create_indexes.ts')
    `);

    if (existingMigrations.rows.length === 2) {
      console.log('✅ Migrations are already marked as applied');
      return;
    }

    // Get next batch number
    const batchResult = await client.query('SELECT COALESCE(MAX(batch), 0) + 1 as next_batch FROM knex_migrations');
    const nextBatch = batchResult.rows[0].next_batch;

    // Mark migrations as applied
    const migrationsToMark = [
      '0000000000000_initial_schema.ts',
      '0000000000001_create_indexes.ts'
    ];

    for (const migrationName of migrationsToMark) {
      const exists = existingMigrations.rows.find(row => row.name === migrationName);
      if (!exists) {
        await client.query(
          'INSERT INTO knex_migrations (name, batch, migration_time) VALUES ($1, $2, CURRENT_TIMESTAMP)',
          [migrationName, nextBatch]
        );
        console.log(`✅ Marked ${migrationName} as applied (batch ${nextBatch})`);
      }
    }

    console.log('\n✅ Successfully marked all migrations as applied!');
    console.log('You can now safely deploy new migrations.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

markMigrationsApplied();

