// src/pages/Dashboard.tsx

import React, { useState } from 'react';
import { Routes, Route, NavLink, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Camera, MessageSquare, User, LogOut, Menu, X, Bell, Users, CreditCard, Cloud, Info } from 'lucide-react';
import Scanner from './Scanner';
import ChatBot from './ChatBot';
import Profile from './Profile';
import Reminders from './Reminders';
import Forum from './Forum';
import Pricing from './Pricing';
import Weather from './Weather';
import About from './About';
import LanguageSelector from '../components/LanguageSelector';
import { useTranslation } from 'react-i18next';

function Dashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useTranslation();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const NavItem = ({ to, icon: Icon, children }: { to: string; icon: React.ElementType; children: React.ReactNode }) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex items-center space-x-2 p-3 rounded-xl transition-colors ${
          isActive ? 'bg-green-100 text-green-600' : 'hover:bg-gray-100'
        }`
      }
      onClick={() => setIsMobileMenuOpen(false)}
    >
      <Icon size={20} />
      <span>{children}</span>
    </NavLink>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-50">
      <button
        type="button" // Добавляем type="button", чтобы избежать проблем
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="md:hidden fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-lg"
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      <nav className={`
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0
        fixed md:relative
        w-64 h-full
        bg-white shadow-xl
        transition-transform duration-300 ease-in-out
        z-40 md:z-auto
      `}>
        <div className="p-6">
          <h1 className="text-2xl font-bold text-green-600">Egis-Eye</h1>
          <p className="text-sm text-gray-600 mt-1">{t('nav.plantScanner')}</p>
        </div>
        <div className="px-4 flex flex-col space-y-2">
          <NavItem to="scanner" icon={Camera}>{t('nav.scanner')}</NavItem>
          <NavItem to="chatbot" icon={MessageSquare}>{t('nav.chatbot')}</NavItem>
          <NavItem to="reminders" icon={Bell}>{t('nav.reminders')}</NavItem>
          <NavItem to="forum" icon={Users}>{t('nav.forum')}</NavItem>
          <NavItem to="profile" icon={User}>{t('nav.profile')}</NavItem>
          <NavItem to="pricing" icon={CreditCard}>{t('nav.pricing')}</NavItem>
          <NavItem to="weather" icon={Cloud}>{t('nav.weather')}</NavItem>
          <NavItem to="about" icon={Info}>{t('nav.about')}</NavItem>
          <LanguageSelector />
        </div>
        <div className="absolute bottom-0 w-64 p-4">
          <button
            type="button" // Добавляем type="button", чтобы избежать проблем
            onClick={handleSignOut}
            className="flex items-center space-x-2 w-full p-3 rounded-xl hover:bg-red-50 text-red-600 transition-colors"
          >
            <LogOut size={20} />
            <span>{t('auth.signOut')}</span>
          </button>
        </div>
      </nav>

      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <main className="flex-1 overflow-auto pt-16 md:pt-0">
        <Routes>
          <Route path="scanner" element={<Scanner />} />
          <Route path="chatbot" element={<ChatBot />} />
          <Route path="reminders" element={<Reminders />} />
          <Route path="forum" element={<Forum />} />
          <Route path="profile" element={<Profile />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="weather" element={<Weather />} />
          <Route path="about" element={<About />} />
          {/* Фолбэк по умолчанию на сканер, если никакой путь не совпал */}
          <Route index element={<Navigate to="scanner" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default Dashboard;