import React, { useState, useEffect, useMemo } from 'react';
import { X, Award, Crown, Star } from 'lucide-react';
import { useAchievements } from '../contexts/AchievementsContext';

// --- ИНТЕРФЕЙСЫ ---
// Указываем правильные типы для большей надежности
interface UserProfile {
  name: string;
  email: string;
  avatar_url?: string;
  created_at: string;
  subscription_tier_id?: number; // Теперь это число
  user_id?: string;
}

interface UserAchievement {
  id: string;
  achievement: {
    name: string;
    description: string;
    icon_name: string;
  };
  unlocked_at: string;
}

interface UserTitle {
  id: string;
  equipped: boolean;
  title: {
    name: string;
    description: string;
  };
}

interface UserProfileModalProps {
  profile: UserProfile;
  onClose: () => void;
}

// --- КОМПОНЕНТ ---
const UserProfileModal: React.FC<UserProfileModalProps> = ({ profile, onClose }) => {
  const { getUserAchievements, getUserTitles } = useAchievements();
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [userTitles, setUserTitles] = useState<UserTitle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Эта функция будет вызвана только если есть user_id
    const fetchUserData = async (userId: string) => {
      setLoading(true);
      try {
        // Загружаем данные параллельно для скорости
        const [achievementsData, titlesData] = await Promise.all([
          getUserAchievements(userId),
          getUserTitles(userId)
        ]);
        setUserAchievements(achievementsData);
        setUserTitles(titlesData);
      } catch (error) {
        console.error('Error fetching user data in modal:', error);
      } finally {
        setLoading(false);
      }
    };

    if (profile.user_id) {
      fetchUserData(profile.user_id);
    } else {
      setLoading(false); // Если ID нет, загружать нечего
    }
  }, [profile.user_id, getUserAchievements, getUserTitles]);

  // --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ И ПЕРЕМЕННЫЕ ---
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getIconComponent = (iconName: string) => {
    // Убираем лишние обратные слеши, которые могли вызывать ошибки
    switch (iconName) {
      case 'edit': return <Award className="text-blue-500" size={20} />;
      case 'message-circle': return <Award className="text-green-500" size={20} />;
      case 'thumbs-up': return <Award className="text-purple-500" size={20} />;
      case 'heart': return <Award className="text-red-500" size={20} />;
      case 'search': return <Award className="text-yellow-500" size={20} />;
      default: return <Award className="text-gray-500" size={20} />;
    }
  };

  // Проверяем, является ли пользователь Premium (ID = 1)
  const isPremium = profile.subscription_tier_id === 1;

  // Используем useMemo для кеширования результата, чтобы он не пересчитывался при каждом рендере
  const equippedTitle = useMemo(() => userTitles.find(ut => ut.equipped), [userTitles]);

  return (
    // Оверлей для модального окна
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose} // Закрытие по клику на оверлей
    >
      {/* Контейнер модального окна */}
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()} // Предотвращаем закрытие по клику на само окно
      >
        {/* Шапка модального окна */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-lg border-b p-5 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-800">Профиль пользователя</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-800 transition-colors rounded-full p-1"
          >
            <X size={24} />
          </button>
        </div>

        {/* Основной контент с прокруткой */}
        <div className="overflow-y-auto p-6">
          {/* Информация о пользователе */}
          <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6 mb-8">
            <div className="relative flex-shrink-0">
              <div className="w-24 h-24 rounded-full overflow-hidden bg-green-100 flex items-center justify-center border-2 border-white shadow-lg">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-green-700 font-semibold">
                    {profile.name?.[0] || profile.email?.[0] || '?'}
                  </span>
                )}
              </div>
              {isPremium && (
                <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-md">
                  <Crown size={18} className="text-yellow-800" />
                </div>
              )}
            </div>
            <div className="text-center sm:text-left">
              <div className="flex items-center justify-center sm:justify-start space-x-2">
                <h3 className="text-2xl font-bold text-gray-900">{profile.name || 'Пользователь'}</h3>
                {isPremium && (
                  <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-full text-xs font-semibold">
                    Premium
                  </span>
                )}
              </div>
              <p className="text-gray-600">{profile.email}</p>
              {equippedTitle && (
                <p className="text-purple-600 font-medium text-sm mt-1.5 bg-purple-50 px-2 py-1 rounded-md inline-block">
                  <Star size={12} className="inline-block mr-1" /> {equippedTitle.title.name}
                </p>
              )}
              <p className="text-sm text-gray-500 mt-2">На форуме с {formatDate(profile.created_at)}</p>
            </div>
          </div>

          {/* Титулы и достижения */}
          {loading ? (
            <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div></div>
          ) : (
            <div className="space-y-8">
              {/* Титулы */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center text-gray-700"><Star className="mr-2 text-purple-500" size={20} />Титулы ({userTitles.length})</h4>
                {userTitles.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userTitles.map((userTitle) => (
                      <div key={userTitle.id} className={`p-3 rounded-lg border-2 ${userTitle.equipped ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h5 className="font-medium text-gray-800">{userTitle.title.name}</h5>
                            <p className="text-sm text-gray-600">{userTitle.title.description}</p>
                          </div>
                          {userTitle.equipped && <Star fill="currentColor" className="text-purple-500" size={16} />}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-gray-500 italic">У этого пользователя еще нет титулов.</p>)}
              </div>

              {/* Достижения */}
              <div>
                <h4 className="text-lg font-semibold mb-3 flex items-center text-gray-700"><Award className="mr-2 text-yellow-500" size={20} />Достижения ({userAchievements.length})</h4>
                {userAchievements.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {userAchievements.map((userAchievement) => (
                      <div key={userAchievement.id} className="p-3 rounded-lg border border-gray-200 bg-gray-50">
                        <div className="flex items-start space-x-3">
                          {getIconComponent(userAchievement.achievement.icon_name)}
                          <div className="flex-1">
                            <h5 className="font-medium text-gray-800">{userAchievement.achievement.name}</h5>
                            <p className="text-sm text-gray-600 mb-1">{userAchievement.achievement.description}</p>
                            <p className="text-xs text-gray-500">Получено: {formatDate(userAchievement.unlocked_at)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (<p className="text-gray-500 italic">У этого пользователя еще нет достижений.</p>)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserProfileModal;