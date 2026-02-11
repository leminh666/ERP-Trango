'use client';

import { useState, createContext, useContext, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson, getToken, setToken, removeToken, getUser, setUser, removeUser, apiClient } from '@/lib/api';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export type { User };

interface AuthSessionSettings {
  enabled: boolean;
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
}

interface AuthConfig {
  rememberEmailDefault: boolean;
  session: AuthSessionSettings;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  isLoading: boolean;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const DEFAULT_AUTH_CONFIG: AuthConfig = {
  rememberEmailDefault: true,
  session: {
    enabled: true,
    idleTimeoutMinutes: 30,
    absoluteTimeoutMinutes: 720,
  },
};

// Safe JSON parse with fallback
function safeParse<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    console.warn('[Auth] Failed to parse JSON, using fallback');
    return fallback;
  }
}

// Safe localStorage access - CRITICAL for SSR + iOS
function getStorageItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    // iOS Safari might throw if storage is disabled/quota exceeded
    return window.localStorage.getItem(key);
  } catch (error) {
    console.warn(`[Auth] localStorage.getItem(${key}) failed:`, error);
    return null;
  }
}

function setStorageItem(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[Auth] localStorage.setItem(${key}) failed:`, error);
  }
}

function removeStorageItem(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[Auth] localStorage.removeItem(${key}) failed:`, error);
  }
}

// Auth state type for consistent initialization
interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

function createInitialAuthState(): AuthState {
  return {
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true, // Start in loading state
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(createInitialAuthState);
  const router = useRouter();
  const initializedRef = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const activityDebounceRef = useRef<NodeJS.Timeout | null>(null);

  // Stable setter to avoid re-renders from multiple state updates
  const updateState = useCallback((updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  // Initialize auth from storage - run ONLY once after mount
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializedRef.current) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }
    initializedRef.current = true;

    const storedToken = getStorageItem('token');
    const storedUser = getStorageItem('user');

    if (storedToken && storedUser) {
      const parsedUser = safeParse<User | null>(storedUser, null);
      if (parsedUser) {
        // Valid token + user found
        setState({
          user: parsedUser,
          token: storedToken,
          isAuthenticated: true,
          isLoading: false,
        });
        console.log('[Auth] Restored session for user:', parsedUser.email);
      } else {
        // Corrupted user data
        removeStorageItem('token');
        removeStorageItem('user');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } else {
      // No stored session
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, []);

  // Fetch settings after auth is loaded
  useEffect(() => {
    // Only run if not loading and has token
    if (state.isLoading || !state.token) return;

    const fetchSettings = async () => {
      try {
        const data = await fetchJson<{ auth?: AuthConfig }>('/settings', { token: state.token! });
        const config = data?.auth || DEFAULT_AUTH_CONFIG;
        setStorageItem('authConfig', JSON.stringify(config));
        // We don't need to store this in state as it's only used by the timer
        console.log('[Auth] Settings loaded');
      } catch (error) {
        console.warn('[Auth] Failed to fetch settings, using defaults');
        const localConfig = safeParse<AuthConfig>(getStorageItem('authConfig'), DEFAULT_AUTH_CONFIG);
        setStorageItem('authConfig', JSON.stringify(localConfig));
      }
    };

    fetchSettings();
  }, [state.isLoading, state.token]);

  // Login function
  const login = useCallback((newToken: string, newUser: User) => {
    setStorageItem('token', newToken);
    setStorageItem('user', JSON.stringify(newUser));

    const now = Date.now();
    setStorageItem('loginAt', String(now));
    setStorageItem('lastActivityAt', String(now));

    updateState({
      user: newUser,
      token: newToken,
      isAuthenticated: true,
      isLoading: false,
    });

    console.log('[Auth] Login success:', newUser.email);
    router.push('/dashboard');
  }, [router, updateState]);

  // Logout function
  const logout = useCallback(() => {
    removeStorageItem('token');
    removeStorageItem('user');
    removeStorageItem('loginAt');
    removeStorageItem('lastActivityAt');

    updateState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    router.push('/login');
  }, [router, updateState]);

  // Auto logout timers
  useEffect(() => {
    // Cleanup on unmount or when dependencies change
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
        activityDebounceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Skip if no session
    if (!state.token || !state.user) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Get session config
    const config = safeParse<AuthConfig>(getStorageItem('authConfig'), DEFAULT_AUTH_CONFIG);
    if (!config?.session?.enabled) return;

    const idleMs = Math.max(1, Number(config.session.idleTimeoutMinutes || 30)) * 60 * 1000;
    const absMs = Math.max(1, Number(config.session.absoluteTimeoutMinutes || 720)) * 60 * 1000;

    const checkSession = () => {
      const now = Date.now();
      const loginAt = Number(getStorageItem('loginAt') || String(now));
      const lastActivity = Number(getStorageItem('lastActivityAt') || String(now));

      if (now - loginAt >= absMs || now - lastActivity >= idleMs) {
        console.log('[Auth] Session expired, logging out');
        logout();
      }
    };

    const onActivity = () => {
      if (activityDebounceRef.current) return;
      activityDebounceRef.current = setTimeout(() => {
        activityDebounceRef.current = null;
        setStorageItem('lastActivityAt', String(Date.now()));
      }, 1000);
    };

    // Add activity listeners
    if (typeof window !== 'undefined') {
      window.addEventListener('mousemove', onActivity);
      window.addEventListener('keydown', onActivity);
      window.addEventListener('click', onActivity);
      window.addEventListener('scroll', onActivity, { passive: true });
    }

    // Check every 5 seconds
    intervalRef.current = setInterval(checkSession, 5000);

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', onActivity);
        window.removeEventListener('keydown', onActivity);
        window.removeEventListener('click', onActivity);
        window.removeEventListener('scroll', onActivity);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (activityDebounceRef.current) {
        clearTimeout(activityDebounceRef.current);
        activityDebounceRef.current = null;
      }
    };
  }, [state.token, state.user, logout]);

  return (
    <AuthContext.Provider value={{
      user: state.user,
      token: state.token,
      login,
      logout,
      isLoading: state.isLoading,
      isAuthenticated: state.isAuthenticated,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
