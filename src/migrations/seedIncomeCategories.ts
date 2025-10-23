import { query } from '../config/database';

const seedIncomeCategories = async () => {
  try {
    console.log('🌱 Starting income categories seeding...');

    // Clear existing income categories
    await query('DELETE FROM income_categories');

    // Define predefined income categories
    const categories = [
      { name_en: 'Salary', name_de: 'Gehalt', name_tr: 'Maaş', is_default: true },
      { name_en: 'Freelance/Side Income', name_de: 'Freiberuflich/Nebeneinkommen', name_tr: 'Serbest/Yan Gelir', is_default: true },
      { name_en: 'Investment Returns', name_de: 'Investitionsrenditen', name_tr: 'Yatırım Getirileri', is_default: true },
      { name_en: 'Rental Income', name_de: 'Mieteinnahmen', name_tr: 'Kira Geliri', is_default: true },
      { name_en: 'Pension', name_de: 'Rente', name_tr: 'Emekli Maaşı', is_default: true },
      { name_en: 'Social Benefits', name_de: 'Sozialleistungen', name_tr: 'Sosyal Yardımlar', is_default: true },
      { name_en: 'Business Income', name_de: 'Geschäftseinkommen', name_tr: 'İş Geliri', is_default: true },
      { name_en: 'Bonus', name_de: 'Bonus', name_tr: 'Prim', is_default: true },
      { name_en: 'Gift/Inheritance', name_de: 'Geschenk/Erbschaft', name_tr: 'Hediye/Miras', is_default: true },
      { name_en: 'Other', name_de: 'Sonstige', name_tr: 'Diğer', is_default: true }
    ];

    // Insert categories
    for (const category of categories) {
      await query(
        `INSERT INTO income_categories (name_en, name_de, name_tr, is_default) 
         VALUES ($1, $2, $3, $4)`,
        [category.name_en, category.name_de, category.name_tr, category.is_default]
      );
    }

    // Get count of inserted categories
    const countResult = await query('SELECT COUNT(*) as count FROM income_categories');
    const count = countResult.rows[0].count;

    console.log(`✅ Successfully seeded ${count} income categories`);
  } catch (error) {
    console.error('❌ Error seeding income categories:', error);
    throw error;
  }
};

export default seedIncomeCategories;

