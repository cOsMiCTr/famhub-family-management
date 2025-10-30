import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if tables already exist
  const modulesTableExists = await knex.schema.hasTable('modules');
  
  if (modulesTableExists) {
    console.log('⚠️  Module management tables already exist. Skipping creation.');
    return;
  }

  // Create modules table (no dependencies - registry of available modules)
  await knex.schema.createTable('modules', (table) => {
    table.string('module_key', 50).primary(); // e.g., 'income', 'assets'
    table.string('name', 100).notNullable(); // Display name
    table.text('description').nullable();
    table.string('category', 50).defaultTo('premium'); // 'free', 'premium'
    table.integer('display_order').defaultTo(0);
    table.boolean('is_active').defaultTo(true); // Enable/disable module system-wide
    table.jsonb('metadata').nullable(); // Future: pricing, features, etc.
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
  });

  // Create user_token_account table (depends on users)
  await knex.schema.createTable('user_token_account', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().unique().references('id').inTable('users').onDelete('CASCADE');
    table.decimal('balance', 10, 2).defaultTo(0).notNullable(); // Current token balance (decimal for partial refunds)
    table.decimal('total_tokens_purchased', 10, 2).defaultTo(0); // Lifetime tokens purchased
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Index for fast lookup
    table.index('user_id');
  });

  // Create module_activations table (depends on users and modules)
  await knex.schema.createTable('module_activations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('module_key', 50).notNullable().references('module_key').inTable('modules').onDelete('CASCADE');
    table.timestamp('activated_at').notNullable().defaultTo(knex.fn.now());
    table.timestamp('expires_at').notNullable(); // Exactly 1 month from activation
    table.integer('activation_order').notNullable(); // FIFO order for expiration priority
    table.boolean('is_active').defaultTo(true); // Active until expires_at or manually revoked
    table.integer('token_used').defaultTo(1); // Number of tokens consumed (always 1 for now, future: multi-token modules)
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('user_id');
    table.index('module_key');
    table.index(['user_id', 'is_active', 'expires_at']); // Fast lookup for active modules
    table.index(['user_id', 'module_key', 'expires_at']); // Check existing active modules
    table.index('expires_at'); // For expiration cleanup queries
  });

  // Create voucher_codes table (depends on users for created_by)
  await knex.schema.createTable('voucher_codes', (table) => {
    table.increments('id').primary();
    table.string('code', 50).notNullable().unique(); // Voucher code (e.g., "WELCOME2024")
    table.string('description', 255).nullable();
    table.integer('discount_percentage').defaultTo(0); // Percentage discount (0-100)
    table.decimal('discount_amount', 10, 2).defaultTo(0); // Fixed discount amount
    table.decimal('minimum_purchase', 10, 2).nullable(); // Minimum purchase required
    table.integer('max_uses').nullable(); // Maximum number of times code can be used
    table.integer('used_count').defaultTo(0); // Current usage count
    table.timestamp('valid_from').notNullable();
    table.timestamp('valid_until').nullable(); // Null = no expiration
    table.boolean('is_active').defaultTo(true);
    table.integer('created_by').nullable().references('id').inTable('users').onDelete('SET NULL'); // Admin or user who created
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Indexes
    table.index('code');
    table.index(['is_active', 'valid_until']);
  });

  // Create voucher_usages table (depends on voucher_codes and users)
  await knex.schema.createTable('voucher_usages', (table) => {
    table.increments('id').primary();
    table.integer('voucher_id').notNullable().references('id').inTable('voucher_codes').onDelete('CASCADE');
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.integer('tokens_purchased').notNullable(); // Number of tokens purchased with this voucher
    table.decimal('original_price', 10, 2).notNullable();
    table.decimal('discount_applied', 10, 2).notNullable();
    table.decimal('final_price', 10, 2).notNullable();
    table.timestamp('used_at').notNullable().defaultTo(knex.fn.now());

    // Indexes
    table.index(['voucher_id', 'user_id']); // Prevent duplicate use per user per voucher (if needed)
    table.index('user_id');
  });

  console.log('✅ Module management tables created successfully');
}

export async function down(knex: Knex): Promise<void> {
  // Drop tables in reverse dependency order
  await knex.schema.dropTableIfExists('voucher_usages');
  await knex.schema.dropTableIfExists('voucher_codes');
  await knex.schema.dropTableIfExists('module_activations');
  await knex.schema.dropTableIfExists('user_token_account');
  await knex.schema.dropTableIfExists('modules');
  
  console.log('✅ Module management tables dropped successfully');
}

