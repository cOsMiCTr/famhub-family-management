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
    allows_multiple_members: true,
    allow_sharing_with_external_persons: false
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
        allows_multiple_members: category.allows_multiple_members || false,
        allow_sharing_with_external_persons: category.allow_sharing_with_external_persons !== undefined 
          ? category.allow_sharing_with_external_persons 
          : true
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

  // Add subcategories
  console.log('🌱 Starting expense subcategories seeding...');
  
  // Find parent categories
  const insuranceParent = await knex('expense_categories').where('name_en', 'Insurance').first();
  const subscriptionsParent = await knex('expense_categories').where('name_en', 'Subscriptions').first();
  const schoolParent = await knex('expense_categories').where('name_en', 'School Expenses').first();
  const billsParent = await knex('expense_categories').where('name_en', 'Bills').first();
  const utilitiesParent = await knex('expense_categories').where('name_en', 'Utilities').first();
  const housingRentParent = await knex('expense_categories').where('name_en', 'Housing/Rent').first();
  const taxParent = await knex('expense_categories').where('name_en', 'Tax').first();

  // Insurance subcategories
  if (insuranceParent) {
    const insuranceSubcategories = [
      { name_en: 'Health Insurance', name_de: 'Krankenversicherung', name_tr: 'Sağlık Sigortası', display_order: 1 },
      { name_en: 'Life Insurance', name_de: 'Lebensversicherung', name_tr: 'Hayat Sigortası', display_order: 2 },
      { name_en: 'Property Insurance', name_de: 'Grundstücksversicherung', name_tr: 'Emlak Sigortası', display_order: 3 },
      { name_en: 'Car Insurance', name_de: 'Kfz-Versicherung', name_tr: 'Araba Sigortası', display_order: 4 },
      { name_en: 'Family Insurance', name_de: 'Familienversicherung', name_tr: 'Aile Sigortası', display_order: 5 },
      { name_en: 'General Insurance', name_de: 'Allgemeine Versicherung', name_tr: 'Genel Sigorta', display_order: 6 }
    ];

    for (const sub of insuranceSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', insuranceParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'insurance',
          has_custom_form: true,
          requires_asset_link: sub.name_en === 'Property Insurance',
          requires_member_link: false,
          allows_multiple_members: sub.name_en === 'Family Insurance',
          parent_category_id: insuranceParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added insurance subcategory: ${sub.name_en}`);
      }
    }
  }

  // Subscription subcategories
  if (subscriptionsParent) {
    const subscriptionSubcategories = [
      { name_en: 'Netflix', name_de: 'Netflix', name_tr: 'Netflix', display_order: 1 },
      { name_en: 'Spotify', name_de: 'Spotify', name_tr: 'Spotify', display_order: 2 },
      { name_en: 'Amazon Prime', name_de: 'Amazon Prime', name_tr: 'Amazon Prime', display_order: 3 },
      { name_en: 'Disney+', name_de: 'Disney+', name_tr: 'Disney+', display_order: 4 },
      { name_en: 'Gym Membership', name_de: 'Fitnessstudio-Mitgliedschaft', name_tr: 'Spor Salonu Üyeliği', display_order: 5 },
      { name_en: 'Magazine Subscription', name_de: 'Zeitschriften-Abonnement', name_tr: 'Dergi Aboneliği', display_order: 6 },
      { name_en: 'Software Subscription', name_de: 'Software-Abonnement', name_tr: 'Yazılım Aboneliği', display_order: 7 },
      { name_en: 'Other', name_de: 'Sonstiges', name_tr: 'Diğer', display_order: 8 }
    ];

    for (const sub of subscriptionSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', subscriptionsParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'subscription',
          has_custom_form: false,
          requires_asset_link: false,
          requires_member_link: false,
          allows_multiple_members: false,
          parent_category_id: subscriptionsParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added subscription subcategory: ${sub.name_en}`);
      }
    }
  }

  // School Expenses subcategories
  if (schoolParent) {
    const schoolSubcategories = [
      { name_en: 'Tuition', name_de: 'Studiengebühren', name_tr: 'Öğrenim Ücreti', display_order: 1 },
      { name_en: 'Books', name_de: 'Bücher', name_tr: 'Kitaplar', display_order: 2 },
      { name_en: 'Supplies', name_de: 'Materialien', name_tr: 'Malzemeler', display_order: 3 },
      { name_en: 'Uniforms', name_de: 'Uniformen', name_tr: 'Üniforma', display_order: 4 },
      { name_en: 'Transportation', name_de: 'Transport', name_tr: 'Ulaşım', display_order: 5 },
      { name_en: 'Other', name_de: 'Sonstiges', name_tr: 'Diğer', display_order: 6 }
    ];

    for (const sub of schoolSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', schoolParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'school',
          has_custom_form: false,
          requires_asset_link: false,
          requires_member_link: false,
          allows_multiple_members: false,
          parent_category_id: schoolParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added school expense subcategory: ${sub.name_en}`);
      }
    }
  }

  // Bills subcategories
  if (billsParent) {
    const billsSubcategories = [
      { name_en: 'Electricity', name_de: 'Strom', name_tr: 'Elektrik', display_order: 1 },
      { name_en: 'Water', name_de: 'Wasser', name_tr: 'Su', display_order: 2 },
      { name_en: 'Gas', name_de: 'Gas', name_tr: 'Doğalgaz', display_order: 3 },
      { name_en: 'Maintenance', name_de: 'Instandhaltung', name_tr: 'Bakım', display_order: 4 },
      { name_en: 'Internet', name_de: 'Internet', name_tr: 'İnternet', display_order: 5 },
      { name_en: 'Other', name_de: 'Sonstiges', name_tr: 'Diğer', display_order: 6 }
    ];

    for (const sub of billsSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', billsParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'bill',
          has_custom_form: false,
          requires_asset_link: true,
          requires_member_link: false,
          allows_multiple_members: false,
          parent_category_id: billsParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added bill subcategory: ${sub.name_en}`);
      }
    }
  }

  // Utilities subcategories (same as Bills)
  if (utilitiesParent) {
    const utilitiesSubcategories = [
      { name_en: 'Electricity', name_de: 'Strom', name_tr: 'Elektrik', display_order: 1 },
      { name_en: 'Water', name_de: 'Wasser', name_tr: 'Su', display_order: 2 },
      { name_en: 'Gas', name_de: 'Gas', name_tr: 'Doğalgaz', display_order: 3 },
      { name_en: 'Internet', name_de: 'Internet', name_tr: 'İnternet', display_order: 4 },
      { name_en: 'Other', name_de: 'Sonstiges', name_tr: 'Diğer', display_order: 5 }
    ];

    for (const sub of utilitiesSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', utilitiesParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'bill',
          has_custom_form: false,
          requires_asset_link: true,
          requires_member_link: false,
          allows_multiple_members: false,
          parent_category_id: utilitiesParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added utility subcategory: ${sub.name_en}`);
      }
    }
  }

  // Housing/Rent subcategories
  if (housingRentParent) {
    const rentSubcategories = [
      { name_en: 'Rent', name_de: 'Miete', name_tr: 'Kira', display_order: 1 },
      { name_en: 'Maintenance', name_de: 'Instandhaltung', name_tr: 'Bakım', display_order: 2 },
      { name_en: 'Other', name_de: 'Sonstiges', name_tr: 'Diğer', display_order: 3 }
    ];

    for (const sub of rentSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', housingRentParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'bill',
          has_custom_form: false,
          requires_asset_link: true,
          requires_member_link: false,
          allows_multiple_members: false,
          parent_category_id: housingRentParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added rent subcategory: ${sub.name_en}`);
      }
    }
  }

  // Tax subcategories
  if (taxParent) {
    const taxSubcategories = [
      { name_en: 'Income Tax', name_de: 'Einkommensteuer', name_tr: 'Gelir Vergisi', display_order: 1 },
      { name_en: 'Property Tax', name_de: 'Grundsteuer', name_tr: 'Emlak Vergisi', display_order: 2 },
      { name_en: 'Sales Tax', name_de: 'Umsatzsteuer', name_tr: 'Satış Vergisi', display_order: 3 },
      { name_en: 'Other', name_de: 'Sonstiges', name_tr: 'Diğer', display_order: 4 }
    ];

    for (const sub of taxSubcategories) {
      const existing = await knex('expense_categories')
        .where('name_en', sub.name_en)
        .where('parent_category_id', taxParent.id)
        .first();
      
      if (!existing) {
        await knex('expense_categories').insert({
          name_en: sub.name_en,
          name_de: sub.name_de,
          name_tr: sub.name_tr,
          is_default: false,
          category_type: 'tax',
          has_custom_form: false,
          requires_asset_link: sub.name_en === 'Property Tax',
          requires_member_link: false,
          allows_multiple_members: false,
          parent_category_id: taxParent.id,
          display_order: sub.display_order
        });
        console.log(`  ✓ Added tax subcategory: ${sub.name_en}`);
      }
    }
  }

  const subcategoryCount = await knex('expense_categories')
    .whereNotNull('parent_category_id')
    .count('* as count')
    .first();
  console.log(`✅ Total expense subcategories: ${subcategoryCount?.count || 0}`);
}
