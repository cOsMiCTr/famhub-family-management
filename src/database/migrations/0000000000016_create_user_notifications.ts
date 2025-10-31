import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('user_notifications');
  if (tableExists) {
    console.log('✅ user_notifications table already exists. Skipping creation.');
    return;
  }

  await knex.schema.createTable('user_notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('type', 50).notNullable(); // 'invitation', 'invitation_accepted', 'invitation_revoked', 'invitation_expired', etc.
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    
    // Related entity tracking (for linking to invitations, expenses, etc.)
    table.string('related_entity_type', 50).nullable(); // 'external_person_connection', 'expense', 'income', 'asset', etc.
    table.integer('related_entity_id').nullable();
    
    table.boolean('read').defaultTo(false).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Future email infrastructure
    table.boolean('email_sent').defaultTo(false);
    table.timestamp('email_sent_at').nullable();
    table.string('email_queue_id', 255).nullable(); // For future email queue integration
    
    // Indexes for performance
    table.index('user_id');
    table.index('read');
    table.index('created_at');
    table.index(['user_id', 'read']); // Composite index for common query pattern
    table.index('related_entity_type');
    table.index(['related_entity_type', 'related_entity_id']); // For linking queries
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('user_notifications');
}

