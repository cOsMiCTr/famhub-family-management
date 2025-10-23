import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface Translation {
  translation_key: string;
  en: string;
  de: string;
  tr: string;
}

async function syncTranslationsToJson() {
  try {
    console.log('🔄 Syncing translations from database to JSON files...');
    
    // Get all translations from database
    const result = await pool.query(`
      SELECT translation_key, en, de, tr 
      FROM translations 
      ORDER BY translation_key
    `);
    
    const translations: Translation[] = result.rows;
    console.log(`📊 Found ${translations.length} translations in database`);
    
    // Group translations by language
    const enTranslations: any = {};
    const deTranslations: any = {};
    const trTranslations: any = {};
    
    translations.forEach(translation => {
      const keys = translation.translation_key.split('.');
      let currentEn = enTranslations;
      let currentDe = deTranslations;
      let currentTr = trTranslations;
      
      // Navigate/create nested structure
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!currentEn[key]) currentEn[key] = {};
        if (!currentDe[key]) currentDe[key] = {};
        if (!currentTr[key]) currentTr[key] = {};
        currentEn = currentEn[key];
        currentDe = currentDe[key];
        currentTr = currentTr[key];
      }
      
      // Set the final value
      const finalKey = keys[keys.length - 1];
      currentEn[finalKey] = translation.en;
      currentDe[finalKey] = translation.de;
      currentTr[finalKey] = translation.tr;
    });
    
    // Write JSON files
    const localesDir = path.join(__dirname, '../../client/src/locales');
    
    // Ensure directories exist
    fs.mkdirSync(path.join(localesDir, 'en'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'de'), { recursive: true });
    fs.mkdirSync(path.join(localesDir, 'tr'), { recursive: true });
    
    // Write translation files
    fs.writeFileSync(
      path.join(localesDir, 'en/translation.json'),
      JSON.stringify(enTranslations, null, 2)
    );
    
    fs.writeFileSync(
      path.join(localesDir, 'de/translation.json'),
      JSON.stringify(deTranslations, null, 2)
    );
    
    fs.writeFileSync(
      path.join(localesDir, 'tr/translation.json'),
      JSON.stringify(trTranslations, null, 2)
    );
    
    console.log('✅ Successfully synced translations to JSON files');
    console.log(`📁 English: ${Object.keys(enTranslations).length} categories`);
    console.log(`📁 German: ${Object.keys(deTranslations).length} categories`);
    console.log(`📁 Turkish: ${Object.keys(trTranslations).length} categories`);
    
  } catch (error) {
    console.error('❌ Error syncing translations:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  syncTranslationsToJson()
    .then(() => {
      console.log('🎉 Translation sync completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Translation sync failed:', error);
      process.exit(1);
    });
}

export default syncTranslationsToJson;
