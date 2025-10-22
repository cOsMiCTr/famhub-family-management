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

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en', // default language
    fallbackLng: 'en',
    
    interpolation: {
      escapeValue: false // react already does escaping
    }
  });

export default i18n;
