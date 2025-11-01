import { query } from '../src/config/database';
import dotenv from 'dotenv';

dotenv.config();

async function applyMigration() {
  try {
    console.log('Applying privacy and field requirements migration...');

    // Check if columns already exist
    const checkExpenseCategories = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expense_categories' 
      AND column_name IN ('allow_sharing_with_external_persons', 'field_requirements')
    `);

    if (checkExpenseCategories.rows.length === 0) {
      console.log('Adding columns to expense_categories...');
      await query(`
        ALTER TABLE expense_categories 
        ADD COLUMN IF NOT EXISTS allow_sharing_with_external_persons BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS field_requirements JSONB;
      `);
      console.log('✓ Added columns to expense_categories');
    } else {
      console.log('Columns already exist in expense_categories');
    }

    const checkIncomeCategories = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'income_categories' 
      AND column_name IN ('allow_sharing_with_external_persons', 'field_requirements')
    `);

    if (checkIncomeCategories.rows.length === 0) {
      console.log('Adding columns to income_categories...');
      await query(`
        ALTER TABLE income_categories 
        ADD COLUMN IF NOT EXISTS allow_sharing_with_external_persons BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS field_requirements JSONB;
      `);
      console.log('✓ Added columns to income_categories');
    } else {
      console.log('Columns already exist in income_categories');
    }

    const checkAssetCategories = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'asset_categories' 
      AND column_name IN ('allow_sharing_with_external_persons', 'field_requirements')
    `);

    if (checkAssetCategories.rows.length === 0) {
      console.log('Adding columns to asset_categories...');
      await query(`
        ALTER TABLE asset_categories 
        ADD COLUMN IF NOT EXISTS allow_sharing_with_external_persons BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS field_requirements JSONB;
      `);
      console.log('✓ Added columns to asset_categories');
    } else {
      console.log('Columns already exist in asset_categories');
    }

    const checkExpenses = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'expenses' 
      AND column_name = 'share_with_external_persons'
    `);

    if (checkExpenses.rows.length === 0) {
      console.log('Adding column to expenses...');
      await query(`
        ALTER TABLE expenses 
        ADD COLUMN IF NOT EXISTS share_with_external_persons BOOLEAN DEFAULT NULL;
      `);
      console.log('✓ Added column to expenses');
    } else {
      console.log('Column already exists in expenses');
    }

    const checkIncome = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'income' 
      AND column_name = 'share_with_external_persons'
    `);

    if (checkIncome.rows.length === 0) {
      console.log('Adding column to income...');
      await query(`
        ALTER TABLE income 
        ADD COLUMN IF NOT EXISTS share_with_external_persons BOOLEAN DEFAULT NULL;
      `);
      console.log('✓ Added column to income');
    } else {
      console.log('Column already exists in income');
    }

    const checkAssets = await query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'assets' 
      AND column_name = 'share_with_external_persons'
    `);

    if (checkAssets.rows.length === 0) {
      console.log('Adding column to assets...');
      await query(`
        ALTER TABLE assets 
        ADD COLUMN IF NOT EXISTS share_with_external_persons BOOLEAN DEFAULT NULL;
      `);
      console.log('✓ Added column to assets');
    } else {
      console.log('Column already exists in assets');
    }

    // Create indexes
    console.log('Creating indexes...');
    await query(`
      CREATE INDEX IF NOT EXISTS idx_expenses_share_with_external_persons 
      ON expenses(share_with_external_persons) 
      WHERE share_with_external_persons IS NOT NULL;
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_income_share_with_external_persons 
      ON income(share_with_external_persons) 
      WHERE share_with_external_persons IS NOT NULL;
    `);
    await query(`
      CREATE INDEX IF NOT EXISTS idx_assets_share_with_external_persons 
      ON assets(share_with_external_persons) 
      WHERE share_with_external_persons IS NOT NULL;
    `);
    console.log('✓ Created indexes');

    // Update Birthday Presents category
    console.log('Updating Birthday Presents category...');
    await query(`
      UPDATE expense_categories 
      SET allow_sharing_with_external_persons = false 
      WHERE name_en = 'Birthday Presents';
    `);
    console.log('✓ Updated Birthday Presents category');

    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();

