import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Update Bausparvertrag English name
  await knex('expense_categories')
    .where('name_en', 'Bausparvertrag')
    .update({ name_en: 'Building Savings Contract' });
  
  // Delete test category if it exists and has no expenses
  const testCategory = await knex('expense_categories')
    .where(function() {
      this.where('name_en', 'test')
        .orWhere('name_de', 'test')
        .orWhere('name_tr', 'test');
    })
    .first();
  
  if (testCategory) {
    // Check if it has any expenses
    const expenseCount = await knex('expenses')
      .where('category_id', testCategory.id)
      .count('* as count')
      .first();
    
    if (parseInt(expenseCount?.count as string || '0') === 0) {
      await knex('expense_categories')
        .where('id', testCategory.id)
        .delete();
      console.log('Deleted test category');
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Revert Bausparvertrag English name
  await knex('expense_categories')
    .where('name_en', 'Building Savings Contract')
    .update({ name_en: 'Bausparvertrag' });
  
  // Note: Cannot restore deleted test category
}

