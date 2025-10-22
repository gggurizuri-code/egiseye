// src/contexts/ReminderContext.tsx

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useAuth }      from './AuthContext';
import { useNotifications } from './NotificationContext';

import { supabase } from '../supabaseClient';

interface Reminder {
  id: string;
  reminder_text: string;
  scheduled_for: string;
  completed: boolean;
  diagnosis_text: string;
}

interface ReminderContextType {
  reminders: Reminder[];
  createReminder: (text: string, diagnosisText: string, delayDays: number) => Promise<void>;
  markReminderAsComplete: (id: string) => Promise<void>;
  loading: boolean;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export function ReminderProvider({ children }: { children: React.ReactNode }) {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { sendNotification } = useNotifications();

  // Загрузка напоминаний при изменении пользователя
  useEffect(() => {
    if (user?.id) {
      fetchReminders();
    } else {
      setReminders([]);
      setLoading(false);
    }
  }, [user?.id]);

  // Эффект: проверяем дедлайны и отправляем уведомления
  useEffect(() => {
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      return;
    }
    const interval = setInterval(() => {
      const now = Date.now();
      reminders.forEach(rem => {
        const scheduled = new Date(rem.scheduled_for).getTime();
        // Если дедлайн наступил в пределах последней минуты и ещё не выполнено
        if (!rem.completed && Math.abs(now - scheduled) < 60_000) {
          sendNotification('Напоминание', {
            body: rem.reminder_text,
            tag: rem.id,
            renotify: false,
          });
        }
      });
    }, 30_000); // проверяем каждые 30 сек

    return () => clearInterval(interval);
  }, [reminders, sendNotification]);

  const fetchReminders = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user!.id)
        .order('scheduled_for', { ascending: true });

      if (error) throw error;
      setReminders(data || []);
    } catch (err) {
      console.error('Error fetching reminders:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createReminder = useCallback(async (text: string, diagnosisText: string, delayDays: number) => {
    if (!user?.id) return;
    try {
      const scheduledFor = new Date();
      scheduledFor.setDate(scheduledFor.getDate() + delayDays);

      const { error } = await supabase.from('reminders').insert({
        user_id:      user.id,
        reminder_text: text,
        diagnosis_text: diagnosisText,
        scheduled_for: scheduledFor.toISOString(),
      });
      if (error) throw error;
      await fetchReminders();
    } catch (err) {
      console.error('Error creating reminder:', err);
      throw err;
    }
  }, [user, fetchReminders]);

  const markReminderAsComplete = useCallback(async (id: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: true })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      await fetchReminders();
    } catch (err) {
      console.error('Error marking reminder as complete:', err);
      throw err;
    }
  }, [user, fetchReminders]);

  return (
    <ReminderContext.Provider
      value={{
        reminders,
        createReminder,
        markReminderAsComplete,
        loading,
      }}
    >
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (!context) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
}
