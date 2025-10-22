import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useAchievements } from '../contexts/AchievementsContext';
import { Camera, Award, Star, Crown } from 'lucide-react';
import AchievementRequirements from '../components/AchievementRequirements';
import { supabase } from '../supabaseClient';

function Profile() {
  const { user } = useAuth();
  const { isPremium } = useSubscription();
  const { 
    achievements,
    userAchievements, 
    userTitles, 
    equippedTitle, 
    equipTitle, 
    unequipTitle,
    loading: achievementsLoading 
  } = useAchievements();
  
  const [name, setName] = useState('');
  const [occupation, setOccupation] = useState('');
  const [avatar, setAvatar] = useState<string | null>(null);
  
  const [isSaving, setIsSaving] = useState(false); // Переименовано для ясности
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [titles, setTitles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ИЗМЕНЕНИЕ: Упрощаем useEffect, убирая функции из зависимостей
  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user?.id) return;
      try {
        const { data, error } = await supabase
          .from('users')
          .select('name, avatar_url, occupation')
          .eq('user_id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') throw error;

        if (data) {
          setName(data.name || '');
          setOccupation(data.occupation || '');
          setAvatar(data.avatar_url);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setMessage({ type: 'error', text: 'Ошибка при загрузке профиля' });
      }
    };

    const fetchTitlesData = async () => {
      try {
        const { data, error } = await supabase.from('titles').select('*');
        if (error) throw error;
        setTitles(data || []);
      } catch (error) {
        console.error('Error fetching titles:', error);
      }
    };

    if (user?.id) {
      fetchProfileData();
      fetchTitlesData();
    }
  }, [user?.id]); // Зависимость только от user.id

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const ext = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${ext}`;
      await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true }); 
      
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      
      // Сразу обновляем аватар в базе данных
      await supabase.from('users').upsert({
        user_id: user.id,
        avatar_url: urlData.publicUrl,
        updated_at: new Date().toISOString()
      });

      setAvatar(urlData.publicUrl);
      setMessage({ type: 'success', text: 'Фото профиля обновлено!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при загрузке фото.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setIsSaving(true);
    setMessage(null);
    try {
      const updates = {
        user_id: user.id,
        name,
        occupation,
        // avatar_url обновляется отдельно в handleAvatarChange
        updated_at: new Date().toISOString(),
      };
      await supabase.from('users').upsert(updates);
      setMessage({ type: 'success', text: 'Профиль успешно обновлён!' });
    } catch (err) {
      setMessage({ type: 'error', text: 'Ошибка при обновлении профиля.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleToggle = async (titleId: string, isEquipped: boolean) => {
    setIsSaving(true);
    try {
      if (isEquipped) {
        await unequipTitle();
      } else {
        await equipTitle(titleId);
      }
      setMessage({ type: 'success', text: 'Титул обновлён' });
    } catch (err) {
      console.error('Error updating title:', err);
      setMessage({ type: 'error', text: 'Ошибка при обновлении титула' });
    } finally {
      setIsSaving(false);
    }
  };
  
  const getIconComponent = (iconName: string) => {
    switch (iconName) {
      case 'edit': return <Award className="text-blue-500" size={20} />;
      case 'message-circle': return <Award className="text-green-500" size={20} />;
      case 'thumbs-up': return <Award className="text-purple-500" size={20} />;
      case 'heart': return <Award className="text-red-500" size={20} />;
      case 'search': return <Award className="text-yellow-500" size={20} />;
      default: return <Award className="text-gray-500" size={20} />;
    }
  };

  const formatDate = (date: string) => new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
  
  // Упрощенная проверка загрузки. Показываем спиннер, если еще нет пользователя или грузятся достижения.
  if (!user || achievementsLoading) {
    return <div className="flex justify-center items-center h-screen"><div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div></div>;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex items-center space-x-3 mb-8">
        <h2 className="text-3xl font-bold text-green-800">Настройки профиля</h2>
        {isPremium && (
          <div className="flex items-center space-x-2 bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            <Crown size={16} />
            <span>Premium</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h3 className="text-xl font-semibold mb-6">Основная информация</h3>
          
          {message && (
            <div className={`mb-6 p-4 rounded-xl ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center">
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
                  {avatar ? (
                    <img src={avatar} alt="Аватар" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      <Camera size={40} />
                    </div>
                  )}
                </div>
                {isPremium && (
                  <div className="absolute -top-2 -right-2 bg-yellow-400 rounded-full p-2 shadow-md">
                    <Crown size={20} className="text-yellow-800" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-green-600 text-white p-3 rounded-full hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50"
                  disabled={isSaving}
                >
                  <Camera size={20} />
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                  disabled={isSaving}
                />
              </div>
              {equippedTitle && (
                <p className="text-purple-600 font-medium text-sm mt-2">
                  {equippedTitle.title.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={user.email ?? ''}
                disabled
                className="w-full p-3 border-2 border-gray-200 rounded-xl bg-gray-50 text-gray-600 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Имя пользователя</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Введите ваше имя"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Род деятельности</label>
              <input
                type="text"
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder="Например: Фермер, Садовод, Ботаник"
                className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-600 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 bg-green-600 text-white font-semibold rounded-xl hover:bg-green-700 transition-colors shadow-lg disabled:opacity-50"
            >
              {isSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </form>
        </div>

        <div className="space-y-8">
          {/* ... (остальной JSX остается без изменений) ... */}
           <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Прогресс достижений</h3>
              <AchievementRequirements
                achievements={achievements}
                titles={titles}
                userAchievements={userAchievements}
                userTitles={userTitles}
              />
            </div>
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">{userAchievements.length}</div>
                <div className="text-sm text-gray-600">Достижений получено</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-purple-600">{userTitles.length}</div>
                <div className="text-sm text-gray-600">Титулов разблокировано</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Star className="mr-2 text-purple-500" size={24} />
              Мои титулы ({userTitles.length})
            </h3>
            
            {userTitles.length > 0 ? (
              <div className="space-y-3">
                {userTitles.map((userTitle) => (
                  <div
                    key={userTitle.id}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${userTitle.equipped ? 'border-purple-500 bg-purple-50' : 'border-gray-200 bg-gray-50 hover:border-purple-300'}`}
                    onClick={() => !isSaving && handleTitleToggle(userTitle.title_id, userTitle.equipped)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{userTitle.title.name}</h4>
                        <p className="text-sm text-gray-600">{userTitle.title.description}</p>
                      </div>
                      {userTitle.equipped && <Star fill="currentColor" className="text-purple-500" size={20} />}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Титулы пока не получены</p>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-semibold mb-6 flex items-center">
              <Award className="mr-2 text-yellow-500" size={24} />
              Мои достижения ({userAchievements.length})
            </h3>
            
            {userAchievements.length > 0 ? (
              <div className="space-y-3">
                {userAchievements.map((userAchievement) => (
                  <div key={userAchievement.id} className="p-4 rounded-lg border border-gray-200 bg-gray-50">
                    <div className="flex items-start space-x-3">
                      {getIconComponent(userAchievement.achievement.icon_name)}
                      <div className="flex-1">
                        <h4 className="font-medium">{userAchievement.achievement.name}</h4>
                        <p className="text-sm text-gray-600 mb-1">{userAchievement.achievement.description}</p>
                        <p className="text-xs text-gray-500">Получено {formatDate(userAchievement.unlocked_at)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">Достижения пока не получены</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile;