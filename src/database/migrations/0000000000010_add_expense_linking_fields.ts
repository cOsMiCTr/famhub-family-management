import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add linking and metadata fields to expenses table
  await knex.schema.alterTable('expenses', (table) => {
    table.integer('linked_asset_id').nullable().references('id').inTable('assets').onDelete('SET NULL');
    table.string('credit_use_type', 50).nullable(); // 'free_use', 'renovation', 'property_purchase', 'other'
    table.jsonb('metadata').nullable(); // Flexible storage for category-specific fields
  });

  // Add category type fields to expense_categories table
  await knex.schema.alterTable('expense_categories', (table) => {
    table.string('category_type', 50).nullable(); // 'gift', 'credit', 'bill', 'tax', 'insurance', 'subscription', 'school', 'bausparvertrag', 'other'
    table.boolean('has_custom_form').defaultTo(false);
    table.boolean('requires_asset_link').defaultTo(false);
    table.boolean('requires_member_link').defaultTo(false);
    table.boolean('allows_multiple_members').defaultTo(false);
  });

  // Create expense_member_links table for many-to-many relationship
  await knex.schema.createTable('expense_member_links', (table) => {
    table.increments('id').primary();
    table.integer('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    table.integer('household_member_id').notNullable().references('id').inTable('household_members').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Ensure unique combination of expense and member
    table.unique(['expense_id', 'household_member_id']);
  });

  // Add indexes for performance
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_linked_asset_id ON expenses(linked_asset_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expense_member_links_expense_id ON expense_member_links(expense_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expense_member_links_household_member_id ON expense_member_links(household_member_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expense_categories_category_type ON expense_categories(category_type)');
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expense_categories_category_type');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expense_member_links_household_member_id');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expense_member_links_expense_id');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expenses_linked_asset_id');

  // Drop expense_member_links table
  await knex.schema.dropTableIfExists('expense_member_links');

  // Remove fields from expense_categories
  await knex.schema.alterTable('expense_categories', (table) => {
    table.dropColumn('allows_multiple_members');
    table.dropColumn('requires_member_link');
    table.dropColumn('requires_asset_link');
    table.dropColumn('has_custom_form');
    table.dropColumn('category_type');
  });

  // Remove fields from expenses
  await knex.schema.alterTable('expenses', (table) => {
    table.dropColumn('metadata');
    table.dropColumn('credit_use_type');
    table.dropColumn('linked_asset_id');
  });
}

