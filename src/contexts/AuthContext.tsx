// src/contexts/AuthContext.tsx

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';

export interface User extends SupabaseUser {
  role?: string;
}

interface AuthContextType {
  user: User | null;
  role: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signUp: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Эта функция будет нашим единым источником правды о состоянии пользователя
    const updateUserAndRole = async (session: Session | null) => {
      if (session) {
        // Запрашиваем роль только если есть сессия
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        
        const userWithRole: User = { ...session.user, role: profile?.role || 'user' };
        setUser(userWithRole);
        setRole(profile?.role || 'user');
      } else {
        // Если сессии нет, очищаем все
        setUser(null);
        setRole(null);
      }
      // Завершаем загрузку в самом конце
      setIsLoading(false);
    };

    // 1. При первой загрузке получаем сессию и обновляем состояние
    supabase.auth.getSession().then(({ data: { session } }) => {
      updateUserAndRole(session);
    });

    // 2. Подписываемся на ВСЕ изменения аутентификации.
    // Это включает вход, выход, обновление токена, А ТАКЖЕ СОБЫТИЯ ИЗ ДРУГИХ ВКЛАДОК.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Auth event: ${event}`); // Полезно для отладки
      updateUserAndRole(session);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signUp = async (email: string, password: string) => {
    return supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const signOut = async () => {
    // Эта функция остается "пуленепробиваемой"
    try {
      await supabase.auth.signOut();
    } catch (error: any) {
      const isSessionMissingError = 
        error.name === 'AuthSessionMissingError' ||
        (error.message && error.message.includes('session_not_found'));

      if (!isSessionMissingError) {
        console.error('An unexpected error occurred during sign out:', error);
        throw error;
      }
    }
  };
  
  const value = { user, role, isLoading, signIn, signUp, signOut };

  // Рендерим дочерние компоненты только после первой проверки сессии
  return (
    <AuthContext.Provider value={value}>
      {!isLoading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}