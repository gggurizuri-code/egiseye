import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

// --- ИНТЕРФЕЙСЫ (остаются без изменений) ---
interface Achievement {
  id: string;
  name: string;
  description: string;
  icon_name: string;
  required_action: string;
  required_count: number;
}
interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  unlocked_at: string;
  progress: number;
  achievement: Achievement;
}
interface Title {
  id: string;
  name: string;
  description: string;
  required_achievement_id: string;
}
interface UserTitle {
  id: string;
  user_id: string;
  title_id: string;
  equipped: boolean;
  title: Title;
}
interface AchievementsContextType {
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  titles: Title[];
  userTitles: UserTitle[];
  equippedTitle: UserTitle | null;
  loading: boolean;
  grantAchievement: (achievementId: string) => Promise<void>;
  equipTitle: (titleId: string) => Promise<void>;
  unequipTitle: () => Promise<void>;
  getUserAchievements: (userId: string) => Promise<UserAchievement[]>;
  getUserTitles: (userId: string) => Promise<UserTitle[]>;
  refreshUserData: () => Promise<void>;
  checkAndGrantAchievements: () => Promise<void>;
  recordDailyLogin: () => Promise<void>;
}

const AchievementsContext = createContext<AchievementsContextType | undefined>(undefined);

export function AchievementsProvider({ children }: { children: React.ReactNode }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [userAchievements, setUserAchievements] = useState<UserAchievement[]>([]);
  const [titles, setTitles] = useState<Title[]>([]);
  const [userTitles, setUserTitles] = useState<UserTitle[]>([]);
  const [loading, setLoading] = useState(true); // Собственное состояние загрузки
  
  // Получаем user и, что самое важное, isLoading из AuthContext
  const { user, isLoading: isAuthLoading } = useAuth();

  const equippedTitle = userTitles.find(ut => ut.equipped) || null;

  // 1. Этот useEffect загружает статические данные (не зависящие от пользователя) один раз
  useEffect(() => {
    const fetchStaticData = async () => {
      const achievementsPromise = supabase.from('achievements').select('*');
      const titlesPromise = supabase.from('titles').select('*');
      const [achievementsResult, titlesResult] = await Promise.all([achievementsPromise, titlesPromise]);
      if (achievementsResult.data) setAchievements(achievementsResult.data);
      if (titlesResult.data) setTitles(titlesResult.data);
    };
    fetchStaticData();
  }, []);

  // 2. Этот useEffect загружает данные ПОЛЬЗОВАТЕЛЯ и ждет, пока AuthContext будет готов
  const refreshUserData = useCallback(async () => {
    if (!user?.id) return;
    
    setLoading(true);
    const userAchievementsPromise = supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', user.id);
    const userTitlesPromise = supabase.from('user_titles').select('*, title:titles(*)').eq('user_id', user.id);
    
    try {
      const [achievementsResult, titlesResult] = await Promise.all([userAchievementsPromise, userTitlesPromise]);
      if (achievementsResult.data) setUserAchievements(achievementsResult.data);
      if (titlesResult.data) setUserTitles(titlesResult.data);
    } catch (error) {
      console.error("Error refreshing user data:", error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    // Не начинаем загрузку, пока AuthContext не закончит
    if (isAuthLoading) {
      setLoading(true);
      return;
    }
    
    if (user?.id) {
      refreshUserData();
      // Записываем ежедневный вход
      supabase.rpc('record_daily_login', { p_user_id: user.id });
    } else {
      // Если пользователя нет, очищаем данные и выключаем загрузку
      setUserAchievements([]);
      setUserTitles([]);
      setLoading(false);
    }
  }, [user, isAuthLoading, refreshUserData]);

  const checkAndGrantAchievements = useCallback(async () => {
    if (!user?.id) return;
    try {
      await supabase.rpc('check_and_grant_achievements', { p_user_id: user.id });
      await supabase.rpc('check_and_grant_titles', { p_user_id: user.id });
      // После проверки достижений, обновляем данные пользователя
      await refreshUserData();
    } catch (error) {
      console.error('Error in checkAndGrantAchievements:', error);
    }
  }, [user?.id, refreshUserData]);

  const grantAchievement = async (achievementId: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase.from('user_achievements').insert({ user_id: user.id, achievement_id: achievementId });
      if (!error) await refreshUserData();
    } catch (err) {
      console.error("Error trying to grant achievement:", err);
    }
  };

  const equipTitle = async (titleId: string) => {
    if (!user?.id) return;
    await supabase.from('user_titles').update({ equipped: false }).eq('user_id', user.id);
    await supabase.from('user_titles').update({ equipped: true }).eq('user_id', user.id).eq('title_id', titleId);
    await fetchUserTitles(user.id);
  };

  const unequipTitle = async () => {
    if (!user?.id) return;
    await supabase.from('user_titles').update({ equipped: false }).eq('user_id', user.id);
    await fetchUserTitles(user.id);
  };
  
  const getUserAchievements = async (userId: string): Promise<UserAchievement[]> => {
    const { data, error } = await supabase.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', userId);
    if (error) { console.error(error); return []; }
    return data || [];
  };

  const getUserTitles = async (userId: string): Promise<UserTitle[]> => {
    const { data, error } = await supabase.from('user_titles').select('*, title:titles(*)').eq('user_id', userId);
    if (error) { console.error(error); return []; }
    return data || [];
  };

  return (
    <AchievementsContext.Provider value={{
      achievements,
      userAchievements,
      titles,
      userTitles,
      equippedTitle,
      loading,
      grantAchievement,
      equipTitle,
      unequipTitle,
      getUserAchievements,
      getUserTitles,
      refreshUserData,
      checkAndGrantAchievements,
      recordDailyLogin: () => user?.id ? recordDailyLogin(user.id) : Promise.resolve(), // Обеспечиваем тот же интерфейс
    }}>
      {children}
    </AchievementsContext.Provider>
  );
}

export function useAchievements() {
  const context = useContext(AchievementsContext);
  if (!context) {
    throw new Error('useAchievements must be used within an AchievementsProvider');
  }
  return context;
}