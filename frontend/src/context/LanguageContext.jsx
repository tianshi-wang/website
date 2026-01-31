import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../i18n/translations';

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    // Get saved language or default to 'zh' (Chinese)
    const saved = localStorage.getItem('language');
    return saved || 'zh';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  const t = (key) => {
    const keys = key.split('.');
    let value = translations[language];

    for (const k of keys) {
      if (value && value[k] !== undefined) {
        value = value[k];
      } else {
        // Fallback to English
        value = translations['en'];
        for (const k2 of keys) {
          if (value && value[k2] !== undefined) {
            value = value[k2];
          } else {
            return key; // Return key if not found
          }
        }
        break;
      }
    }

    return value;
  };

  // Template function for strings with placeholders
  const tf = (key, params = {}) => {
    let text = t(key);
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, v);
    });
    return text;
  };

  const toggleLanguage = () => {
    setLanguage(prev => prev === 'en' ? 'zh' : 'en');
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t, tf }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
