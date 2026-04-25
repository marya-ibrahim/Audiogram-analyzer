// ============================================================
// API CLIENT — Axios instance with auth, logging & error handling
// All API calls go through this client automatically
// ============================================================
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import Config from '../config';
import { storage } from '../utils/storage';

// ── Create Axios instance ────────────────────────────────────
const apiClient = axios.create({
  baseURL: Config.api.baseURL,
  timeout: Config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

// ── REQUEST INTERCEPTOR ──────────────────────────────────────
// Automatically attach the JWT token to every request
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await storage.getItem(Config.auth.tokenKey);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      // Token not found — proceed without auth header (public endpoints)
      console.warn('[API] Could not retrieve auth token:', err.message);
    }

    // Log outgoing requests in development
    if (__DEV__) {
      console.log(`[API →] ${config.method?.toUpperCase()} ${config.url}`, config.data ?? '');
    }

    return config;
  },
  (error) => {
    console.error('[API] Request error:', error);
    return Promise.reject(error);
  }
);

// ── RESPONSE INTERCEPTOR ─────────────────────────────────────
// Handle token expiry (401), server errors (5xx), and network failures
apiClient.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API ←] ${response.status} ${response.config.url}`, response.data);
    }
    return response;
  },
  async (error) => {
    const status  = error.response?.status;
    const data    = error.response?.data;

    // Extract human-readable message from Django error formats
    let message = 'Something went wrong';
    if (data) {
      if (typeof data === 'string') {
        message = data;
      } else if (data.detail) {
        message = data.detail;
      } else if (data.message) {
        message = data.message;
      } else {
        // Field errors: { identifier: ['...'], password: ['...'] }
        const firstKey = Object.keys(data)[0];
        const firstVal = data[firstKey];
        message = Array.isArray(firstVal) ? firstVal[0] : String(firstVal);
      }
    } else {
      message = error.message ?? message;
    }

    if (status === 401) {
      // Prevent infinite loop on refresh endpoint itself
      if (error.config?.url?.includes('/auth/refresh/')) {
        await storage.deleteItem(Config.auth.tokenKey).catch(() => {});
        await storage.deleteItem(Config.auth.refreshTokenKey).catch(() => {});
        return Promise.reject({ status, message, raw: error });
      }

      // Try to refresh token before clearing
      try {
        const refreshToken = await storage.getItem(Config.auth.refreshTokenKey);
        if (refreshToken) {
          const res = await axios.post(`${Config.api.baseURL}/auth/refresh/`, { refresh: refreshToken });
          const newAccess = res.data?.access;
          if (newAccess) {
            await storage.setItem(Config.auth.tokenKey, newAccess);
            // Retry original request with new token using apiClient
            const retryConfig = { ...error.config };
            retryConfig.headers = { ...retryConfig.headers, Authorization: `Bearer ${newAccess}` };
            retryConfig._retry = true;
            return apiClient(retryConfig);
          }
        }
      } catch (_) {}
      // Refresh failed — clear tokens
      await storage.deleteItem(Config.auth.tokenKey).catch(() => {});
      await storage.deleteItem(Config.auth.refreshTokenKey).catch(() => {});
      console.warn('[API] 401 — tokens cleared after failed refresh');
    }

    if (status && status >= 500) {
      console.error('[API] Server error:', message);
    }

    if (!error.response) {
      // Network error (no internet, server down, etc.)
      console.error('[API] Network error — no response received');
    }

    // Always reject so callers can handle the error themselves
    return Promise.reject({
      status,
      message,
      raw: error,
    });
  }
);

export default apiClient;
