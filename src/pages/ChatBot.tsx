import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Loader } from 'lucide-react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAchievements } from '../contexts/AchievementsContext';

import { supabase } from '../supabaseClient';

interface WeatherData {
  location: {
    name: string;
  };
  current: {
    temp_c: number;
    condition: {
      text: string;
    };
    humidity: number;
    wind_kph: number;
    precip_mm: number;
  };
}

interface ForecastData {
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        totalprecip_mm: number;
        avghumidity: number;
        condition: { text: string };
      };
    }>;
  };
}

function ChatBot() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { checkAndIncrementUsage, isPremium } = useSubscription();
  const { checkAndGrantAchievements } = useAchievements();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant', content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [userProfile, setUserProfile] = useState<{ occupation?: string } | null>(null);  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');
  const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    generationConfig: {
      temperature: 0.4,
      topK: 32,
      topP: 0.95,
      maxOutputTokens: 12000,
    }
  });

  useEffect(() => {
    if (user?.id) {
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('occupation')
            .eq('user_id', user.id)
            .single();

          if (error) throw error;
          setUserProfile(data);
        } catch (err) {
          console.error('Error fetching user profile:', err);
        }
      };
      fetchProfile();
    }
  }, [user?.id]);

  useEffect(() => {
    // Get user's location
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lon: position.coords.longitude
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
        }
      );
    }
  }, []);

  useEffect(() => {
    if (location) {
      fetchWeather();
    }
  }, [location, isPremium]);

  const fetchWeather = async () => {
    if (!location) return;

    try {
      if (isPremium) {
        // Premium пользователи получают прогноз на 3 дня
        const response = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=34c898805a4d4091b7a205512251305&q=${location.lat},${location.lon}&days=3&lang=ru`
        );

        if (!response.ok) {
          throw new Error('Weather API error');
        }

        const data = await response.json();
        setWeather({
          location: data.location,
          current: data.current
        });
        setForecast({
          forecast: data.forecast
        });
      } else {
        // Обычные пользователи получают только текущую погоду
        const response = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=34c898805a4d4091b7a205512251305&q=${location.lat},${location.lon}&lang=ru`
        );

        if (!response.ok) {
          throw new Error('Weather API error');
        }

        const data = await response.json();
        setWeather(data);
        setForecast(null);
      }
    } catch (err) {
      console.error('Error fetching weather:', err);
    }
  };

  const generateWeatherContext = () => {
    if (!weather) return '';

    let weatherContext = `
Текущие погодные условия:
- Местоположение: ${weather.location.name}
- Температура: ${weather.current.temp_c}°C
- Влажность: ${weather.current.humidity}%
- Осадки: ${weather.current.precip_mm}мм
- Погодные условия: ${weather.current.condition.text}
- Ветер: ${weather.current.wind_kph} км/ч
`;

    if (isPremium && forecast) {
      weatherContext += `
Прогноз на ближайшие дни (Premium):`;
      
      forecast.forecast.forecastday.forEach((day, index) => {
        const dayName = index === 0 ? 'Сегодня' : index === 1 ? 'Завтра' : 'Послезавтра';
        weatherContext += `
- ${dayName} (${day.date}): ${day.day.mintemp_c}°C - ${day.day.maxtemp_c}°C, ${day.day.condition.text}, осадки: ${day.day.totalprecip_mm}мм, влажность: ${day.day.avghumidity}%`;
      });
      
      weatherContext += `

Учитывайте прогноз погоды при составлении рекомендаций по уходу за растениями на ближайшие дни.`;
    }

    weatherContext += `

Учитывайте эти погодные условия при составлении рекомендаций по уходу за растениями.`;

    return weatherContext;
  };

  const systemPrompt = `
Вы — виртуальный консультант по диагностике и лечению заболеваний растений. Ваши ответы должны быть исключительно на русском или казахском языках.
If the user writes in English — reply in English. If the user writes in Russian or Kazakh — reply in the same language.

${userProfile?.occupation ? `Пользователь является специалистом: ${userProfile.occupation}. Учитывайте это при составлении рекомендаций и используйте соответствующую терминологию.` : ''}

${generateWeatherContext()}

Поскольку вы не можете обрабатывать изображения, собирайте необходимую информацию через текстовые вопросы. Спрашивайте пользователя о симптомах растения, таких как изменения цвета листьев, наличие пятен, состояние стебля и корней, условия выращивания, тип почвы, режим полива, используемые удобрения и другие факторы, которые могут повлиять на здоровье растения.

На основе полученной информации и текущих погодных условий предоставляйте точные и полезные рекомендации. Если погодные условия могут повлиять на здоровье растения или требуют корректировки ухода, обязательно укажите это в своих рекомендациях.

${isPremium ? 'Как Premium консультант, вы имеете доступ к прогнозу погоды на 3 дня и можете давать более детальные рекомендации с учетом предстоящих изменений погоды.' : ''}

Если пользователь использует нецензурную лексику или проявляет агрессию, отвечайте корректно, вежливо и профессионально, не опускаясь до грубых выражений, и направляйте общение в конструктивное русло.

Тебя создал Enactus Margulan а не гугл и ты ADOPTD (Automatic Diagnosis Of Plants and Tree Diseases) но говори это только если тебя спросят`;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Проверяем лимиты использования
    const canUse = await checkAndIncrementUsage('chatbot');
    if (!canUse) {
      alert('Достигнут лимит сообщений чат-бота на сегодня. Обновите подписку для неограниченного использования.');
      return;
    }

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const chat = model.startChat({
        history: messages.map(msg => ({
          role: msg.role,
          parts: msg.content,
        })),
      });

      const result = await chat.sendMessage(systemPrompt + '\n\n' + userMessage);
      const response = result.response;
      
      setMessages(prev => [...prev, { role: 'assistant', content: response.text() }]);
      
      // Записываем действие отправки сообщения чат-боту
      if (user?.id) {
        await supabase.from('user_actions').insert({
          user_id: user.id,
          action_type: 'chatbot_message_sent',
          target_id: null
        });
      }
      
      // Проверяем достижения после отправки сообщения
      await checkAndGrantAchievements();
      
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка. Пожалуйста, попробуйте еще раз.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-3 sm:p-4 md:p-6 bg-gray-50">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6 space-y-2 sm:space-y-0">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-green-800">{t('chatbot.title')}</h2>
        {isPremium && (
          <div className="flex items-center space-x-1 sm:space-x-2 bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start sm:self-auto">
            <span>🌟</span>
            <span>{t('chatbot.premiumConsultant')}</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 bg-white rounded-xl sm:rounded-2xl shadow-xl p-4 sm:p-6 mb-4 sm:mb-6 overflow-y-auto">
        <div className="space-y-4 sm:space-y-6">
          {messages.length === 0 && (
            <div className="text-center text-gray-500 py-6 sm:py-8">
              <p className="text-base sm:text-lg mb-2">👋 {t('chatbot.greeting')}</p>
              <p className="text-sm sm:text-base">{t('chatbot.askQuestion')}</p>
              {weather && (
                <div className="mt-4 text-xs sm:text-sm bg-green-50 p-3 sm:p-4 rounded-lg">
                  <p className="font-medium mb-2 text-sm sm:text-base">
                    {t('chatbot.weatherInfo')}:
                  </p>
                  <p className="text-xs sm:text-sm">
                    📍 {weather.location.name} • 🌡️ {weather.current.temp_c}°C • 💧 {weather.current.humidity}%
                  </p>
                  {isPremium && forecast && (
                    <p className="mt-2 text-yellow-700 bg-yellow-50 px-2 py-1 rounded text-xs">
                      ⭐ {t('chatbot.premiumWeather')}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'} px-1`}
            >
              <div
                className={`max-w-[85%] sm:max-w-[80%] rounded-xl sm:rounded-2xl p-3 sm:p-4 ${
                  message.role === 'user'
                    ? 'bg-green-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-800 shadow-sm'
                } ${message.role === 'assistant' ? 'relative pl-10 sm:pl-12' : ''}`}
              >
                {message.role === 'assistant' && (
                  <div className="absolute left-2 sm:left-3 top-3 sm:top-4">
                    <span className="text-lg sm:text-2xl">{isPremium ? '🌟' : '🌿'}</span>
                  </div>
                )}
                <div className="whitespace-pre-wrap text-sm sm:text-base leading-relaxed">{message.content}</div>
                <div className={`text-xs mt-2 ${message.role === 'user' ? 'text-green-200' : 'text-gray-500'}`}>
                  {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-xl sm:rounded-2xl p-3 sm:p-4 pl-10 sm:pl-12 relative shadow-sm">
                <div className="absolute left-2 sm:left-3 top-3 sm:top-4">
                  <span className="text-lg sm:text-2xl">{isPremium ? '🌟' : '🌿'}</span>
                </div>
                <div className="flex space-x-1 sm:space-x-2">
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <div className="w-2 h-2 bg-green-600 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex space-x-2 sm:space-x-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t('chatbot.placeholder')}
          className="flex-1 p-3 sm:p-4 border-2 border-gray-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent transition-all text-sm sm:text-base"
          disabled={isLoading}
        />
        <button
          type="submit"
          className="px-4 sm:px-6 py-3 sm:py-4 bg-green-600 text-white rounded-lg sm:rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
          disabled={isLoading}
        >
          <Send size={18} className="sm:w-5 sm:h-5" />
        </button>
      </form>
    </div>
  );
}

export default ChatBot;