// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import LandingPage from './pages/LandingPage';
import Dashboard from './pages/Dashboard';
import AuthCallback from './pages/AuthCallback';
import Pricing from './pages/Pricing';
import ProtectedRoute from './components/ProtectedRoute';

import { AuthProvider } from './contexts/AuthContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { AchievementsProvider } from './contexts/AchievementsContext';
import { ReminderProvider } from './contexts/ReminderContext';
import { ForumProvider } from './contexts/ForumContext';
import { NotificationProvider } from './contexts/NotificationContext';

// Обертка, чтобы не загромождать App. Это хорошая практика.
const AppProviders = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <AchievementsProvider>
          <NotificationProvider>
            <ReminderProvider>
              <ForumProvider>
                {children}
              </ForumProvider>
            </ReminderProvider>
          </NotificationProvider>
        </AchievementsProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
};


function App() {
  return (
    // ПРОВАЙДЕРЫ НАХОДЯТСЯ СНАРУЖИ
    <AppProviders>
      {/* РОУТЕР НАХОДИТСЯ ВНУТРИ */}
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/pricing" element={<Pricing />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard/*" element={<Dashboard />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AppProviders>
  );
}

export default App;