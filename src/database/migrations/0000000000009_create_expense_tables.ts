import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Create expense_categories table (no dependencies)
  await knex.schema.createTable('expense_categories', (table) => {
    table.increments('id').primary();
    table.string('name_en', 255).notNullable();
    table.string('name_de', 255).notNullable();
    table.string('name_tr', 255).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create expenses table (depends on households, household_members, expense_categories, users)
  await knex.schema.createTable('expenses', (table) => {
    table.increments('id').primary();
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.integer('household_member_id').references('id').inTable('household_members').onDelete('SET NULL');
    table.integer('category_id').references('id').inTable('expense_categories');
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 4).notNullable();
    table.string('source_currency', 4);
    table.text('description');
    table.date('start_date').notNullable();
    table.date('end_date');
    table.boolean('is_recurring').defaultTo(false);
    table.string('frequency', 20);
    table.integer('created_by_user_id').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE expenses 
    ADD CONSTRAINT expenses_currency_check 
    CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))
  `);

  await knex.raw(`
    ALTER TABLE expenses 
    ADD CONSTRAINT expenses_source_currency_check 
    CHECK (source_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD') OR source_currency IS NULL)
  `);

  // Create expense_history table (depends on expenses, users)
  await knex.schema.createTable('expense_history', (table) => {
    table.increments('id').primary();
    table.integer('expense_id').references('id').inTable('expenses').onDelete('CASCADE');
    table.integer('changed_by_user_id').references('id').inTable('users');
    table.string('change_type', 20);
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.timestamp('changed_at').defaultTo(knex.fn.now());
  });

  // Create indexes for performance
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_household_id ON expenses(household_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_household_member_id ON expenses(household_member_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_start_date ON expenses(start_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_end_date ON expenses(end_date)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expenses_created_by_user_id ON expenses(created_by_user_id)');
  await knex.schema.raw('CREATE INDEX IF NOT EXISTS idx_expense_history_expense_id ON expense_history(expense_id)');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expense_history');
  await knex.schema.dropTableIfExists('expenses');
  await knex.schema.dropTableIfExists('expense_categories');
}

