import { create } from 'zustand';
import { User, AuthSession } from '../types';

interface AuthState {
  currentUser: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => void;
  clearError: () => void;
}

const PREDEFINED_USERS = [
  {
    id: 'user-admin-1',
    name: 'Sistem Yöneticisi',
    email: 'admin@ofsis.io',
    username: 'admin',
    password: 'ofsis',
    role: 'admin' as const,
    isActive: true,
  },
  {
    id: 'user-2',
    name: 'Barış Demir',
    email: 'baris@ofsis.io',
    username: 'baris',
    password: 'ofsis',
    role: 'user' as const,
    isActive: true,
  }
];

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  session: null,
  isLoading: false,
  error: null,

  checkAuth: () => {
    if (typeof window === 'undefined') return;
    try {
      const savedSession = localStorage.getItem('ofsis_session');
      const savedUser = localStorage.getItem('ofsis_user');
      if (savedSession && savedUser) {
        set({
          session: JSON.parse(savedSession),
          currentUser: JSON.parse(savedUser)
        });
      }
    } catch (e) {
      console.error('Error restoring session:', e);
    }
  },

  login: async (emailOrUsername, password) => {
    set({ isLoading: true, error: null });
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 600));

    const input = emailOrUsername.toLowerCase();
    const user = PREDEFINED_USERS.find(
      u => (u.email.toLowerCase() === input || u.username.toLowerCase() === input) && u.password === password
    );

    if (!user) {
      set({ isLoading: false, error: 'Kullanıcı adı veya şifre hatalı.' });
      return false;
    }

    if (!user.isActive) {
      set({ isLoading: false, error: 'Hesabınız aktif değil.' });
      return false;
    }

    const session: AuthSession = {
      userId: user.id,
      token: `deus_session_${user.id}_${Date.now()}`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const userProfile: User = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem('ofsis_session', JSON.stringify(session));
      localStorage.setItem('ofsis_user', JSON.stringify(userProfile));
    }

    set({
      currentUser: userProfile,
      session,
      isLoading: false,
      error: null
    });
    return true;
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('ofsis_session');
      localStorage.removeItem('ofsis_user');
    }
    set({ currentUser: null, session: null, error: null });
  },

  clearError: () => set({ error: null }),
}));
