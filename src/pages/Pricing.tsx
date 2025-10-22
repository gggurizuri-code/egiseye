import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Crown, Cloud } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

function Pricing() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { isPremium } = useSubscription();

  const handleSubscribe = async () => {
    // Здесь будет ваша будущая интеграция со Stripe
    alert('Интеграция со Stripe в разработке!');
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-extrabold text-gray-900 mb-4">{t('pricing.title')}</h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Выберите план, который подходит именно вам и вашим растениям.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Free Plan */}
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
            <h3 className="text-2xl font-bold text-gray-800 mb-4">{t('pricing.freePlan')}</h3>
            <p className="text-4xl font-bold text-gray-900 mb-6">{t('pricing.free')}</p>
            
            <ul className="space-y-4 mb-8 text-gray-600">
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.scanLimit', { count: 7 })}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.chatbotLimit', { count: 10 })}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.forum')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.reminders')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>Текущая погода</span>
              </li>
            </ul>

            {user && !isPremium && (
              <div className="text-center text-green-700 bg-green-50 font-medium p-3 rounded-lg">
                {t('pricing.currentPlan')}
              </div>
            )}
          </div>

          {/* Premium Plan */}
          <div className="bg-white rounded-2xl shadow-xl p-8 border-2 border-green-500 relative transform scale-105">
            <div className="absolute -top-4 right-6 bg-green-500 text-white px-4 py-1.5 rounded-full text-sm font-bold shadow-lg flex items-center space-x-1">
              <Crown size={14} />
              <span>{t('pricing.recommended')}</span>
            </div>
            
            <div className="flex items-center space-x-2 mb-4">
              <h3 className="text-2xl font-bold text-green-600">{t('pricing.premiumPlan')}</h3>
              <Crown className="text-yellow-500" size={24} />
            </div>
            <p className="text-4xl font-bold text-gray-900 mb-6">
              $4.99<span className="text-base font-medium text-gray-500"> / {t('pricing.month')}</span>
            </p>
            
            <ul className="space-y-4 mb-8 text-gray-600">
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span className="font-semibold text-gray-800">{t('pricing.features.unlimitedScans')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span className="font-semibold text-gray-800">{t('pricing.features.unlimitedChatbot')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.forum')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.reminders')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-green-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span>{t('pricing.features.prioritySupport')}</span>
              </li>
              <li className="flex items-start">
                <Check className="text-yellow-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <div className="flex items-center space-x-2">
                  <Cloud className="text-blue-500" size={16} />
                  <span className="font-semibold text-blue-700">{t('pricing.features.weatherForecast')}</span>
                </div>
              </li>
              <li className="flex items-start">
                <Check className="text-yellow-500 mr-3 flex-shrink-0 mt-1" size={20} />
                <span className="font-semibold text-blue-700">{t('pricing.features.advancedRecommendations')}</span>
              </li>
            </ul>

            <div className="h-14">
              {user ? (
                isPremium ? (
                  <div className="text-center text-green-700 bg-green-50 font-medium p-3 rounded-lg flex items-center justify-center space-x-2">
                    <Crown className="text-yellow-500" size={16} />
                    <span>{t('pricing.currentPlan')}</span>
                  </div>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-all transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
                  >
                    <Crown size={16} />
                    <span>{t('pricing.subscribe')}</span>
                  </button>
                )
              ) : (
                <p className="text-center text-gray-600 pt-3">
                  {t('pricing.loginToSubscribe')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Дополнительная информация о Premium возможностях */}
        <div className="mt-16 bg-gradient-to-r from-blue-50 to-green-50 rounded-2xl p-8">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center space-x-2 mb-4">
              <Cloud className="text-blue-500" size={32} />
              <Crown className="text-yellow-500" size={24} />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Premium погодные возможности
            </h3>
            <p className="text-gray-600">
              Получите максимум от ухода за растениями с расширенными погодными данными
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-blue-500 mb-3">
                <Cloud size={24} />
              </div>
              <h4 className="font-semibold mb-2">3-дневный прогноз</h4>
              <p className="text-sm text-gray-600">
                Планируйте уход за растениями заранее с точным прогнозом погоды
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-green-500 mb-3">
                <Check size={24} />
              </div>
              <h4 className="font-semibold mb-2">Умные рекомендации</h4>
              <p className="text-sm text-gray-600">
                AI консультант учитывает прогноз для более точных советов
              </p>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="text-yellow-500 mb-3">
                <Crown size={24} />
              </div>
              <h4 className="font-semibold mb-2">Безлимит</h4>
              <p className="text-sm text-gray-600">
                Сканируйте, идентифицируйте и общайтесь с ИИ безлимитно
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Pricing;