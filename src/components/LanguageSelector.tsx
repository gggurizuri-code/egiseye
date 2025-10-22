import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';

const LanguageSelector = () => {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        className="flex items-center space-x-2 p-3 rounded-xl hover:bg-gray-100 transition-colors w-full"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Languages size={20} />
        <span>{t('language.select')}</span>
      </button>
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg py-2 z-20">
            <button
              onClick={() => changeLanguage('en')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
            >
              {t('language.en')}
            </button>
            <button
              onClick={() => changeLanguage('ru')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
            >
              {t('language.ru')}
            </button>
            <button
              onClick={() => changeLanguage('kk')}
              className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors"
            >
              {t('language.kk')}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default LanguageSelector;