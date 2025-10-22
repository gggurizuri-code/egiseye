// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './i18n';
import './index.css';

// Добавляем детальное логирование для отладки
console.log('Main.tsx loaded');

// Добавляем глобальный обработчик для отладки
window.addEventListener('beforeunload', (e) => {
  console.log('Page is about to unload:', e);
});

window.addEventListener('unload', (e) => {
  console.log('Page unloaded:', e);
});

// Логируем все навигационные события
window.addEventListener('popstate', (e) => {
  console.log('Popstate event:', e);
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);