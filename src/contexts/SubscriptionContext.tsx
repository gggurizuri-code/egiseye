import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { supabase } from '../supabaseClient';

// --- ИНТЕРФЕЙСЫ ---
interface UsageLimits {
  scansCount: number;
  chatbotMessagesCount: number;
  date: string;
}

interface SubscriptionContextType {
  tierId: number;
  isPremium: boolean;
  usageLimits: UsageLimits | null;
  isLoading: boolean;
  canUseScanner: boolean;
  canUseChatbot: boolean;
  checkAndIncrementUsage: (action: 'scan' | 'chatbot') => Promise<boolean>;
  refreshUsage: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// --- ЛИМИТЫ ДЛЯ FREE-ПОДПИСКИ ---
const FREE_TIER_LIMITS = {
  scans: 7,
  chatbotMessages: 10,
};

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [tierId, setTierId] = useState<number>(0);
  const [usageLimits, setUsageLimits] = useState<UsageLimits | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // --- ИСПРАВЛЕННАЯ И СТАБИЛИЗИРОВАННАЯ ЛОГИКА ---
  
  const fetchSubscriptionData = useCallback(async (userId: string) => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const { data, error } = await supabase
        .from('users')
        .select(`subscription_tier_id, usage_limits ( scans_count, chatbot_messages_count, date )`)
        .eq('user_id', userId)
        .eq('usage_limits.date', today)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;

      setTierId(data?.subscription_tier_id ?? 0);
      const todaysUsage = data?.usage_limits[0];
      setUsageLimits(todaysUsage ? {
        scansCount: todaysUsage.scans_count,
        chatbotMessagesCount: todaysUsage.chatbot_messages_count,
        date: todaysUsage.date,
      } : { scansCount: 0, chatbotMessagesCount: 0, date: today });

    } catch (err) {
      console.error('Error fetching subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // <-- Пустой массив зависимостей делает эту функцию стабильной

  // Этот useEffect теперь реагирует только на ID пользователя
  useEffect(() => {
    // Ждем, пока авторизация завершится
    if (isAuthLoading) return;

    if (user?.id) {
      fetchSubscriptionData(user.id);
    } else {
      // Если пользователя нет, сбрасываем состояние
      setTierId(0);
      setUsageLimits(null);
      setIsLoading(false);
    }
  }, [user?.id, isAuthLoading, fetchSubscriptionData]);

  // --- ВЫЧИСЛЯЕМЫЕ ЗНАЧЕНИЯ ---
  const isPremium = tierId === 1;
  const canUseScanner = isPremium || (usageLimits?.scansCount ?? 0) < FREE_TIER_LIMITS.scans;
  const canUseChatbot = isPremium || (usageLimits?.chatbotMessagesCount ?? 0) < FREE_TIER_LIMITS.chatbotMessages;
  
  // --- ОСНОВНАЯ ФУНКЦИЯ ---
  const checkAndIncrementUsage = useCallback(async (action: 'scan' | 'chatbot'): Promise<boolean> => {
    if (!user?.id) return false;
    
    // Premium-пользователи имеют безлимит, но мы все равно можем отслеживать их использование
    if (isPremium) {
      // Отправляем RPC для инкремента и не ждем ответа, чтобы не блокировать UI
      supabase.rpc('increment_usage_limit', {
        p_user_id: user.id,
        p_date: new Date().toISOString().slice(0, 10),
        p_column_name: action === 'scan' ? 'scans_count' : 'chatbot_messages_count'
      }).then(({ error }) => {
        if (error) console.error('Error incrementing usage for premium:', error);
      });
      return true;
    }
    
    const canPerformAction = action === 'scan' ? canUseScanner : canUseChatbot;
    if (!canPerformAction) {
      console.log(`Usage limit reached for action: ${action}`);
      return false;
    }

    try {
      const { error } = await supabase.rpc('increment_usage_limit', {
        p_user_id: user.id,
        p_date: new Date().toISOString().slice(0, 10),
        p_column_name: action === 'scan' ? 'scans_count' : 'chatbot_messages_count'
      });
      if (error) throw error;
      
      // Оптимистично обновляем UI немедленно, не дожидаясь полного refetch
      setUsageLimits(prev => {
        const currentCount = action === 'scan' ? prev?.scansCount ?? 0 : prev?.chatbotMessagesCount ?? 0;
        return {
          ...prev!,
          [action === 'scan' ? 'scansCount' : 'chatbotMessagesCount']: currentCount + 1,
        };
      });
      return true;

    } catch (err) {
      console.error('Error in checkAndIncrementUsage:', err);
      return false;
    }
  }, [user?.id, isPremium, canUseScanner, canUseChatbot]);

  return (
    <SubscriptionContext.Provider value={{
      tierId,
      isPremium,
      usageLimits,
      isLoading,
      canUseScanner,
      canUseChatbot,
      checkAndIncrementUsage,
      refreshUsage: () => user?.id ? fetchSubscriptionData(user.id) : Promise.resolve(),
    }}>
      {/* Рендерим дочерние элементы только после первоначальной загрузки авторизации */}
      {!isAuthLoading && children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error('useSubscription must be used within SubscriptionProvider');
  return ctx;
}