import React from 'react';
import { Crown } from 'lucide-react';

// Интерфейс для данных автора, теперь используем subscription_tier_id как число
interface Author {
  name?: string;
  email?: string;
  avatar_url?: string;
  subscription_tier_id?: number; // Теперь это число (0 или 1)
}

// Интерфейс для титула остался прежним
interface EquippedTitle {
  title: {
    name: string;
  };
}

// Пропсы компонента
interface UserAvatarProps {
  author?: Author;
  equippedTitle?: EquippedTitle | null;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
  showTitle?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ 
  author, 
  equippedTitle, 
  size = 'md', 
  onClick,
  showTitle = true 
}) => {
  // Если автора нет, ничего не рендерим
  if (!author) {
    return null;
  }

  // Стили для разных размеров компонента
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16'
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-lg'
  };

  const crownSizeClasses = {
    sm: 12,
    md: 16,
    lg: 20
  };

  // Логика для получения инициалов из имени или email
  const getInitials = () => {
    if (author.name) {
      return author.name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    if (author.email) {
      return author.email[0].toUpperCase();
    }
    return '?';
  };

  // Проверяем, является ли пользователь Premium.
  // Мы договорились, что ID для 'premium' в нашей новой таблице subscription_tiers равен 1.
  const isPremium = author.subscription_tier_id === 1;

  return (
    <button
      onClick={onClick}
      disabled={!onClick} // Блокируем кнопку, если обработчик не передан
      className="flex items-center space-x-3 text-left disabled:cursor-default group"
    >
      <div className="relative flex-shrink-0">
        <div className={`${sizeClasses[size]} rounded-full overflow-hidden bg-green-100 flex items-center justify-center border-2 border-white shadow-sm`}>
          {author.avatar_url ? (
            <img 
              src={author.avatar_url} 
              alt={author.name || 'User Avatar'} 
              className="w-full h-full object-cover" 
            />
          ) : (
            <span className={`font-semibold text-green-700 ${textSizeClasses[size]}`}>
              {getInitials()}
            </span>
          )}
        </div>
        {isPremium && (
          <div className="absolute -top-1 -right-1 bg-yellow-400 rounded-full p-1 shadow-md">
            <Crown size={crownSizeClasses[size]} className="text-yellow-800" />
          </div>
        )}
      </div>
      <div className="flex flex-col">
        <span className="font-medium text-gray-800 group-hover:text-green-600 transition-colors">
          {author.name || author.email}
        </span>
        {showTitle && equippedTitle && (
          <span className="text-xs text-purple-600 font-medium">
            {equippedTitle.title.name}
          </span>
        )}
      </div>
    </button>
  );
};

export default UserAvatar;