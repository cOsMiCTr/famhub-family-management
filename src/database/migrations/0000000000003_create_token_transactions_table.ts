import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('token_transactions');
  
  if (tableExists) {
    console.log('⚠️  token_transactions table already exists. Skipping creation.');
    return;
  }

  // Create token_transactions table to track all token changes
  await knex.schema.createTable('token_transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('transaction_type', 50).notNullable(); // 'purchase', 'admin_grant', 'refund', 'deduction', 'balance_adjustment'
    table.decimal('amount', 10, 2).notNullable(); // Positive for credits, negative for debits
    table.decimal('balance_before', 10, 2).notNullable();
    table.decimal('balance_after', 10, 2).notNullable();
    table.string('reference_type', 50).nullable(); // 'module_activation', 'module_deactivation', 'purchase', 'voucher', etc.
    table.integer('reference_id').nullable(); // ID of related record (module_activation id, purchase id, etc.)
    table.integer('voucher_id').nullable().references('id').inTable('voucher_codes').onDelete('SET NULL'); // If transaction used a voucher
    table.decimal('voucher_discount', 10, 2).defaultTo(0); // Discount amount from voucher
    table.text('description').nullable(); // Human-readable description
    table.integer('processed_by').nullable().references('id').inTable('users').onDelete('SET NULL'); // Admin who processed (for admin_grant, balance_adjustment)
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Indexes for performance
    table.index('user_id');
    table.index('transaction_type');
    table.index('created_at');
    table.index(['user_id', 'created_at']);
  });

  console.log('✅ token_transactions table created successfully');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('token_transactions');
  console.log('✅ token_transactions table dropped successfully');
}
