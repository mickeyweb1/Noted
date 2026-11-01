import { useState, useEffect } from 'react';

const THEME_CHANGE_EVENT = 'noted:theme-change';

const readTheme = () => {
  if (typeof window === 'undefined') return 'light';
  const savedTheme = localStorage.getItem('theme');
  return savedTheme === 'dark' ? 'dark' : 'light';
};

const applyTheme = (theme) => {
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);
  localStorage.setItem('theme', theme);
};

export function useTheme() {
  const [theme, setThemeState] = useState('light');

  useEffect(() => {
    const storedTheme = readTheme();
    setThemeState(storedTheme);
    applyTheme(storedTheme);
    const syncTheme = () => setThemeState(readTheme());
    window.addEventListener(THEME_CHANGE_EVENT, syncTheme);
    window.addEventListener('storage', syncTheme);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, syncTheme);
      window.removeEventListener('storage', syncTheme);
    };
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  const setTheme = (nextTheme) => {
    if (nextTheme !== 'light' && nextTheme !== 'dark') return;
    applyTheme(nextTheme);
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
  };

  return { theme, toggleTheme, setTheme };
}