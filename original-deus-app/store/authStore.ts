import { create } from 'zustand';
import { Platform } from 'react-native';
import { User, AuthSession } from '../types';
import { MOCK_USERS } from '../data/mockData';
import { getApiBaseUrl } from '../constants/api';
import { fetchWithTimeout } from '../utils/helpers';

const isServerlessWeb = Platform.OS === 'web' && 
  typeof window !== 'undefined' && 
  (window.location.hostname.endsWith('github.io') || window.location.protocol === 'https:');

interface AuthState {
  currentUser: User | null;
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  users: User[];

  fetchUsers: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  createUser: (data: Omit<User, 'id' | 'createdAt' | 'createdBy' | 'passwordHash'> & { password?: string }) => Promise<User>;
  updateUser: (id: string, data: Partial<User>) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  toggleUserActive: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  session: null,
  isLoading: false,
  error: null,
  users: MOCK_USERS,

  fetchUsers: async () => {
    try {
      if (isServerlessWeb) throw new Error("Serverless web mode");
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/users`);
      if (res.ok) {
        const users = await res.json();
        set({ users });
      }
    } catch (e) {
      console.warn("Local API server not reachable, keeping mock users data list:", (e as any).message);
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      if (isServerlessWeb) throw new Error("Serverless web mode");
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const data = await res.json();
        set({ currentUser: data.user, session: data.session, isLoading: false, error: null });
        get().fetchUsers();
        return true;
      } else {
        const errData = await res.json();
        set({ isLoading: false, error: errData.error || 'E-posta veya şifre hatalı.' });
        return false;
      }
    } catch (e) {
      console.warn("Local API server not reachable, attempting offline-mode mock login:", (e as any).message);
      
      const { users } = get();
      const user = users.find(
        u => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password
      );

      if (!user) {
        set({ isLoading: false, error: 'E-posta veya şifre hatalı (Çevrimdışı mod).' });
        return false;
      }
      if (!user.isActive) {
        set({ isLoading: false, error: 'Hesabınız devre dışı bırakılmış. Yönetici ile iletişime geçin.' });
        return false;
      }

      const session: AuthSession = {
        userId: user.id,
        token: `offline_token_${user.id}_${Date.now()}`,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      };

      set({ currentUser: user, session, isLoading: false, error: null });
      return true;
    }
  },

  logout: () => {
    set({ currentUser: null, session: null, error: null });
  },

  createUser: async (data) => {
    set({ isLoading: true, error: null });
    try {
      if (isServerlessWeb) throw new Error("Serverless web mode");
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const newUser = await res.json();
        set(state => ({ users: [...state.users, newUser], isLoading: false }));
        return newUser;
      } else {
        const errData = await res.json();
        set({ isLoading: false, error: errData.error || 'Kullanıcı oluşturulamadı.' });
        throw new Error(errData.error);
      }
    } catch (e) {
      console.warn("Local API server not reachable, adding user in offline-mode fallback:", (e as any).message);
      
      const { currentUser, users } = get();
      const exists = users.find(u => u.email.toLowerCase() === data.email.toLowerCase());
      if (exists) {
        set({ isLoading: false, error: 'Bu e-posta adresi zaten kayıtlı.' });
        throw new Error('Email already exists');
      }

      const newUser: User = {
        ...data,
        id: `user-${Date.now()}`,
        passwordHash: data.password || 'User123!',
        createdAt: new Date().toISOString(),
        createdBy: currentUser?.id || 'system',
      };

      set({ users: [...users, newUser], isLoading: false });
      return newUser;
    }
  },

  updateUser: async (id, data) => {
    set({ isLoading: true });
    try {
      if (isServerlessWeb) throw new Error("Serverless web mode");
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updatedUser = await res.json();
        set(state => ({
          users: state.users.map(u => u.id === id ? updatedUser : u),
          isLoading: false,
        }));
      }
    } catch (e) {
      console.warn("Local API server not reachable, updating user in offline-mode fallback:", (e as any).message);
      const { users } = get();
      const updated = users.map(u => u.id === id ? { ...u, ...data } : u);
      set({ users: updated, isLoading: false });
    }
  },

  deleteUser: async (id) => {
    set({ isLoading: true });
    try {
      if (isServerlessWeb) throw new Error("Serverless web mode");
      const baseUrl = getApiBaseUrl();
      const res = await fetchWithTimeout(`${baseUrl}/api/users/${id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        set(state => ({
          users: state.users.filter(u => u.id !== id),
          isLoading: false,
        }));
      }
    } catch (e) {
      console.warn("Local API server not reachable, deleting user in offline-mode fallback:", (e as any).message);
      const { users } = get();
      set({ users: users.filter(u => u.id !== id), isLoading: false });
    }
  },

  toggleUserActive: async (id) => {
    const { users } = get();
    const user = users.find(u => u.id === id);
    if (user) {
      await get().updateUser(id, { isActive: !user.isActive });
    }
  },

  clearError: () => set({ error: null }),
}));

