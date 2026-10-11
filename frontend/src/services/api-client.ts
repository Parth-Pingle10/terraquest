/**
 * Central HTTP API client for TerraQuest backend communication.
 * Handles base URL configuration, Bearer auth headers, JSON envelopes, timeouts, and error handling.
 */

import { storage } from '../lib/storage';

export const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000').replace(/\/+$/, '');

export class ApiError extends Error {
  code: string;
  statusCode: number;
  details?: any;

  constructor(message: string, code = 'API_ERROR', statusCode = 500, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
  skipAuth?: boolean;
}

export async function apiClient<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const { timeoutMs = 12000, skipAuth = false, headers = {}, ...rest } = options;

  const url = `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  const token = storage.getToken();

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(headers as Record<string, string>),
  };

  if (!skipAuth && token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...rest,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const responseData = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorPayload = responseData?.error;
      const message = errorPayload?.message || responseData?.detail || `Request failed with status ${response.status}`;
      const code = errorPayload?.code || (response.status === 401 ? 'UNAUTHORIZED' : 'HTTP_ERROR');

      // If token expired, clear invalid token
      if (response.status === 401 && !skipAuth) {
        storage.removeToken();
      }

      throw new ApiError(message, code, response.status, errorPayload?.details);
    }

    // Backend wraps successful responses in { success: true, data: T }
    if (responseData && typeof responseData === 'object' && 'data' in responseData) {
      return responseData.data as T;
    }

    return responseData as T;
  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new ApiError('Request timed out. Please check your network connection.', 'TIMEOUT', 408);
    }
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError(
      error.message || 'Unable to connect to TerraQuest server. Offline mode available.',
      'NETWORK_ERROR',
      0
    );
  }
}
