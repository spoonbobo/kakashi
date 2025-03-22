import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import Backend from 'i18next-http-backend';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translation files
import enTranslation from './locales/en.json';
import zhTranslation from './locales/zh-HK.json';
import zhCNTranslation from './locales/zh-CN.json';
import thTranslation from './locales/th.json';
import jaTranslation from './locales/ja.json';
import koTranslation from './locales/ko.json';
import viTranslation from './locales/vi.json';

// Configure i18next
i18n
  .use(Backend) // loads translations from server
  .use(LanguageDetector) // detects user language
  .use(initReactI18next) // passes i18n down to react-i18next
  .init({
    resources: {
      en: {
        translation: enTranslation
      },
      zh: {
        translation: zhTranslation
      },
      zhCN: {
        translation: zhCNTranslation
      },
      th: {
        translation: thTranslation
      },
      ja: {
        translation: jaTranslation
      },
      ko: {
        translation: koTranslation
      },
      vi: {
        translation: viTranslation
      }
    },
    lng: 'zh', // default language
    fallbackLng: 'zh', // fallback language
    
    // Change debug to false to suppress warnings
    debug: false,
    
    // Add these options to handle missing keys more gracefully
    saveMissing: false,
    missingKeyHandler: () => {
      // Intentionally empty to suppress warnings
    },
    
    // Return the key itself when translation is missing
    returnNull: false,
    returnEmptyString: false,
    
    interpolation: {
      escapeValue: false // react already safes from xss
    },
    react: {
      useSuspense: false // This is important for Next.js
    }
  });

// Add this to suppress console warnings for missing keys
if (typeof window !== 'undefined') {
  const originalWarn = console.warn;
  console.warn = function(...args) {
    if (args.length > 0 && 
        typeof args[0] === 'string' && 
        args[0].includes('i18next::translator: missingKey')) {
      return;
    }
    return originalWarn.apply(console, args);
  };
}

export default i18n; 