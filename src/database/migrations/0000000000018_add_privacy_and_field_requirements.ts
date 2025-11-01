import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Add privacy and field requirement fields to expense_categories
  await knex.schema.alterTable('expense_categories', (table) => {
    table.boolean('allow_sharing_with_external_persons').defaultTo(true);
    table.jsonb('field_requirements').nullable();
  });

  // Add privacy and field requirement fields to income_categories
  await knex.schema.alterTable('income_categories', (table) => {
    table.boolean('allow_sharing_with_external_persons').defaultTo(true);
    table.jsonb('field_requirements').nullable();
  });

  // Add privacy and field requirement fields to asset_categories
  await knex.schema.alterTable('asset_categories', (table) => {
    table.boolean('allow_sharing_with_external_persons').defaultTo(true);
    table.jsonb('field_requirements').nullable();
  });

  // Add privacy field to expenses
  await knex.schema.alterTable('expenses', (table) => {
    table.boolean('share_with_external_persons').nullable().defaultTo(null);
  });

  // Add privacy field to income
  await knex.schema.alterTable('income', (table) => {
    table.boolean('share_with_external_persons').nullable().defaultTo(null);
  });

  // Add privacy field to assets
  await knex.schema.alterTable('assets', (table) => {
    table.boolean('share_with_external_persons').nullable().defaultTo(null);
  });

  // Add indexes for performance
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_share_with_external_persons ON expenses(share_with_external_persons) WHERE share_with_external_persons IS NOT NULL');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_income_share_with_external_persons ON income(share_with_external_persons) WHERE share_with_external_persons IS NOT NULL');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_assets_share_with_external_persons ON assets(share_with_external_persons) WHERE share_with_external_persons IS NOT NULL');
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes
  await knex.schema.raw('DROP INDEX IF EXISTS idx_assets_share_with_external_persons');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_income_share_with_external_persons');
  await knex.schema.raw('DROP INDEX IF EXISTS idx_expenses_share_with_external_persons');

  // Remove fields from assets
  await knex.schema.alterTable('assets', (table) => {
    table.dropColumn('share_with_external_persons');
  });

  // Remove fields from income
  await knex.schema.alterTable('income', (table) => {
    table.dropColumn('share_with_external_persons');
  });

  // Remove fields from expenses
  await knex.schema.alterTable('expenses', (table) => {
    table.dropColumn('share_with_external_persons');
  });

  // Remove fields from asset_categories
  await knex.schema.alterTable('asset_categories', (table) => {
    table.dropColumn('field_requirements');
    table.dropColumn('allow_sharing_with_external_persons');
  });

  // Remove fields from income_categories
  await knex.schema.alterTable('income_categories', (table) => {
    table.dropColumn('field_requirements');
    table.dropColumn('allow_sharing_with_external_persons');
  });

  // Remove fields from expense_categories
  await knex.schema.alterTable('expense_categories', (table) => {
    table.dropColumn('field_requirements');
    table.dropColumn('allow_sharing_with_external_persons');
  });
}

