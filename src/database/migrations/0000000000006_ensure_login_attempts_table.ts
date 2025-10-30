import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if login_attempts table exists
  const tableExists = await knex.schema.hasTable('login_attempts');
  
  if (!tableExists) {
    console.log('Creating login_attempts table...');
    
    // Create login_attempts table
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

    // Create indexes for performance
    await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email)`);
    await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_login_attempts_user_id ON login_attempts(user_id)`);
    await knex.schema.raw(`CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at)`);
    
    console.log('✅ login_attempts table created successfully');
  } else {
    console.log('⚠️  login_attempts table already exists. Skipping creation.');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('login_attempts');
}
