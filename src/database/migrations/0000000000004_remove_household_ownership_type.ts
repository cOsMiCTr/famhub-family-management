import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Remove 'household' from the ownership_type constraint
  // This removes the legacy ownership type that has been replaced by 'shared' ownership with distribution table
  
  try {
    // First, drop the existing constraint
    await knex.raw(`
      ALTER TABLE assets 
      DROP CONSTRAINT IF EXISTS assets_ownership_type_check;
    `);
    
    // Recreate the constraint without 'household'
    await knex.raw(`
      ALTER TABLE assets 
      ADD CONSTRAINT assets_ownership_type_check 
      CHECK (ownership_type IN ('single', 'shared'));
    `);
    
    // Update any existing assets with 'household' ownership_type to 'shared'
    // This handles any legacy data
    await knex.raw(`
      UPDATE assets 
      SET ownership_type = 'shared' 
      WHERE ownership_type = 'household';
    `);
    
    console.log('✅ Removed household ownership type from constraint');
  } catch (error) {
    console.error('Error removing household ownership type:', error);
    throw error;
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revert: add back 'household' to the constraint
  try {
    await knex.raw(`
      ALTER TABLE assets 
      DROP CONSTRAINT IF EXISTS assets_ownership_type_check;
    `);
    
    await knex.raw(`
      ALTER TABLE assets 
      ADD CONSTRAINT assets_ownership_type_check 
      CHECK (ownership_type IN ('single', 'shared', 'household'));
    `);
    
    console.log('✅ Reverted household ownership type constraint');
  } catch (error) {
    console.error('Error reverting household ownership type:', error);
    throw error;
  }
}

