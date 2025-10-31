import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('expense_external_person_links');
  if (tableExists) {
    console.log('✅ expense_external_person_links table already exists. Skipping creation.');
    return;
  }

  await knex.schema.createTable('expense_external_person_links', (table) => {
    table.increments('id').primary();
    table.integer('expense_id').notNullable().references('id').inTable('expenses').onDelete('CASCADE');
    table.integer('external_person_id').notNullable().references('id').inTable('external_persons').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    
    // Unique constraint: prevent duplicate links
    table.unique(['expense_id', 'external_person_id']);
    
    // Indexes for performance
    table.index('expense_id');
    table.index('external_person_id');
    table.index(['expense_id', 'external_person_id']); // Composite for join queries
  });

  // Migrate existing external_person_id from expenses.metadata to the new table
  // This handles expenses that were created before this migration
  const expensesWithExternalPersons = await knex('expenses')
    .whereNotNull('metadata')
    .select('id', 'metadata');

  for (const expense of expensesWithExternalPersons) {
    try {
      if (expense.metadata && typeof expense.metadata === 'object') {
        const metadata = typeof expense.metadata === 'string' 
          ? JSON.parse(expense.metadata) 
          : expense.metadata;
        
        // Check if metadata contains external_person_id (could be single ID or array)
        if (metadata.external_person_id) {
          const externalPersonIds = Array.isArray(metadata.external_person_id)
            ? metadata.external_person_id
            : [metadata.external_person_id];

          for (const externalPersonId of externalPersonIds) {
            if (typeof externalPersonId === 'number') {
              // Check if external person exists and link doesn't already exist
              const externalPersonExists = await knex('external_persons').where('id', externalPersonId).first();
              if (externalPersonExists) {
                const linkExists = await knex('expense_external_person_links')
                  .where({ expense_id: expense.id, external_person_id: externalPersonId })
                  .first();
                
                if (!linkExists) {
                  await knex('expense_external_person_links').insert({
                    expense_id: expense.id,
                    external_person_id: externalPersonId,
                    created_at: knex.fn.now()
                  });
                }
              }
            }
          }
        }
      }
    } catch (error) {
      // If metadata parsing fails or external person doesn't exist, skip this expense
      console.warn(`Failed to migrate external person link for expense ${expense.id}:`, error);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('expense_external_person_links');
}

