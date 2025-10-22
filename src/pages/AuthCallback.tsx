// src/pages/AuthCallback.tsx
import React, { useEffect } from 'react';
import { useNavigate }    from 'react-router-dom';
import { createClient }   from '@supabase/supabase-js';

// Инициализирую клиент с автопарсингом хеша и сохранением сессии
import { supabase } from '../supabaseClient';

const AuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      console.log('AuthCallback: URL hash is', window.location.hash);

      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('AuthCallback: session →', session, 'error →', error);

      if (error || !session) {
        console.error('Ошибка авторизации:', error);
        return navigate('/', { replace: true });
      }

      navigate('/dashboard', { replace: true });
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Выполняется вход...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
