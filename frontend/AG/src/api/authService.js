// ============================================================
// AUTH SERVICE — Login, Register, Logout, Token management
// Matches Django backend endpoints:
//   POST /api/auth/login/       → SimpleJWT { access, refresh }
//   POST /api/auth/refresh/     → { access }
//   POST /api/users/register/   → user object
//   GET  /api/users/me/         → user profile
// ============================================================
import apiClient from './client';
import Config from '../config';
import { storage } from '../utils/storage';

// ── Encode credentials to Base64 ─────────────────────────
const encodeCredentials = (identifier, password) => {
  const raw = JSON.stringify({ identifier, password });
  return btoa(unescape(encodeURIComponent(raw)));
};

const AuthService = {

  // ── Register ──────────────────────────────────────────────
  register: async ({ name, identifier, password }) => {
    const encoded = encodeCredentials(identifier, password);
    const response = await apiClient.post('/users/register/', { name, credentials: encoded });
    return response.data;
  },

  // ── Login ─────────────────────────────────────────────────
  login: async ({ identifier, password }) => {
    const encoded = encodeCredentials(identifier, password);
    const response = await apiClient.post('/auth/login/', { credentials: encoded });
    const { access, refresh, user } = response.data;
    await storage.setItem(Config.auth.tokenKey, access);
    await storage.setItem(Config.auth.refreshTokenKey, refresh);
    await storage.setItem('user_info', JSON.stringify(user));
    return user;
  },

  // ── Logout ────────────────────────────────────────────────
  logout: async () => {
    await storage.deleteItem(Config.auth.tokenKey).catch(() => {});
    await storage.deleteItem(Config.auth.refreshTokenKey).catch(() => {});
  },

  // ── Get current user profile ──────────────────────────────
  // GET /users/me/
  getMe: async () => {
    const response = await apiClient.get('/users/me/');
    return response.data;
  },

  // ── Refresh access token ──────────────────────────────────
  // POST /auth/refresh/
  refresh: async () => {
    const refreshToken = await storage.getItem(Config.auth.refreshTokenKey);
    if (!refreshToken) throw new Error('No refresh token stored');

    const response = await apiClient.post('/auth/refresh/', { refresh: refreshToken });
    const { access } = response.data;
    await storage.setItem(Config.auth.tokenKey, access);
    return access;
  },

  // ── Check if user is logged in ────────────────────────────
  isAuthenticated: async () => {
    const token = await storage.getItem(Config.auth.tokenKey).catch(() => null);
    return !!token;
  },

  // ── Private: store tokens securely ───────────────────────
  _storeTokens: async (token, refreshToken) => {
    await storage.setItem(Config.auth.tokenKey, token);
    if (refreshToken) {
      await storage.setItem(Config.auth.refreshTokenKey, refreshToken);
    }
  },
};

export default AuthService;
