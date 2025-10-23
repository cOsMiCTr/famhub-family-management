const fs = require('fs');
const path = require('path');

// Read database translations
const dbTranslations = fs.readFileSync('db_translations.txt', 'utf8');
const lines = dbTranslations.split('\n').filter(line => line.trim() && !line.includes('translation_key'));

// Parse database translations
const dbData = {};
lines.forEach(line => {
  const parts = line.split('|').map(p => p.trim());
  if (parts.length >= 4) {
    const key = parts[0];
    const en = parts[1];
    const de = parts[2];
    const tr = parts[3];
    dbData[key] = { en, de, tr };
  }
});

// Read frontend JSON files
const enJson = JSON.parse(fs.readFileSync('client/src/locales/en/translation.json', 'utf8'));
const deJson = JSON.parse(fs.readFileSync('client/src/locales/de/translation.json', 'utf8'));
const trJson = JSON.parse(fs.readFileSync('client/src/locales/tr/translation.json', 'utf8'));

// Convert JSON to flat structure
function flattenJson(obj, prefix = '') {
  const result = {};
  for (const key in obj) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      Object.assign(result, flattenJson(obj[key], newKey));
    } else {
      result[newKey] = obj[key];
    }
  }
  return result;
}

const enFlat = flattenJson(enJson);
const deFlat = flattenJson(deJson);
const trFlat = flattenJson(trJson);

console.log('🔍 Checking for translation mismatches...\n');

let mismatches = 0;

// Check each database translation
for (const key in dbData) {
  const db = dbData[key];
  
  // Check English
  if (enFlat[key] && enFlat[key] !== db.en) {
    console.log(`❌ EN MISMATCH: ${key}`);
    console.log(`   Database: "${db.en}"`);
    console.log(`   Frontend: "${enFlat[key]}"\n`);
    mismatches++;
  }
  
  // Check German
  if (deFlat[key] && deFlat[key] !== db.de) {
    console.log(`❌ DE MISMATCH: ${key}`);
    console.log(`   Database: "${db.de}"`);
    console.log(`   Frontend: "${deFlat[key]}"\n`);
    mismatches++;
  }
  
  // Check Turkish
  if (trFlat[key] && trFlat[key] !== db.tr) {
    console.log(`❌ TR MISMATCH: ${key}`);
    console.log(`   Database: "${db.tr}"`);
    console.log(`   Frontend: "${trFlat[key]}"\n`);
    mismatches++;
  }
}

// Check for missing keys in frontend
console.log('🔍 Checking for missing keys in frontend...\n');

for (const key in dbData) {
  if (!enFlat[key]) {
    console.log(`❌ MISSING EN: ${key} - "${dbData[key].en}"`);
    mismatches++;
  }
  if (!deFlat[key]) {
    console.log(`❌ MISSING DE: ${key} - "${dbData[key].de}"`);
    mismatches++;
  }
  if (!trFlat[key]) {
    console.log(`❌ MISSING TR: ${key} - "${dbData[key].tr}"`);
    mismatches++;
  }
}

if (mismatches === 0) {
  console.log('✅ No mismatches found! All translations are properly synced.');
} else {
  console.log(`\n📊 Found ${mismatches} mismatches total.`);
}
