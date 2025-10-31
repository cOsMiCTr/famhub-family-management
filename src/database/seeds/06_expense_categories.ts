import type { Knex } from 'knex';

const categories = [
  { 
    name_en: 'Birthday Presents', 
    name_de: 'Geburtstagsgeschenke', 
    name_tr: 'Doğum Günü Hediyeleri', 
    is_default: true,
    category_type: 'gift',
    has_custom_form: true,
    requires_asset_link: false,
    requires_member_link: true,
    allows_multiple_members: true
  },
  { 
    name_en: 'Credits', 
    name_de: 'Kredite', 
    name_tr: 'Krediler', 
    is_default: true,
    category_type: 'credit',
    has_custom_form: true,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Building Savings Contract', 
    name_de: 'Bausparvertrag', 
    name_tr: 'Bausparvertrag', 
    is_default: true,
    category_type: 'bausparvertrag',
    has_custom_form: true,
    requires_asset_link: true,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Bills', 
    name_de: 'Rechnungen', 
    name_tr: 'Faturalar', 
    is_default: true,
    category_type: 'bill',
    has_custom_form: true,
    requires_asset_link: true,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Tax', 
    name_de: 'Steuer', 
    name_tr: 'Vergi', 
    is_default: true,
    category_type: 'tax',
    has_custom_form: true,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Insurance', 
    name_de: 'Versicherung', 
    name_tr: 'Sigorta', 
    is_default: true,
    category_type: 'insurance',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Subscriptions', 
    name_de: 'Abonnements', 
    name_tr: 'Abonelikler', 
    is_default: true,
    category_type: 'subscription',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'School Expenses', 
    name_de: 'Schulausgaben', 
    name_tr: 'Okul Giderleri', 
    is_default: true,
    category_type: 'school',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Food & Groceries', 
    name_de: 'Lebensmittel & Lebensmittel', 
    name_tr: 'Yiyecek ve Market', 
    is_default: true,
    category_type: 'other',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Utilities', 
    name_de: 'Nutzungsgebühren', 
    name_tr: 'Faturalar', 
    is_default: true,
    category_type: 'bill',
    has_custom_form: true,
    requires_asset_link: true,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Transportation', 
    name_de: 'Transport', 
    name_tr: 'Ulaşım', 
    is_default: true,
    category_type: 'other',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Housing/Rent', 
    name_de: 'Wohnen/Miete', 
    name_tr: 'Konut/Kira', 
    is_default: true,
    category_type: 'bill',
    has_custom_form: true,
    requires_asset_link: true,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Healthcare', 
    name_de: 'Gesundheitswesen', 
    name_tr: 'Sağlık', 
    is_default: true,
    category_type: 'other',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Education', 
    name_de: 'Bildung', 
    name_tr: 'Eğitim', 
    is_default: true,
    category_type: 'school',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Entertainment', 
    name_de: 'Unterhaltung', 
    name_tr: 'Eğlence', 
    is_default: true,
    category_type: 'other',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Clothing', 
    name_de: 'Kleidung', 
    name_tr: 'Giyim', 
    is_default: true,
    category_type: 'other',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  },
  { 
    name_en: 'Other', 
    name_de: 'Sonstiges', 
    name_tr: 'Diğer', 
    is_default: true,
    category_type: 'other',
    has_custom_form: false,
    requires_asset_link: false,
    requires_member_link: false,
    allows_multiple_members: false
  }
];

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Starting expense categories seeding...');

  // Check if expense_categories table exists
  const tableExists = await knex.schema.hasTable('expense_categories');
  
  if (!tableExists) {
    console.log('⚠️  Expense categories table does not exist yet. Please run migrations first.');
    return;
  }

  // Insert categories (idempotent - check before insert)
  // This ensures all categories are present, even if some already exist
  let insertedCount = 0;
  for (const category of categories) {
    const existing = await knex('expense_categories')
      .where('name_en', category.name_en)
      .first();
    
    if (!existing) {
      await knex('expense_categories').insert({
        name_en: category.name_en,
        name_de: category.name_de,
        name_tr: category.name_tr,
        is_default: category.is_default,
        category_type: category.category_type || null,
        has_custom_form: category.has_custom_form || false,
        requires_asset_link: category.requires_asset_link || false,
        requires_member_link: category.requires_member_link || false,
        allows_multiple_members: category.allows_multiple_members || false
      });
      insertedCount++;
      console.log(`  ✓ Added category: ${category.name_en}`);
    }
  }

  if (insertedCount === 0) {
    console.log('✅ All expense categories already exist');
  } else {
    console.log(`✅ Inserted ${insertedCount} new expense category(ies)`);
  }

  const count = await knex('expense_categories').count('* as count').first();
  console.log(`✅ Total expense categories: ${count?.count || 0}`);
}
