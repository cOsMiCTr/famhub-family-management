import { query } from '../config/database';
import bcrypt from 'bcryptjs';

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Create default admin user
    const adminEmail = 'onurbaki@me.com';
    const adminPassword = '1234';
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(adminPassword, saltRounds);

    // Check if admin already exists
    const existingAdmin = await query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    
    if (existingAdmin.rows.length === 0) {
      // Create admin user
      const adminResult = await query(
        `INSERT INTO users (email, password_hash, role, preferred_language, main_currency)
         VALUES ($1, $2, 'admin', 'en', 'USD')
         RETURNING id`,
        [adminEmail, passwordHash]
      );

      const adminId = adminResult.rows[0].id;
      console.log('✅ Admin user created:', adminEmail);

      // Create default household
      const householdResult = await query(
        `INSERT INTO households (name, created_by_admin_id)
         VALUES ($1, $2)
         RETURNING id`,
        ['Default Household', adminId]
      );

      const householdId = householdResult.rows[0].id;
      console.log('✅ Default household created');

      // Update admin user with household
      await query(
        'UPDATE users SET household_id = $1 WHERE id = $2',
        [householdId, adminId]
      );
    } else {
      console.log('ℹ️ Admin user already exists');
    }

    // Create default asset categories
    const assetCategories = [
      // Income categories
      { name_en: 'Salary', name_de: 'Gehalt', name_tr: 'Maaş', type: 'income', is_default: true },
      { name_en: 'Freelance', name_de: 'Freiberuflich', name_tr: 'Serbest Meslek', type: 'income', is_default: true },
      { name_en: 'Investment', name_de: 'Investition', name_tr: 'Yatırım', type: 'income', is_default: true },
      { name_en: 'Rental Income', name_de: 'Mieteinnahmen', name_tr: 'Kira Geliri', type: 'income', is_default: true },
      { name_en: 'Business', name_de: 'Geschäft', name_tr: 'İş', type: 'income', is_default: true },
      { name_en: 'Other Income', name_de: 'Sonstiges Einkommen', name_tr: 'Diğer Gelir', type: 'income', is_default: true },
      
      // Expense categories
      { name_en: 'Housing', name_de: 'Wohnen', name_tr: 'Konut', type: 'expense', is_default: true },
      { name_en: 'Food & Groceries', name_de: 'Lebensmittel', name_tr: 'Yiyecek ve Alışveriş', type: 'expense', is_default: true },
      { name_en: 'Transportation', name_de: 'Transport', name_tr: 'Ulaşım', type: 'expense', is_default: true },
      { name_en: 'Utilities', name_de: 'Nebenkosten', name_tr: 'Faturalar', type: 'expense', is_default: true },
      { name_en: 'Healthcare', name_de: 'Gesundheit', name_tr: 'Sağlık', type: 'expense', is_default: true },
      { name_en: 'Entertainment', name_de: 'Unterhaltung', name_tr: 'Eğlence', type: 'expense', is_default: true },
      { name_en: 'Education', name_de: 'Bildung', name_tr: 'Eğitim', type: 'expense', is_default: true },
      { name_en: 'Shopping', name_de: 'Einkaufen', name_tr: 'Alışveriş', type: 'expense', is_default: true },
      { name_en: 'Other Expenses', name_de: 'Sonstige Ausgaben', name_tr: 'Diğer Giderler', type: 'expense', is_default: true }
    ];

    for (const category of assetCategories) {
      const existingCategory = await query(
        'SELECT id FROM asset_categories WHERE name_en = $1 AND type = $2',
        [category.name_en, category.type]
      );

      if (existingCategory.rows.length === 0) {
        await query(
          `INSERT INTO asset_categories (name_en, name_de, name_tr, type, is_default)
           VALUES ($1, $2, $3, $4, $5)`,
          [category.name_en, category.name_de, category.name_tr, category.type, category.is_default]
        );
        console.log(`✅ Created asset category: ${category.name_en}`);
      }
    }

    // Create default contract categories
    const contractCategories = [
      { name_en: 'Insurance', name_de: 'Versicherung', name_tr: 'Sigorta', is_default: true },
      { name_en: 'Rental Agreement', name_de: 'Mietvertrag', name_tr: 'Kira Sözleşmesi', is_default: true },
      { name_en: 'Employment Contract', name_de: 'Arbeitsvertrag', name_tr: 'İş Sözleşmesi', is_default: true },
      { name_en: 'Utilities', name_de: 'Nebenkosten', name_tr: 'Faturalar', is_default: true },
      { name_en: 'Phone/Internet', name_de: 'Telefon/Internet', name_tr: 'Telefon/İnternet', is_default: true },
      { name_en: 'Subscription', name_de: 'Abonnement', name_tr: 'Abonelik', is_default: true },
      { name_en: 'Loan Agreement', name_de: 'Kreditvertrag', name_tr: 'Kredi Sözleşmesi', is_default: true },
      { name_en: 'Vehicle', name_de: 'Fahrzeug', name_tr: 'Araç', is_default: true },
      { name_en: 'Service Contract', name_de: 'Dienstvertrag', name_tr: 'Hizmet Sözleşmesi', is_default: true },
      { name_en: 'Other Contract', name_de: 'Sonstiger Vertrag', name_tr: 'Diğer Sözleşme', is_default: true }
    ];

    for (const category of contractCategories) {
      const existingCategory = await query(
        'SELECT id FROM contract_categories WHERE name_en = $1',
        [category.name_en]
      );

      if (existingCategory.rows.length === 0) {
        await query(
          `INSERT INTO contract_categories (name_en, name_de, name_tr, is_default)
           VALUES ($1, $2, $3, $4)`,
          [category.name_en, category.name_de, category.name_tr, category.is_default]
        );
        console.log(`✅ Created contract category: ${category.name_en}`);
      }
    }

    // Set initial exchange rates (fallback rates)
    const fallbackRates = [
      { from_currency: 'USD', to_currency: 'EUR', rate: 0.85 },
      { from_currency: 'EUR', to_currency: 'USD', rate: 1.18 },
      { from_currency: 'USD', to_currency: 'GBP', rate: 0.73 },
      { from_currency: 'GBP', to_currency: 'USD', rate: 1.37 },
      { from_currency: 'USD', to_currency: 'TRY', rate: 30.0 },
      { from_currency: 'TRY', to_currency: 'USD', rate: 0.033 },
      { from_currency: 'EUR', to_currency: 'GBP', rate: 0.86 },
      { from_currency: 'GBP', to_currency: 'EUR', rate: 1.16 },
      { from_currency: 'EUR', to_currency: 'TRY', rate: 35.3 },
      { from_currency: 'TRY', to_currency: 'EUR', rate: 0.028 },
      { from_currency: 'GBP', to_currency: 'TRY', rate: 41.1 },
      { from_currency: 'TRY', to_currency: 'GBP', rate: 0.024 },
      { from_currency: 'GOLD', to_currency: 'USD', rate: 2000 },
      { from_currency: 'USD', to_currency: 'GOLD', rate: 0.0005 },
      { from_currency: 'GOLD', to_currency: 'EUR', rate: 1700 },
      { from_currency: 'EUR', to_currency: 'GOLD', rate: 0.000588 },
      { from_currency: 'GOLD', to_currency: 'GBP', rate: 1460 },
      { from_currency: 'GBP', to_currency: 'GOLD', rate: 0.000685 },
      { from_currency: 'GOLD', to_currency: 'TRY', rate: 60000 },
      { from_currency: 'TRY', to_currency: 'GOLD', rate: 0.0000167 }
    ];

    for (const rate of fallbackRates) {
      await query(
        `INSERT INTO exchange_rates (from_currency, to_currency, rate, updated_at)
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (from_currency, to_currency)
         DO UPDATE SET rate = $3, updated_at = CURRENT_TIMESTAMP`,
        [rate.from_currency, rate.to_currency, rate.rate]
      );
    }

    console.log('✅ Exchange rates seeded');

    console.log('🎉 Database seeding completed successfully!');
    console.log('');
    console.log('📋 Default Admin Credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('');

  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase()
    .then(() => {
      console.log('✅ Seeding completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Seeding failed:', error);
      process.exit(1);
    });
}

export { seedDatabase };
