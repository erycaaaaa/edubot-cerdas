import { useSyncExternalStore } from 'react';

const key = 'edubuz_theme';
const eventName = 'edubuz-theme-change';

export function initializeTheme() {
  let dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  try {
    const saved = localStorage.getItem(key);
    if (saved === 'light' || saved === 'dark') dark = saved === 'dark';
  } catch { /* Theme still works when browser storage is unavailable. */ }
  document.documentElement.classList.toggle('dark', dark);
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) { initializeTheme(); callback(); }
  };
  window.addEventListener(eventName, callback);
  window.addEventListener('storage', onStorage);
  return () => {
    window.removeEventListener(eventName, callback);
    window.removeEventListener('storage', onStorage);
  };
}

export function useTheme() {
  const darkMode = useSyncExternalStore(subscribe, () => document.documentElement.classList.contains('dark'), () => false);
  function toggleDarkMode() {
    const dark = !document.documentElement.classList.contains('dark');
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    try { localStorage.setItem(key, dark ? 'dark' : 'light'); } catch { /* Keep the current theme in memory. */ }
    window.dispatchEvent(new Event(eventName));
  }
  return { darkMode, toggleDarkMode };
}
