// src/components/PrivateRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  // Пока идет проверка авторизации, ничего не показываем
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-screen">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-green-600"></div>
        </div>
    );
  }

  // Если пользователь не авторизован, перенаправляем на главную
  if (!user) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Если все в порядке, показываем дочерний компонент (Dashboard)
  return children;
};

export default PrivateRoute;