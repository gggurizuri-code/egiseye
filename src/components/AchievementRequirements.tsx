import React, { useState } from 'react';
import { Info, X, Award, Star, Lock } from 'lucide-react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  required_action: string;
  required_count: number;
}

interface Title {
  id: string;
  name: string;
  description: string;
  required_achievement_id: string;
}

interface AchievementRequirementsProps {
  achievements: Achievement[];
  titles: Title[];
  userAchievements: any[];
  userTitles: any[];
}

const AchievementRequirements: React.FC<AchievementRequirementsProps> = ({
  achievements,
  titles,
  userAchievements,
  userTitles
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const getActionDescription = (action: string, count: number) => {
    switch (action) {
      case 'create_post':
        return `Создайте ${count} ${count === 1 ? 'пост' : count < 5 ? 'поста' : 'постов'}`;
      case 'create_comment':
        return `Оставьте ${count} ${count === 1 ? 'комментарий' : count < 5 ? 'комментария' : 'комментариев'}`;
      case 'receive_post_like':
        return `Получите ${count} ${count === 1 ? 'лайк' : count < 5 ? 'лайка' : 'лайков'} на постах`;
      case 'receive_comment_like':
        return `Получите ${count} ${count === 1 ? 'лайк' : count < 5 ? 'лайка' : 'лайков'} на комментариях`;
      case 'give_like':
        return `Поставьте ${count} ${count === 1 ? 'лайк' : count < 5 ? 'лайка' : 'лайков'}`;
      case 'scan_plant':
        return `Проведите ${count} ${count === 1 ? 'сканирование' : count < 5 ? 'сканирования' : 'сканирований'} растений`;
      case 'chatbot_message':
        return `Отправьте ${count} ${count === 1 ? 'сообщение' : count < 5 ? 'сообщения' : 'сообщений'} чат-боту`;
      case 'daily_login':
        return `Войдите в систему ${count} ${count === 1 ? 'день' : count < 5 ? 'дня' : 'дней'} подряд`;
      default:
        return `Выполните действие "${action}" ${count} раз`;
    }
  };

  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'edit': return <Award className="text-blue-500\" size={16} />;
      case 'message-circle': return <Award className="text-green-500" size={16} />;
      case 'thumbs-up': return <Award className="text-purple-500" size={16} />;
      case 'heart': return <Award className="text-red-500" size={16} />;
      case 'search': return <Award className="text-yellow-500" size={16} />;
      default: return <Award className="text-gray-500" size={16} />;
    }
  };

  const isAchievementUnlocked = (achievementId: string) => {
    return userAchievements.some(ua => ua.achievement_id === achievementId);
  };

  const isTitleUnlocked = (titleId: string) => {
    return userTitles.some(ut => ut.title_id === titleId);
  };

  const getRequiredAchievement = (titleRequiredAchievementId: string) => {
    return achievements.find(a => a.id === titleRequiredAchievementId);
  };

  const specialTitles = ['Толстый Алхимик', 'Токаев'];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm"
      >
        <Info size={16} />
        <span>Как получить достижения</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-2xl font-bold">Достижения и титулы</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Achievements Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Award className="mr-2 text-yellow-500" size={24} />
                  Достижения
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {achievements.map((achievement) => {
                    const isUnlocked = isAchievementUnlocked(achievement.id);
                    return (
                      <div
                        key={achievement.id}
                        className={`p-4 rounded-lg border ${
                          isUnlocked
                            ? 'border-green-500 bg-green-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {getIconComponent(achievement.icon_name)}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{achievement.name}</h4>
                              {isUnlocked && (
                                <Award className="text-green-500" size={16} />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {achievement.description}
                            </p>
                            <p className="text-xs text-blue-600 font-medium">
                              Требование: {getActionDescription(achievement.required_action, achievement.required_count)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Titles Section */}
              <div>
                <h3 className="text-xl font-semibold mb-4 flex items-center">
                  <Star className="mr-2 text-purple-500" size={24} />
                  Титулы
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {titles.map((title) => {
                    const isUnlocked = isTitleUnlocked(title.id);
                    const isSpecial = specialTitles.includes(title.name);
                    const requiredAchievement = title.required_achievement_id 
                      ? getRequiredAchievement(title.required_achievement_id)
                      : null;

                    return (
                      <div
                        key={title.id}
                        className={`p-4 rounded-lg border ${
                          isUnlocked
                            ? 'border-purple-500 bg-purple-50'
                            : isSpecial
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'border-gray-200 bg-gray-50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          {isSpecial ? (
                            <Star className="text-yellow-500\" size={16} />
                          ) : (
                            <Star className={isUnlocked ? "text-purple-500" : "text-gray-400"} size={16} />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-medium">{title.name}</h4>
                              {isUnlocked && (
                                <Star className="text-purple-500" size={16} />
                              )}
                              {isSpecial && !isUnlocked && (
                                <Lock className="text-yellow-500\" size={16} />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 mb-2">
                              {title.description}
                            </p>
                            {isSpecial ? (
                              <p className="text-xs text-yellow-600 font-medium">
                                Специальный титул - выдается администратором
                              </p>
                            ) : requiredAchievement ? (
                              <p className="text-xs text-blue-600 font-medium">
                                Требование: Получите достижение "{requiredAchievement.name}"
                              </p>
                            ) : (
                              <p className="text-xs text-blue-600 font-medium">
                                Требование: Выполните особые условия
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Tips Section */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Советы по получению достижений:</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Активно участвуйте в форуме - создавайте посты и комментарии</li>
                  <li>• Поддерживайте других пользователей лайками</li>
                  <li>• Используйте сканер растений для диагностики</li>
                  <li>• Общайтесь с AI консультантом для получения советов</li>
                  <li>• Заходите в приложение регулярно для получения достижений за активность</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AchievementRequirements;