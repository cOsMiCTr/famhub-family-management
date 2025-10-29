import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if tables already exist (for migration from old system)
  const usersTableExists = await knex.schema.hasTable('users');
  
  if (usersTableExists) {
    console.log('⚠️  Tables already exist. Skipping schema creation.');
    console.log('✅ Assuming migrations were already applied by old system.');
    return;
  }

  // Create users table (no dependencies)
  await knex.schema.createTable('users', (table) => {
    table.increments('id').primary();
    table.string('email', 255).unique().notNullable();
    table.string('password_hash', 255).notNullable();
    table.string('role', 20).defaultTo('user');
    table.integer('household_id');
    table.string('preferred_language', 5).defaultTo('en');
    table.string('main_currency', 4).defaultTo('USD');
    table.boolean('must_change_password').defaultTo(false);
    table.timestamp('password_changed_at');
    table.string('account_status', 50).defaultTo('active');
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('last_failed_login_at');
    table.timestamp('account_locked_until');
    table.timestamp('last_login_at');
    table.timestamp('last_activity_at');
    table.specificType('password_history', 'TEXT[]').defaultTo('ARRAY[]::TEXT[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.boolean('two_factor_enabled').defaultTo(false);
    table.text('two_factor_secret');
    table.jsonb('backup_codes');
  });

  // Create households table (depends on users)
  await knex.schema.createTable('households', (table) => {
    table.increments('id').primary();
    table.string('name', 255).notNullable();
    table.integer('created_by_admin_id').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create household_permissions table (depends on households, users)
  await knex.schema.createTable('household_permissions', (table) => {
    table.increments('id').primary();
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.boolean('can_view_contracts').defaultTo(false);
    table.boolean('can_view_income').defaultTo(false);
    table.boolean('can_edit').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['household_id', 'user_id']);
  });

  // Create household_members table (depends on households, users)
  await knex.schema.createTable('household_members', (table) => {
    table.increments('id').primary();
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.string('relationship', 100);
    table.date('date_of_birth');
    table.text('notes');
    table.boolean('is_shared').defaultTo(false);
    table.integer('created_by_user_id').references('id').inTable('users');
    table.integer('user_id').references('id').inTable('users').onDelete('SET NULL');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create asset_categories table (no dependencies)
  await knex.schema.createTable('asset_categories', (table) => {
    table.increments('id').primary();
    table.string('name_de', 255).notNullable();
    table.string('name_en', 255).notNullable();
    table.string('name_tr', 255).notNullable();
    table.string('type', 20).defaultTo('income');
    table.string('category_type', 50).defaultTo('other');
    table.string('icon', 50);
    table.boolean('requires_ticker').defaultTo(false);
    table.boolean('depreciation_enabled').defaultTo(false);
    table.boolean('is_default').defaultTo(false);
    table.jsonb('allowed_currency_types').defaultTo('["fiat"]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create assets table (depends on users, households, household_members, asset_categories)
  await knex.schema.createTable('assets', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.integer('household_member_id').references('id').inTable('household_members').onDelete('SET NULL');
    table.string('name', 255).notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('currency', 4).notNullable();
    table.integer('category_id').references('id').inTable('asset_categories');
    table.text('description');
    table.date('date').notNullable();
    table.date('purchase_date');
    table.decimal('purchase_price', 15, 2);
    table.string('purchase_currency', 4);
    table.decimal('current_value', 15, 2);
    table.date('last_valuation_date');
    table.string('valuation_method', 50);
    table.string('ownership_type', 20).defaultTo('single');
    table.decimal('ownership_percentage', 5, 2).defaultTo('100.00');
    table.string('status', 20).defaultTo('active');
    table.text('location');
    table.text('notes');
    table.text('photo_url');
    table.integer('linked_loan_id');
    table.integer('linked_contract_id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Add CHECK constraints for assets table using raw SQL (Knex check() has limitations)
  await knex.raw(`
    ALTER TABLE assets 
    ADD CONSTRAINT assets_currency_check 
    CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))
  `);
  
  await knex.raw(`
    ALTER TABLE assets 
    ADD CONSTRAINT assets_purchase_currency_check 
    CHECK (purchase_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD') OR purchase_currency IS NULL)
  `);

  // Create asset_valuation_history table (depends on assets, users)
  await knex.schema.createTable('asset_valuation_history', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.date('valuation_date').notNullable();
    table.decimal('value', 15, 2).notNullable();
    table.string('currency', 4).notNullable();
    table.string('valuation_method', 50);
    table.text('notes');
    table.integer('created_by').references('id').inTable('users');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  await knex.raw(`
    ALTER TABLE asset_valuation_history 
    ADD CONSTRAINT asset_valuation_history_currency_check 
    CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))
  `);

  // Create shared_ownership_distribution table (depends on assets, household_members)
  await knex.schema.createTable('shared_ownership_distribution', (table) => {
    table.increments('id').primary();
    table.integer('asset_id').references('id').inTable('assets').onDelete('CASCADE');
    table.integer('household_member_id').references('id').inTable('household_members').onDelete('CASCADE');
    table.decimal('ownership_percentage', 5, 2).notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['asset_id', 'household_member_id']);
  });

  // Create contract_categories table (no dependencies)
  await knex.schema.createTable('contract_categories', (table) => {
    table.increments('id').primary();
    table.string('name_de', 255).notNullable();
    table.string('name_en', 255).notNullable();
    table.string('name_tr', 255).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create contracts table (depends on households, contract_categories, users)
  await knex.schema.createTable('contracts', (table) => {
    table.increments('id').primary();
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.integer('category_id').references('id').inTable('contract_categories');
    table.text('parties').notNullable();
    table.date('start_date');
    table.date('end_date');
    table.date('renewal_date');
    table.string('status', 20).defaultTo('active');
    table.integer('created_by').references('id').inTable('users');
    table.string('visibility', 20).defaultTo('household');
    table.specificType('assigned_member_ids', 'INTEGER[]').defaultTo('ARRAY[]::INTEGER[]');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create notifications table (depends on users)
  await knex.schema.createTable('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.text('message').notNullable();
    table.string('type', 50).notNullable();
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create exchange_rates table (no dependencies)
  await knex.schema.createTable('exchange_rates', (table) => {
    table.increments('id').primary();
    table.string('from_currency', 4).notNullable();
    table.string('to_currency', 4).notNullable();
    table.decimal('rate', 15, 8).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.unique(['from_currency', 'to_currency']);
  });

  // Create currencies table (no dependencies)
  await knex.schema.createTable('currencies', (table) => {
    table.increments('id').primary();
    table.string('code', 10).unique().notNullable();
    table.string('name', 100).notNullable();
    table.string('name_de', 100);
    table.string('name_tr', 100);
    table.string('symbol', 10).notNullable();
    table.string('currency_type', 20).notNullable();
    table.boolean('is_active').defaultTo(true);
    table.integer('display_order').defaultTo(0);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create invitation_tokens table (depends on households)
  await knex.schema.createTable('invitation_tokens', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable();
    table.string('token', 255).unique().notNullable();
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.timestamp('expires_at').notNullable();
    table.boolean('used').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create login_attempts table (depends on users)
  await knex.schema.createTable('login_attempts', (table) => {
    table.increments('id').primary();
    table.string('email', 255).notNullable();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.boolean('success').notNullable();
    table.string('ip_address', 50);
    table.text('user_agent');
    table.string('failure_reason', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create admin_notifications table (depends on users)
  await knex.schema.createTable('admin_notifications', (table) => {
    table.increments('id').primary();
    table.string('type', 50).notNullable();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('title', 255).notNullable();
    table.text('message').notNullable();
    table.string('severity', 20).defaultTo('info');
    table.boolean('read').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create translations table (no dependencies)
  await knex.schema.createTable('translations', (table) => {
    table.increments('id').primary();
    table.string('translation_key', 255).unique().notNullable();
    table.string('category', 100);
    table.text('en').notNullable();
    table.text('de');
    table.text('tr');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create income_categories table (no dependencies)
  await knex.schema.createTable('income_categories', (table) => {
    table.increments('id').primary();
    table.string('name_en', 255).notNullable();
    table.string('name_de', 255).notNullable();
    table.string('name_tr', 255).notNullable();
    table.boolean('is_default').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Create income table (depends on households, household_members, income_categories, users)
  await knex.schema.createTable('income', (table) => {
    table.increments('id').primary();
    table.integer('household_id').references('id').inTable('households').onDelete('CASCADE');
    table.integer('household_member_id').references('id').inTable('household_members').onDelete('SET NULL');
    table.integer('category_id').references('id').inTable('income_categories');
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
    ALTER TABLE income 
    ADD CONSTRAINT income_currency_check 
    CHECK (currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'))
  `);

  await knex.raw(`
    ALTER TABLE income 
    ADD CONSTRAINT income_source_currency_check 
    CHECK (source_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD') OR source_currency IS NULL)
  `);

  // Create income_history table (depends on income, users)
  await knex.schema.createTable('income_history', (table) => {
    table.increments('id').primary();
    table.integer('income_id').references('id').inTable('income').onDelete('CASCADE');
    table.integer('changed_by_user_id').references('id').inTable('users');
    table.string('change_type', 20);
    table.jsonb('old_values');
    table.jsonb('new_values');
    table.timestamp('changed_at').defaultTo(knex.fn.now());
  });

  // Create user_activity table (depends on users)
  await knex.schema.createTable('user_activity', (table) => {
    table.increments('id').primary();
    table.integer('user_id').references('id').inTable('users').onDelete('CASCADE');
    table.string('action_type', 50).notNullable();
    table.text('description');
    table.string('ip_address', 45);
    table.text('user_agent');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });

  // Add foreign key constraint for users.household_id
  await knex.schema.alterTable('users', (table) => {
    table.foreign('household_id').references('id').inTable('households').onDelete('SET NULL');
  });

  // Add all CHECK constraints using raw SQL (after table creation)
  await knex.raw(`
    ALTER TABLE users 
    ADD CONSTRAINT users_role_check 
    CHECK (role IN ('admin', 'user'));
    
    ALTER TABLE users 
    ADD CONSTRAINT users_preferred_language_check 
    CHECK (preferred_language IN ('en', 'de', 'tr'));
    
    ALTER TABLE users 
    ADD CONSTRAINT users_account_status_check 
    CHECK (account_status IN ('active', 'locked', 'pending_password_change'));
    
    ALTER TABLE users 
    ADD CONSTRAINT users_main_currency_check 
    CHECK (main_currency IN ('TRY', 'GBP', 'USD', 'EUR', 'GOLD'));
  `);

  await knex.raw(`
    ALTER TABLE asset_categories 
    ADD CONSTRAINT asset_categories_type_check 
    CHECK (type IN ('income', 'expense', 'asset'));
    
    ALTER TABLE asset_categories 
    ADD CONSTRAINT asset_categories_category_type_check 
    CHECK (category_type IN ('real_estate', 'stocks', 'etf', 'bonds', 'crypto', 'gold', 'vehicles', 'collectibles', 'cash', 'other'));
  `);

  await knex.raw(`
    ALTER TABLE assets 
    ADD CONSTRAINT assets_ownership_type_check 
    CHECK (ownership_type IN ('single', 'shared', 'household'));
    
    ALTER TABLE assets 
    ADD CONSTRAINT assets_status_check 
    CHECK (status IN ('active', 'sold', 'transferred', 'inactive'));
  `);

  await knex.raw(`
    ALTER TABLE contracts 
    ADD CONSTRAINT contracts_status_check 
    CHECK (status IN ('active', 'expired', 'cancelled', 'pending'));
    
    ALTER TABLE contracts 
    ADD CONSTRAINT contracts_visibility_check 
    CHECK (visibility IN ('household', 'specific_users'));
  `);

  await knex.raw(`
    ALTER TABLE currencies 
    ADD CONSTRAINT currencies_currency_type_check 
    CHECK (currency_type IN ('fiat', 'cryptocurrency', 'precious_metal'));
  `);

  await knex.raw(`
    ALTER TABLE admin_notifications 
    ADD CONSTRAINT admin_notifications_severity_check 
    CHECK (severity IN ('info', 'warning', 'critical'));
  `);

  await knex.raw(`
    ALTER TABLE income 
    ADD CONSTRAINT income_frequency_check 
    CHECK (frequency IN ('monthly', 'weekly', 'yearly', 'one-time') OR frequency IS NULL);
  `);

  await knex.raw(`
    ALTER TABLE income_history 
    ADD CONSTRAINT income_history_change_type_check 
    CHECK (change_type IN ('created', 'updated', 'deleted') OR change_type IS NULL);
  `);

  await knex.raw(`
    ALTER TABLE shared_ownership_distribution 
    ADD CONSTRAINT shared_ownership_percentage_check 
    CHECK (ownership_percentage >= 0 AND ownership_percentage <= 100);
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('user_activity');
  await knex.schema.dropTableIfExists('income_history');
  await knex.schema.dropTableIfExists('income');
  await knex.schema.dropTableIfExists('income_categories');
  await knex.schema.dropTableIfExists('translations');
  await knex.schema.dropTableIfExists('admin_notifications');
  await knex.schema.dropTableIfExists('login_attempts');
  await knex.schema.dropTableIfExists('invitation_tokens');
  await knex.schema.dropTableIfExists('currencies');
  await knex.schema.dropTableIfExists('exchange_rates');
  await knex.schema.dropTableIfExists('notifications');
  await knex.schema.dropTableIfExists('contracts');
  await knex.schema.dropTableIfExists('contract_categories');
  await knex.schema.dropTableIfExists('shared_ownership_distribution');
  await knex.schema.dropTableIfExists('asset_valuation_history');
  await knex.schema.dropTableIfExists('assets');
  await knex.schema.dropTableIfExists('asset_categories');
  await knex.schema.dropTableIfExists('household_members');
  await knex.schema.dropTableIfExists('household_permissions');
  await knex.schema.dropTableIfExists('households');
  await knex.schema.dropTableIfExists('users');
}

