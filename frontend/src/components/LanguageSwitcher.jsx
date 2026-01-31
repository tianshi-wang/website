import { useLanguage } from '../context/LanguageContext';

export default function LanguageSwitcher() {
  const { language, toggleLanguage } = useLanguage();

  return (
    <button className="language-switcher" onClick={toggleLanguage}>
      {language === 'en' ? '中文' : 'EN'}
    </button>
  );
}
