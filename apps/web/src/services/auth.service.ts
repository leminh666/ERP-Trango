// =============================================================================
// Auth Service - Authentication API calls
// =============================================================================
//
// All authentication-related API calls should be made through this service.
// UI components should NOT call apiClient directly for auth operations.
//
// USAGE:
//   import { authService } from '@/services/auth.service';
//
//   // Login
//   const { token, user } = await authService.login(email, password);
//
//   // Logout
//   await authService.logout();
//
// =============================================================================

import { apiClient, get, post, type ApiRequestOptions } from '@/lib/api';
import { getToken, removeToken, removeUser, setToken, setUser } from '@/lib/api';

// =============================================================================
// Types
// =============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  phone?: string;
  address?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  user: User;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface AuthSettings {
  enabled: boolean;
  idleTimeoutMinutes: number;
  absoluteTimeoutMinutes: number;
}

export interface AuthConfig {
  rememberEmailDefault: boolean;
  session: AuthSettings;
}

// =============================================================================
// Auth API Endpoints
// =============================================================================

const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  LOGOUT: '/auth/logout',
  ME: '/auth/me',
  REFRESH: '/auth/refresh',
  FORGOT_PASSWORD: '/auth/forgot-password',
  RESET_PASSWORD: '/auth/reset-password',
  SETTINGS: '/settings',
} as const;

// =============================================================================
// Auth Service
// =============================================================================

export const authService = {
  /**
   * Login with email and password
   */
  async login(email: string, password: string, remember = true): Promise<LoginResponse> {
    const data = await post<LoginResponse>(AUTH_ENDPOINTS.LOGIN, {
      email,
      password,
      remember,
    });

    // Store auth data
    setToken(data.accessToken);
    setUser(data.user);

    return data;
  },

  /**
   * Register new user
   */
  async register(request: RegisterRequest): Promise<LoginResponse> {
    const data = await post<LoginResponse>(AUTH_ENDPOINTS.REGISTER, request);

    // Store auth data
    setToken(data.accessToken);
    setUser(data.user);

    return data;
  },

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      await post(AUTH_ENDPOINTS.LOGOUT, null);
    } catch {
      // Ignore logout errors - we still want to clear local storage
    } finally {
      // Always clear local storage
      removeToken();
      removeUser();
    }
  },

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<User> {
    return get<User>(AUTH_ENDPOINTS.ME);
  },

  /**
   * Refresh access token
   */
  async refreshToken(): Promise<{ accessToken: string }> {
    return post(AUTH_ENDPOINTS.REFRESH, {});
  },

  /**
   * Request password reset email
   */
  async forgotPassword(email: string): Promise<{ message: string }> {
    return post(AUTH_ENDPOINTS.FORGOT_PASSWORD, { email });
  },

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<{ message: string }> {
    return post(AUTH_ENDPOINTS.RESET_PASSWORD, { token, password });
  },

  /**
   * Get auth settings
   */
  async getSettings(): Promise<AuthConfig> {
    const data = await get<{ auth?: AuthConfig }>(AUTH_ENDPOINTS.SETTINGS);
    return data?.auth || {
      rememberEmailDefault: true,
      session: {
        enabled: true,
        idleTimeoutMinutes: 30,
        absoluteTimeoutMinutes: 720,
      },
    };
  },
};

// =============================================================================
// Auth Token Helpers
// =============================================================================

export const authToken = {
  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!getToken();
  },

  /**
   * Get current token
   */
  getToken(): string | null {
    return getToken();
  },

  /**
   * Set token manually
   */
  setToken(token: string): void {
    setToken(token);
  },

  /**
   * Clear auth data
   */
  clear(): void {
    removeToken();
    removeUser();
  },
};

// =============================================================================
// Exports
// =============================================================================

// Types already exported above as interfaces/types — no re-export needed

