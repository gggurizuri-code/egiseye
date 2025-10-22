import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CloudRain,
  Loader,
  MapPin,
  Thermometer,
  Wind,
  Droplets,
  Sun,
  Moon,
  Search,
  CloudSnow,
  Zap,
  Star,
  Umbrella,
  Calendar,
  Crown,
  Lock,
} from 'lucide-react';
import { useSubscription } from '../contexts/SubscriptionContext';

interface WeatherData {
  location: { name: string; region: string; country: string };
  current: {
    temp_c: number;
    feelslike_c: number;
    humidity: number;
    wind_kph: number;
    gust_kph: number;
    precip_mm: number;
    uv: number;
    is_day: number;
    cloud: number;
    vis_km: number;
    condition: { text: string; icon: string };
  };
}

interface ForecastData {
  location: { name: string; region: string; country: string };
  current: WeatherData['current'];
  forecast: {
    forecastday: Array<{
      date: string;
      day: {
        maxtemp_c: number;
        mintemp_c: number;
        avgtemp_c: number;
        maxwind_kph: number;
        totalprecip_mm: number;
        avghumidity: number;
        uv: number;
        condition: { text: string; icon: string };
      };
      hour: Array<{
        time: string;
        temp_c: number;
        humidity: number;
        wind_kph: number;
        precip_mm: number;
        condition: { text: string; icon: string };
      }>;
    }>;
  };
}

interface PlantCareRecommendation {
  icon: React.ReactNode;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'watering' | 'protection' | 'maintenance' | 'general';
}

function Weather() {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [cityInput, setCityInput] = useState<string>('');
  const [showCityInput, setShowCityInput] = useState<boolean>(false);
  const [suggestions, setSuggestions] = useState<
    Array<{ name: string; region: string; country: string; lat: number; lon: number }>
  >([]);

  // Погода по координатам
  const fetchWeatherByCoords = async (lat: number, lon: number) => {
    try {
      setLoading(true);
      
      if (isPremium) {
        // Premium пользователи получают 3-дневный прогноз
        const res = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=34c898805a4d4091b7a205512251305&q=${lat},${lon}&days=3&lang=ru`
        );
        if (!res.ok) throw new Error('Ошибка при получении данных о погоде');
        const data = await res.json();
        setForecast(data);
        setWeather({
          location: data.location,
          current: data.current
        });
      } else {
        // Обычные пользователи получают только текущую погоду
        const res = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=34c898805a4d4091b7a205512251305&q=${lat},${lon}&lang=ru`
        );
        if (!res.ok) throw new Error('Ошибка при получении данных о погоде');
        const data = await res.json();
        setWeather(data);
        setForecast(null);
      }
      
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  // Погода по городу
  const fetchWeatherByCity = async (city: string) => {
    try {
      setLoading(true);
      
      if (isPremium) {
        const res = await fetch(
          `https://api.weatherapi.com/v1/forecast.json?key=34c898805a4d4091b7a205512251305&q=${encodeURIComponent(city)}&days=3&lang=ru`
        );
        if (!res.ok) throw new Error('Город не найден');
        const data = await res.json();
        setForecast(data);
        setWeather({
          location: data.location,
          current: data.current
        });
      } else {
        const res = await fetch(
          `https://api.weatherapi.com/v1/current.json?key=34c898805a4d4091b7a205512251305&q=${encodeURIComponent(city)}&lang=ru`
        );
        if (!res.ok) throw new Error('Город не найден');
        const data = await res.json();
        setWeather(data);
        setForecast(null);
      }
      
      setShowCityInput(false);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
      setWeather(null);
      setForecast(null);
    } finally {
      setLoading(false);
    }
  };

  // Геолокация
  const requestLocation = () => {
    setShowCityInput(false); 
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      setError('Ваш браузер не поддерживает геолокацию');
      setLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.error(err);
        setError('Не удалось получить местоположение');
        setShowCityInput(true);
        setLoading(false);
      }
    );
  };

  // Подсказки по городу
  const fetchCitySuggestions = async (q: string) => {
    if (!q) return setSuggestions([]);
    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/search.json?key=34c898805a4d4091b7a205512251305&q=${encodeURIComponent(q)}`
      );
      if (!res.ok) throw new Error();
      setSuggestions(await res.json());
    } catch {
      setSuggestions([]);
    }
  };
  
  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const q = e.target.value;
    setCityInput(q);
    setError(null);
    setShowCityInput(true);
    fetchCitySuggestions(q);
  };
  
  const selectCity = (lat: number, lon: number, name: string) => {
    setCityInput(name);
    setSuggestions([]);
    setShowCityInput(false);
    fetchWeatherByCoords(lat, lon);
  };

  useEffect(requestLocation, [isPremium]);

  const generateRecommendations = (w: WeatherData, forecastData?: ForecastData): PlantCareRecommendation[] => {
    const recs: PlantCareRecommendation[] = [];

    // Температура
    if (w.current.temp_c < 5) {
      recs.push({
        icon: <Thermometer className="text-blue-500" />,
        title: 'Защита от холода',
        description:
          'Перенесите растения в тёплое помещение или укройте агротекстилем. Сократите полив и проверьте корни на загнивание.',
        priority: 'high',
        category: 'protection',
      });
    } else if (w.current.temp_c > 30) {
      recs.push({
        icon: <Thermometer className="text-red-500" />,
        title: 'Защита от жары',
        description:
          'Создайте тень и увлажните листья. Поливайте чаще, небольшими порциями, чтобы не залить корни.',
        priority: 'high',
        category: 'watering',
      });
    }

    // Прогнозные рекомендации для Premium пользователей
    if (isPremium && forecastData) {
      const tomorrow = forecastData.forecast.forecastday[1];
      const dayAfterTomorrow = forecastData.forecast.forecastday[2];
      
      // Предупреждение о резком изменении температуры
      if (Math.abs(tomorrow.day.avgtemp_c - w.current.temp_c) > 10) {
        recs.push({
          icon: <Zap className="text-orange-500" />,
          title: 'Резкое изменение температуры завтра',
          description: `Завтра ожидается ${tomorrow.day.avgtemp_c > w.current.temp_c ? 'потепление' : 'похолодание'} до ${Math.round(tomorrow.day.avgtemp_c)}°C. Подготовьте растения заранее.`,
          priority: 'high',
          category: 'protection',
        });
      }
      
      // Предупреждение о дожде
      if (tomorrow.day.totalprecip_mm > 5) {
        recs.push({
          icon: <CloudRain className="text-blue-500" />,
          title: 'Дождь завтра',
          description: `Завтра ожидается ${Math.round(tomorrow.day.totalprecip_mm)}мм осадков. Отложите полив и проверьте дренаж.`,
          priority: 'medium',
          category: 'watering',
        });
      }
      
      // Планирование полива на основе прогноза
      const totalRain = tomorrow.day.totalprecip_mm + dayAfterTomorrow.day.totalprecip_mm;
      if (totalRain < 2 && w.current.precip_mm < 1) {
        recs.push({
          icon: <Droplets className="text-yellow-500" />,
          title: 'Планируйте полив',
          description: 'В ближайшие 3 дня дождя не ожидается. Увеличьте частоту полива.',
          priority: 'medium',
          category: 'watering',
        });
      }
    }

    // Остальные рекомендации остаются прежними...
    if (w.current.feelslike_c - w.current.temp_c >= 5) {
      recs.push({
        icon: <Zap className="text-yellow-500" />,
        title: 'Ощущается намного жарче',
        description:
          'Учитывайте факторы влажности и ветра — создайте затенение и опрыскивайте ночью.',
        priority: 'medium',
        category: 'watering',
      });
    }
    
    if (w.current.temp_c - w.current.feelslike_c >= 5) {
      recs.push({
        icon: <CloudSnow className="text-blue-700" />,
        title: 'Ощущается холоднее',
        description: 'Защитите от ветра, укройте низкорослые растения.',
        priority: 'medium',
        category: 'protection',
      });
    }

    if (w.current.humidity < 40) {
      recs.push({
        icon: <Droplets className="text-blue-500" />,
        title: 'Низкая влажность',
        description:
          'Используйте увлажнитель воздуха и опрыскивания. Поставьте поддоны с водой рядом с растениями.',
        priority: 'medium',
        category: 'maintenance',
      });
    } else if (w.current.humidity > 80) {
      recs.push({
        icon: <Droplets className="text-yellow-500" />,
        title: 'Высокая влажность',
        description:
          'Проверьте вентиляцию и избегайте переувлажнения почвы, чтобы не было грибка.',
        priority: 'medium',
        category: 'maintenance',
      });
    }

    if (w.current.wind_kph > 20) {
      recs.push({
        icon: <Wind className="text-gray-500" />,
        title: 'Сильный ветер',
        description:
          'Перенесите горшки в укрытие и проверьте опоры у высоких растений.',
        priority: 'high',
        category: 'protection',
      });
    }
    
    if (w.current.gust_kph > 35) {
      recs.push({
        icon: <Star className="text-yellow-600" />,
        title: 'Сильные порывы ветра',
        description: 'Укрепите конструкции теплицы и подвязки стеблей.',
        priority: 'high',
        category: 'protection',
      });
    }

    if (w.current.precip_mm > 0) {
      recs.push({
        icon: <CloudRain className="text-blue-500" />,
        title: 'Идут осадки',
        description:
          'Отложите ручной полив и убедитесь, что дренаж работает исправно.',
        priority: 'medium',
        category: 'watering',
      });
    }
    
    if (w.current.vis_km < 2) {
      recs.push({
        icon: <Umbrella className="text-gray-700" />,
        title: 'Плохая видимость',
        description:
          'Регулярно протирайте листья от росы и конденсата.',
        priority: 'low',
        category: 'general',
      });
    }

    if (w.current.uv > 7) {
      recs.push({
        icon: <Sun className="text-orange-500" />,
        title: 'Высокий УФ‑индекс',
        description:
          'Укройте растения агросеткой с 50–70% затенения в часы 11:00–15:00.',
        priority: 'high',
        category: 'protection',
      });
    } else if (w.current.uv < 2 && w.current.is_day === 1) {
      recs.push({
        icon: <Sun className="text-yellow-300" />,
        title: 'Низкий УФ‑индекс',
        description:
          'Можно временно убрать тень и дать больше света растениям.',
        priority: 'low',
        category: 'general',
      });
    }

    if (w.current.is_day === 0) {
      recs.push({
        icon: <Moon className="text-purple-500" />,
        title: 'Ночной уход',
        description:
          'Лучшее время для опрыскивания и ухода без лишнего испарения.',
        priority: 'low',
        category: 'general',
      });
    }

    if (w.current.cloud > 75) {
      recs.push({
        icon: <CloudRain className="text-gray-500" />,
        title: 'Сильная облачность',
        description:
          'Уменьшите полив на 10–20%, так как испарение замедлено.',
        priority: 'medium',
        category: 'watering',
      });
    } else if (w.current.cloud < 25) {
      recs.push({
        icon: <Sun className="text-yellow-600" />,
        title: 'Ясная погода',
        description:
          'Проверьте влажность почвы чаще — солнце усиливает испарение.',
        priority: 'medium',
        category: 'watering',
      });
    }

    return recs;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Сегодня';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Завтра';
    } else {
      return date.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'short' });
    }
  };

  if (loading && !weather) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="animate-spin text-green-600" size={32} />
        <span className="ml-2">Загрузка погоды…</span>
      </div>
    );
  }

  const renderCityInput = () => (
    <div className="relative max-w-md mx-auto mb-6">
      <form
        onSubmit={e => {
          e.preventDefault();
          if (cityInput.trim()) fetchWeatherByCity(cityInput.trim());
        }}
      >
        <div className="relative">
          <input
            type="text"
            value={cityInput}
            onChange={handleCityChange}
            onFocus={() => { setShowCityInput(true); setError(null); }}
            placeholder="Введите город"
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          <Search className="absolute right-3 top-3 text-gray-500" size={16} />
        </div>
      </form>
      {suggestions.length > 0 && (
        <ul className="absolute z-10 w-full mt-1 border rounded-lg bg-white shadow-lg max-h-60 overflow-auto">
          {suggestions.map((c, i) => (
            <li
              key={`${c.name}-${i}`}
              onClick={() => selectCity(c.lat, c.lon, c.name)}
              className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
            >
              {c.name}, {c.region}, {c.country}
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (showCityInput) {
    return (
      <div className="p-6">
        {error && (
          <div className="bg-red-50 text-red-700 p-4 rounded-lg max-w-md mx-auto mb-4">
            {error}
          </div>
        )}
        {renderCityInput()}
        <div className="text-center mt-4">
          <button
            onClick={requestLocation}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            Попробовать геолокацию снова
          </button>
        </div>
      </div>
    );
  }

  if (!weather) return null;

  const recs = generateRecommendations(weather, forecast || undefined);

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-6xl mx-auto space-y-4 sm:space-y-6">
      {/* Заголовок с индикатором подписки */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center space-y-3 sm:space-y-0">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800">{t('weather.title')}</h1>
          {isPremium && (
            <div className="flex items-center space-x-1 sm:space-x-2 bg-yellow-100 text-yellow-800 px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium">
              <Crown size={12} className="sm:w-4 sm:h-4" />
              <span>Premium</span>
            </div>
          )}
        </div>
        <button
          onClick={() => setShowCityInput(true)}
          className="text-blue-600 hover:underline flex items-center space-x-1 transition-colors text-sm sm:text-base self-start sm:self-auto"
        >
          <Search size={14} className="sm:w-4 sm:h-4" />
          <span>{t('weather.changeCity')}</span>
        </button>
      </div>

      {/* Блок текущей погоды */}
      <div className="bg-gradient-to-br from-green-400 to-blue-500 rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 text-white">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 sm:mb-6 space-y-4 sm:space-y-0">
          <div>
            <div className="flex items-center space-x-1 sm:space-x-2">
              <MapPin size={18} className="sm:w-6 sm:h-6" />
              <h2 className="text-lg sm:text-xl md:text-2xl font-bold">{weather.location.name}</h2>
            </div>
            <p className="text-xs sm:text-sm opacity-75 mt-1">
              {weather.location.region}, {weather.location.country}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <div className="text-4xl sm:text-5xl md:text-6xl font-bold">{Math.round(weather.current.temp_c)}°C</div>
            <p className="text-sm sm:text-base md:text-lg">
              {t('common.feelsLike')} {Math.round(weather.current.feelslike_c)}°C
            </p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
          <div className="bg-white/20 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="flex items-center space-x-3 sm:space-x-4">
              <img
                src={`https:${weather.current.condition.icon}`}
                alt={weather.current.condition.text}
                className="w-12 h-12 sm:w-16 sm:h-16"
              />
              <div>
                <h3 className="text-base sm:text-lg md:text-xl font-semibold">{t('weather.currentConditions')}</h3>
                <p className="text-sm sm:text-base">{weather.current.condition.text}</p>
              </div>
            </div>
          </div>
          <div className="bg-white/20 backdrop-blur-lg rounded-lg sm:rounded-xl p-3 sm:p-4">
            <div className="space-y-1 sm:space-y-2 text-sm sm:text-base">
              <div className="flex justify-between items-center">
                <span>{t('weather.humidity')}:</span>
                <span className="font-semibold">{weather.current.humidity}%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('weather.wind')}:</span>
                <span className="font-semibold">{Math.round(weather.current.wind_kph)} км/ч</span>
              </div>
              <div className="flex justify-between items-center">
                <span>{t('weather.precipitation')}:</span>
                <span className="font-semibold">{weather.current.precip_mm} мм</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3-дневный прогноз для Premium пользователей */}
      {isPremium && forecast ? (
        <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 mb-4 sm:mb-6">
            <Calendar size={20} className="text-green-600 sm:w-6 sm:h-6" />
            <h3 className="text-lg sm:text-xl font-semibold">{t('weather.premiumForecast')}</h3>
            <div className="flex items-center space-x-1 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
              <Crown size={10} className="sm:w-3 sm:h-3" />
              <span>Premium</span>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            {forecast.forecast.forecastday.map((day, index) => (
              <div key={day.date} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="text-center">
                  <h4 className="font-semibold text-gray-800 mb-2">
                    {formatDate(day.date)}
                  </h4>
                  <img
                    src={`https:${day.day.condition.icon}`}
                    alt={day.day.condition.text}
                    className="w-12 h-12 mx-auto mb-2"
                  />
                  <p className="text-xs sm:text-sm text-gray-600 mb-3">{day.day.condition.text}</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>{t('weather.max')}:</span>
                      <span className="font-semibold">{Math.round(day.day.maxtemp_c)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('weather.min')}:</span>
                      <span className="font-semibold">{Math.round(day.day.mintemp_c)}°C</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('weather.precipitation')}:</span>
                      <span className="font-semibold">{Math.round(day.day.totalprecip_mm)} мм</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t('weather.humidity')}:</span>
                      <span className="font-semibold">{day.day.avghumidity}%</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : !isPremium ? (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg sm:rounded-xl p-4 sm:p-6">
          <div className="flex items-center space-x-2 sm:space-x-3 mb-4">
            <Lock size={20} className="text-yellow-600 sm:w-6 sm:h-6" />
            <h3 className="text-lg sm:text-xl font-semibold text-yellow-800">{t('weather.premiumForecast')}</h3>
          </div>
          <p className="text-yellow-700 mb-4 text-sm sm:text-base">
            {t('pricing.features.weatherForecast')}
          </p>
          <div className="bg-yellow-100 rounded-lg p-3 sm:p-4">
            <h4 className="font-semibold text-yellow-800 mb-2 text-sm sm:text-base">{t('weather.premiumFeatures')}:</h4>
            <ul className="text-xs sm:text-sm text-yellow-700 space-y-1">
              <li>• {t('pricing.features.weatherForecast')}</li>
              <li>• {t('weather.smartRecommendations')}</li>
              <li>• {t('pricing.features.advancedRecommendations')}</li>
              <li>• {t('weather.unlimited')}</li>
            </ul>
          </div>
        </div>
      ) : null}

      {/* Рекомендации */}
      <div className="bg-white rounded-lg sm:rounded-xl shadow-lg p-4 sm:p-6">
        <h3 className="text-lg sm:text-xl font-semibold mb-4 sm:mb-6">
          {t('weather.recommendations')}
          {isPremium && (
            <span className="block sm:inline sm:ml-2 text-xs sm:text-sm text-green-600 bg-green-50 px-2 py-1 rounded-full mt-2 sm:mt-0">
              {t('pricing.features.advancedRecommendations')}
            </span>
          )}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          {recs.map((rec, i) => (
            <div
              key={i}
              className={`p-4 rounded-lg border-l-4 ${
                rec.priority === 'high'
                  ? 'border-red-500 bg-red-50'
                  : rec.priority === 'medium'
                  ? 'border-yellow-500 bg-yellow-50'
                  : 'border-blue-500 bg-blue-50'
              }`}
            >
              <div className="flex items-start space-x-2 sm:space-x-3">
                <div className="mt-1">{rec.icon}</div>
                <div>
                  <h4 className="font-semibold text-sm sm:text-base">{rec.title}</h4>
                  <p className="text-xs sm:text-sm text-gray-600 mt-1">
                    {rec.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Weather;