import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('external_persons', (table) => {
    table.increments('id').primary();
    table.integer('household_id').notNullable().references('id').inTable('households').onDelete('CASCADE');
    table.string('name').notNullable();
    table.date('birth_date').nullable();
    table.string('relationship', 100).nullable();
    table.text('notes').nullable();
    table.integer('created_by_user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    // Indexes
    table.index('household_id');
    table.index('created_by_user_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('external_persons');
}

