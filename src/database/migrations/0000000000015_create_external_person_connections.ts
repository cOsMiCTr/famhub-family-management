import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('external_person_user_connections');
  if (tableExists) {
    console.log('✅ external_person_user_connections table already exists. Skipping creation.');
    return;
  }

  await knex.schema.createTable('external_person_user_connections', (table) => {
    table.increments('id').primary();
    table.integer('external_person_id').notNullable().references('id').inTable('external_persons').onDelete('CASCADE');
    table.integer('invited_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('invited_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    
    // Status: 'pending', 'accepted', 'rejected', 'revoked', 'expired'
    table.string('status', 20).notNullable().defaultTo('pending');
    
    table.timestamp('invited_at').defaultTo(knex.fn.now());
    table.timestamp('responded_at').nullable();
    table.timestamp('expires_at').notNullable(); // 5 days from invitation
    table.timestamps(true, true); // created_at, updated_at
    
    // Unique constraint: prevent duplicate invitations for same external person and user
    table.unique(['external_person_id', 'invited_user_id']);
    
    // Indexes for performance
    table.index('external_person_id');
    table.index('invited_user_id');
    table.index('invited_by_user_id');
    table.index('status');
    table.index('expires_at');
    table.index(['status', 'expires_at']); // Composite index for expiry queries
  });

  // Add CHECK constraint for status using raw SQL (Knex check() has limitations)
  const constraintExists = await knex.raw(`
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'external_person_user_connections_status_check'
  `);
  
  if (!constraintExists.rows || constraintExists.rows.length === 0) {
    await knex.raw(`
      ALTER TABLE external_person_user_connections 
      ADD CONSTRAINT external_person_user_connections_status_check 
      CHECK (status IN ('pending', 'accepted', 'rejected', 'revoked', 'expired'))
    `);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop constraint first
  await knex.raw(`
    ALTER TABLE external_person_user_connections 
    DROP CONSTRAINT IF EXISTS external_person_user_connections_status_check
  `);
  await knex.schema.dropTableIfExists('external_person_user_connections');
}

