import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// API service for fetching translations
const fetchTranslations = async (language: string) => {
  try {
    const response = await fetch('/api/translations');
    if (!response.ok) {
      throw new Error('Failed to fetch translations');
    }
    const data = await response.json();
    
    // Check if the response has the expected structure
    if (!data.translations || !Array.isArray(data.translations)) {
      console.error('Invalid API response structure:', data);
      throw new Error('Invalid API response structure');
    }
    
    const translations = data.translations;
    
    // Convert flat translations to nested object
    const nestedTranslations: any = {};
    translations.forEach((translation: any) => {
      const keys = translation.translation_key.split('.');
      let current = nestedTranslations;
      
      // Navigate/create nested structure
      for (let i = 0; i < keys.length - 1; i++) {
        const key = keys[i];
        if (!current[key]) {
          current[key] = {};
        }
        current = current[key];
      }
      
      // Set the final value
      const finalKey = keys[keys.length - 1];
      current[finalKey] = translation[language] || translation.en;
    });
    
    return nestedTranslations;
  } catch (error) {
    console.error('Error fetching translations, falling back to static:', error);
    // Fallback to static translations
    const staticTranslation = await import(`./locales/${language}/translation.json`);
    return staticTranslation.default;
  }
};

// Get saved language from localStorage or user data
const getSavedLanguage = () => {
  // First check if user data is stored
  const storedUser = localStorage.getItem('user');
  if (storedUser) {
    try {
      const user = JSON.parse(storedUser);
      if (user.preferred_language) {
        return user.preferred_language;
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
    }
  }
  
  // Fallback to localStorage language setting
  const savedLanguage = localStorage.getItem('i18nextLng');
  if (savedLanguage && ['en', 'de', 'tr'].includes(savedLanguage)) {
    return savedLanguage;
  }
  
  // Default fallback
  return 'en';
};

// Initialize i18n with static translations first, then upgrade to dynamic
const initializeI18n = async () => {
  const currentLanguage = getSavedLanguage();
  
  // Always start with static translations for immediate loading
  const enTranslation = await import('./locales/en/translation.json');
  const deTranslation = await import('./locales/de/translation.json');
  const trTranslation = await import('./locales/tr/translation.json');

  const resources = {
    en: {
      translation: enTranslation.default
    },
    de: {
      translation: deTranslation.default
    },
    tr: {
      translation: trTranslation.default
    }
  };

  i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: currentLanguage,
      fallbackLng: 'en',
      
      interpolation: {
        escapeValue: false // react already does escaping
      }
    });

  console.log('✅ i18n initialized with static translations');

  // Try to upgrade to dynamic translations in the background
  try {
    const [enTranslations, deTranslations, trTranslations] = await Promise.all([
      fetchTranslations('en'),
      fetchTranslations('de'),
      fetchTranslations('tr')
    ]);

    // Update i18n resources with dynamic translations
    i18n.addResourceBundle('en', 'translation', enTranslations, true, true);
    i18n.addResourceBundle('de', 'translation', deTranslations, true, true);
    i18n.addResourceBundle('tr', 'translation', trTranslations, true, true);

    console.log('✅ i18n upgraded to dynamic translations');
  } catch (error) {
    console.log('ℹ️ Dynamic translations not available, using static translations');
  }
};

// Function to reload translations (call this after translation updates)
export const reloadTranslations = async () => {
  const currentLanguage = i18n.language;
  
  try {
    const [enTranslations, deTranslations, trTranslations] = await Promise.all([
      fetchTranslations('en'),
      fetchTranslations('de'),
      fetchTranslations('tr')
    ]);

    // Update i18n resources
    i18n.addResourceBundle('en', 'translation', enTranslations, true, true);
    i18n.addResourceBundle('de', 'translation', deTranslations, true, true);
    i18n.addResourceBundle('tr', 'translation', trTranslations, true, true);

    console.log('✅ Translations reloaded from database');
  } catch (error) {
    console.error('❌ Failed to reload translations:', error);
  }
};

// Initialize i18n
initializeI18n();

export default i18n;