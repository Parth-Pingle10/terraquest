import { apiClient } from './api-client';
import { AuthResponse, User } from '../types';

export const authApi = {
  register: (payload: {
    username: string;
    password: string;
    display_name?: string;
    interests?: string[];
    preferred_quest_duration?: number;
    preferred_difficulty?: string;
  }) => {
    return apiClient<AuthResponse>('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  login: (payload: { username: string; password: string }) => {
    return apiClient<AuthResponse>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
      skipAuth: true,
    });
  },

  getMe: () => {
    return apiClient<User>('/api/v1/auth/me');
  },

  updateMe: (payload: Partial<User>) => {
    return apiClient<User>('/api/v1/auth/me', {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  logout: () => {
    return apiClient<{ message: string }>('/api/v1/auth/logout', {
      method: 'POST',
    });
  },
};
