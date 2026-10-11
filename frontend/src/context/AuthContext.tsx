import React, { createContext, useContext, useEffect, useState } from 'react';
import { GuestProfile, storage } from '../lib/storage';
import { authApi } from '../services/auth-api';
import { aiApi } from '../services/ai-api';
import { AIStatus, User } from '../types';

interface AuthContextType {
  user: User | null;
  guestProfile: GuestProfile;
  isAuthenticated: boolean;
  isLoading: boolean;
  backendOnline: boolean;
  aiStatus: AIStatus | null;
  theme: 'light' | 'dark';
  login: (tokenOrUsername: string, passOrUser?: any) => Promise<void>;
  register: (payload: {
    username: string;
    password: string;
    display_name?: string;
    interests?: string[];
    preferred_quest_duration?: number;
    preferred_difficulty?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  updateGuestProfile: (data: Partial<GuestProfile>) => void;
  toggleTheme: () => void;
  refreshUserData: () => Promise<void>;
  refreshAIStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [guestProfile, setGuestProfileState] = useState<GuestProfile>(storage.getGuestProfile());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [backendOnline, setBackendOnline] = useState<boolean>(true);
  const [aiStatus, setAiStatus] = useState<AIStatus | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>(storage.getTheme());

  // Apply theme class to documentElement
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    storage.setTheme(theme);
  }, [theme]);

  // Initial session check
  useEffect(() => {
    checkSession();
    fetchAIStatus();
  }, []);

  const fetchAIStatus = async () => {
    try {
      const status = await aiApi.getStatus();
      setAiStatus(status);
      setBackendOnline(true);
    } catch {
      // Backend offline or unreachable
      setBackendOnline(false);
      setAiStatus(null);
    }
  };

  const checkSession = async () => {
    setIsLoading(true);
    const token = storage.getToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const me = await authApi.getMe();
      setUser(me);
      setBackendOnline(true);
    } catch {
      // Invalid/expired token or offline
      storage.removeToken();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (tokenOrUsername: string, passOrUser?: any) => {
    if (typeof passOrUser === 'string') {
      const res = await authApi.login({ username: tokenOrUsername, password: passOrUser });
      storage.setToken(res.token.access_token);
      setUser(res.user);
      storage.setOnboarded(true);
    } else if (typeof passOrUser === 'object' && passOrUser !== null) {
      storage.setToken(tokenOrUsername);
      setUser(passOrUser);
      storage.setOnboarded(true);
    }
  };

  const register = async (payload: {
    username: string;
    password: string;
    display_name?: string;
    interests?: string[];
    preferred_quest_duration?: number;
    preferred_difficulty?: string;
  }) => {
    const res = await authApi.register(payload);
    storage.setToken(res.token.access_token);
    setUser(res.user);
    storage.setOnboarded(true);
  };

  const logout = async () => {
    try {
      if (storage.getToken()) {
        await authApi.logout();
      }
    } catch {
      // Ignore network errors during logout
    } finally {
      storage.removeToken();
      setUser(null);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!user) return;
    const updated = await authApi.updateMe(data);
    setUser(updated);
  };

  const updateGuestProfile = (data: Partial<GuestProfile>) => {
    const updated = { ...guestProfile, ...data };
    setGuestProfileState(updated);
    storage.setGuestProfile(updated);
  };

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const refreshUserData = async () => {
    await checkSession();
    await fetchAIStatus();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        guestProfile,
        isAuthenticated: !!user,
        isLoading,
        backendOnline,
        aiStatus,
        theme,
        login,
        register,
        logout,
        updateProfile,
        updateGuestProfile,
        toggleTheme,
        refreshUserData,
        refreshAIStatus: fetchAIStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
