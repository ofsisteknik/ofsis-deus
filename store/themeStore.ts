import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  
  initTheme: () => {
    if (typeof window === 'undefined') return;
    try {
      const savedTheme = localStorage.getItem('ofsis_theme') as Theme;
      const initialTheme = savedTheme || 'light';
      set({ theme: initialTheme });
      document.documentElement.setAttribute('data-theme', initialTheme);
    } catch (e) {
      console.error('Error initializing theme:', e);
    }
  },

  setTheme: (theme) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ofsis_theme', theme);
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },

  toggleTheme: () => {
    const nextTheme = get().theme === 'light' ? 'dark' : 'light';
    get().setTheme(nextTheme);
  }
}));
