import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add parent_category_id and display_order to expense_categories
  await knex.schema.alterTable('expense_categories', (table) => {
    table.integer('parent_category_id').nullable().references('id').inTable('expense_categories').onDelete('CASCADE');
    table.integer('display_order').defaultTo(0);
  });
  
  // Set parent_category_id to NULL for all existing categories (they are top-level)
  await knex('expense_categories').update({ parent_category_id: null, display_order: 0 });
  
  // Add index for parent_category_id
  await knex.schema.alterTable('expense_categories', (table) => {
    table.index('parent_category_id');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('expense_categories', (table) => {
    table.dropIndex('parent_category_id');
    table.dropColumn('parent_category_id');
    table.dropColumn('display_order');
  });
}

