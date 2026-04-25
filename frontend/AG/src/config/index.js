// ============================================================
// CONFIG — Single source of truth for all app configuration
// Edit this file to change API endpoints, timeouts, feature flags
// ============================================================

export const Config = {
  // ── API ────────────────────────────────────────────────────
  api: {
    // Auto-detect environment:
    //   Web browser  → localhost
    //   Android emulator → 10.0.2.2
    //   Physical device  → replace with your machine's local IP (ipconfig)
    baseURL: (() => {
      if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
        return 'http://localhost:8000/api'; // web browser
      }
      return 'http://10.0.2.2:8000/api'; // Android emulator
    })(),

    // Request timeout (ms)
    timeout: 10000,

    // API version prefix (already included in baseURL above)
    // If your backend uses /v2 later, just change it here
    version: "v1",
  },

  // ── App Mode ───────────────────────────────────────────────
  // 'offline'  → SQLite only, no API calls
  // 'online'   → API only, no local storage
  // 'hybrid'   → Save locally AND sync to API (recommended)
  appMode: "hybrid",

  // ── Feature Flags ─────────────────────────────────────────
  // Turn features on/off without deleting code
  features: {
    cloudSync: true, // Sync results to backend
    userAuth: true, // Login / register flow
    aiRecommendations: false, // Future: AI-powered hearing advice
    exportPDF: false, // Future: Export audiogram as PDF
  },

  // ── Auth ───────────────────────────────────────────────────
  auth: {
    tokenKey: "audiogram_auth_token",
    refreshTokenKey: "audiogram_refresh_token",
    tokenExpiry: 3600, // seconds
  },

  // ── Pagination ────────────────────────────────────────────
  pagination: {
    defaultLimit: 20,
  },
};

export default Config;
