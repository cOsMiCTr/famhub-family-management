import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if table exists
  const tableExists = await knex.schema.hasTable('external_persons');
  if (!tableExists) {
    console.log('⚠️  external_persons table does not exist. Skipping email column addition.');
    return;
  }

  // Check if email column already exists
  const hasEmailColumn = await knex.schema.hasColumn('external_persons', 'email');
  if (hasEmailColumn) {
    console.log('✅ email column already exists in external_persons. Skipping.');
    return;
  }

  // Add email column to external_persons table
  await knex.schema.alterTable('external_persons', (table) => {
    table.string('email', 255).nullable();
  });

  // Normalize existing emails to lowercase (if any exist)
  // Note: This will only work if emails were added manually before migration
  const existingPersons = await knex('external_persons').whereNotNull('email');
  for (const person of existingPersons) {
    if (person.email && person.email !== person.email.toLowerCase().trim()) {
      await knex('external_persons')
        .where('id', person.id)
        .update({ email: person.email.toLowerCase().trim() });
    }
  }

  // Add unique constraint: email must be unique within household (only if email is NOT NULL)
  // Note: PostgreSQL unique constraint with NULL handling - multiple NULLs are allowed
  const indexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE indexname = 'idx_external_persons_household_email'
  `);
  
  if (!indexExists.rows || indexExists.rows.length === 0) {
    await knex.raw(`
      CREATE UNIQUE INDEX idx_external_persons_household_email 
      ON external_persons(household_id, email) 
      WHERE email IS NOT NULL
    `);
  }

  // Add index on email for quick lookups (if it doesn't exist)
  const emailIndexExists = await knex.raw(`
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'external_persons' AND indexname LIKE '%email%'
  `);
  
  if (!emailIndexExists.rows || emailIndexExists.rows.length === 0) {
    await knex.schema.alterTable('external_persons', (table) => {
      table.index('email');
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  // Drop indexes first
  await knex.raw('DROP INDEX IF EXISTS idx_external_persons_household_email');
  await knex.schema.alterTable('external_persons', (table) => {
    table.dropIndex('email');
  });

  // Drop email column
  await knex.schema.alterTable('external_persons', (table) => {
    table.dropColumn('email');
  });
}

