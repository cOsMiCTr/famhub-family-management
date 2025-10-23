import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Import translation files
import enTranslation from './locales/en/translation.json';
import deTranslation from './locales/de/translation.json';
import trTranslation from './locales/tr/translation.json';

const resources = {
  en: {
    translation: enTranslation
  },
  de: {
    translation: deTranslation
  },
  tr: {
    translation: trTranslation
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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getSavedLanguage(), // Use saved language or default to 'en'
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false // react already does escaping
    }
  });

export default i18n;
