import React from 'react';
import { useTranslation } from 'react-i18next';
import { Instagram } from 'lucide-react';

function About() {
  const { t } = useTranslation();
  
  return (
    <div className="p-3 sm:p-4 md:p-8 max-w-4xl mx-auto">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 sm:mb-8">{t('about.title')}</h2>
      
      <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6 mb-6 sm:mb-8">
        <div className="prose max-w-none">
          {/* This div will be populated with content later */}
          <div className="min-h-[150px] sm:min-h-[200px] bg-gray-50 rounded-lg p-4 text-gray-500 text-center flex items-center justify-center">
            <p className="text-sm sm:text-base">{t('about.content')}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-bold mb-4">{t('about.socialMedia')}</h3>
        <a
          href="https://www.instagram.com/adotpd.margulan"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-colors text-sm sm:text-base"
        >
          <Instagram size={20} className="sm:w-6 sm:h-6" />
          <span>{t('about.followInstagram')}</span>
        </a>
      </div>
    </div>
  );
}

export default About;