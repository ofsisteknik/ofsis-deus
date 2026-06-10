import { create } from 'zustand';
import { Colors, LightColors } from '../constants/colors';

type ThemeType = 'dark' | 'light';

interface ThemeState {
  theme: ThemeType;
  colors: typeof Colors;
  toggleTheme: () => void;
  setTheme: (theme: ThemeType) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'light',
  colors: LightColors,
  toggleTheme: () => {
    const nextTheme = get().theme === 'dark' ? 'light' : 'dark';
    set({
      theme: nextTheme,
      colors: nextTheme === 'dark' ? Colors : LightColors,
    });
  },
  setTheme: (theme) => {
    set({
      theme,
      colors: theme === 'dark' ? Colors : LightColors,
    });
  },
}));

