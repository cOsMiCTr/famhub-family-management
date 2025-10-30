import type { Knex } from 'knex';

interface ModuleData {
  module_key: string;
  name: string;
  description?: string;
  category: 'free' | 'premium';
  display_order: number;
  is_active: boolean;
}

const modules: ModuleData[] = [
  {
    module_key: 'income',
    name: 'Income Management',
    description: 'Track and manage income sources, transactions, and financial records',
    category: 'premium',
    display_order: 1,
    is_active: true
  },
  {
    module_key: 'assets',
    name: 'Assets Management',
    description: 'Manage and track your assets, valuations, and ownership',
    category: 'premium',
    display_order: 2,
    is_active: true
  },
  {
    module_key: 'expenses',
    name: 'Expenses Management',
    description: 'Track and manage household expenses',
    category: 'premium',
    display_order: 3,
    is_active: true
  }
];

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding modules...');
  
  // Check if modules table exists
  const tableExists = await knex.schema.hasTable('modules');
  
  if (!tableExists) {
    console.log('⚠️  Modules table does not exist yet. Please run migrations first.');
    return;
  }

  // Insert modules (idempotent: check before insert)
  // This ensures all modules are present, even if some already exist
  let insertedCount = 0;
  for (const module of modules) {
    const existing = await knex('modules').where('module_key', module.module_key).first();
    if (!existing) {
      await knex('modules').insert({
        module_key: module.module_key,
        name: module.name,
        description: module.description || null,
        category: module.category,
        display_order: module.display_order,
        is_active: module.is_active,
        metadata: null
      });
      insertedCount++;
      console.log(`  ✓ Added module: ${module.module_key}`);
    }
  }
  
  if (insertedCount === 0) {
    console.log('✅ All modules already exist');
  } else {
    console.log(`✅ Inserted ${insertedCount} new module(s)`);
  }

  console.log(`✅ Seeded ${modules.length} modules`);
}

