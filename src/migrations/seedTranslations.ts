import { query } from '../config/database';
import fs from 'fs';
import path from 'path';

interface TranslationData {
  [key: string]: {
    en: string;
    de: string;
    tr: string;
  };
}

const seedTranslations = async () => {
  try {
    console.log('🌱 Starting translation seeding...');

    // Read translation files
    const enPath = path.join(__dirname, '../../client/src/locales/en/translation.json');
    const dePath = path.join(__dirname, '../../client/src/locales/de/translation.json');
    const trPath = path.join(__dirname, '../../client/src/locales/tr/translation.json');

    const enData: TranslationData = JSON.parse(fs.readFileSync(enPath, 'utf8'));
    const deData: TranslationData = JSON.parse(fs.readFileSync(dePath, 'utf8'));
    const trData: TranslationData = JSON.parse(fs.readFileSync(trPath, 'utf8'));

    // Clear existing translations
    await query('DELETE FROM translations');

    // Flatten nested objects and insert into database
    const insertTranslation = async (key: string, category: string, en: string, de: string, tr: string) => {
      await query(
        `INSERT INTO translations (translation_key, category, en, de, tr) 
         VALUES ($1, $2, $3, $4, $5) 
         ON CONFLICT (translation_key) DO UPDATE SET 
         category = EXCLUDED.category, 
         en = EXCLUDED.en, 
         de = EXCLUDED.de, 
         tr = EXCLUDED.tr, 
         updated_at = CURRENT_TIMESTAMP`,
        [key, category, en, de, tr]
      );
    };

    // Process nested translation objects
    const processTranslations = async (obj: any, prefix: string = '', category: string = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null) {
          // Recursively process nested objects
          const newCategory = category || key;
          await processTranslations(value, fullKey, newCategory);
        } else if (typeof value === 'string') {
          // Insert translation
          const enValue = enData[prefix]?.[key] || value;
          const deValue = deData[prefix]?.[key] || enValue;
          const trValue = trData[prefix]?.[key] || enValue;
          
          await insertTranslation(fullKey, category, enValue, deValue, trValue);
        }
      }
    };

    // Process each category
    for (const [category, translations] of Object.entries(enData)) {
      await processTranslations(translations, '', category);
    }

    // Get count of inserted translations
    const countResult = await query('SELECT COUNT(*) as count FROM translations');
    const count = countResult.rows[0].count;

    console.log(`✅ Successfully seeded ${count} translations`);
    console.log('📊 Translation categories:');
    
    const categoriesResult = await query('SELECT DISTINCT category FROM translations ORDER BY category');
    categoriesResult.rows.forEach(row => {
      console.log(`   - ${row.category}`);
    });

  } catch (error) {
    console.error('❌ Error seeding translations:', error);
    throw error;
  }
};

// Run if called directly
if (require.main === module) {
  seedTranslations()
    .then(() => {
      console.log('🎉 Translation seeding completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Translation seeding failed:', error);
      process.exit(1);
    });
}

export default seedTranslations;
