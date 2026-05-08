// ============================================================
// TEST SERVICE — API calls matching the actual backend
// Base URL: http://localhost:8000
// ============================================================
import apiClient from './client';

const TestService = {

  // ── Create a new audio session ────────────────────────────
  // POST /api/audio/sessions/
  createSession: async ({ ear, sessionType = 'air', hasHearingLoss = false, strategyType = 'traditional', notes = '' }) => {
    const response = await apiClient.post('/audio/sessions/', {
      ear: ear === 'right' ? 'R' : 'L',
      session_type: sessionType,
      strategy_type: strategyType,
      has_hearing_loss: hasHearingLoss,
      notes,
    });
    return response.data;
  },

  // ── Get session details ───────────────────────────────────
  getSession: async (sessionId) => {
    const response = await apiClient.get(`/audio/sessions/${sessionId}/`);
    return response.data;
  },

  // ── Submit a response and get next step ───────────────────
  // POST /api/audio/sessions/{session_id}/respond/
  respond: async (sessionId, heard) => {
    const response = await apiClient.post(`/audio/sessions/${sessionId}/respond/`, { heard });
    return response.data;
  },

  // ── Generate tone audio (base64 WAV) ──────────────────────
  // POST /api/audio/generate-tone/
  generateTone: async ({ frequency, dbHl, duration = 1.0, ear }) => {
    const response = await apiClient.post('/audio/generate-tone/', {
      frequency,
      db_hl: dbHl,
      duration,
      ear: ear === 'right' ? 'R' : 'L',
    });
    return response.data; // { audio: '<base64-wav>', format, frequency, db_hl, ear }
  },

  // ── Get audiogram data ────────────────────────────────────
  getAudiogram: async (sessionId) => {
    const response = await apiClient.get(`/audio/sessions/${sessionId}/audiogram/`);
    return response.data;
  },

  // ── Get combined air+bone audiogram ──────────────────────
  // Pass the BONE session id — backend fetches air automatically
  getCombinedAudiogram: async (boneSessionId) => {
    const response = await apiClient.get(`/audio/sessions/${boneSessionId}/audiogram/combined/`);
    return response.data;
  },

  // ── Save complete test results ────────────────────────────
  // POST /api/audio/results/
  saveResults: async ({ ear, sessionType, thresholds }) => {
    const response = await apiClient.post('/audio/results/', {
      ear,
      session_type: sessionType,
      thresholds,
    });
    return response.data;
  },

  // ── Get current user's history ────────────────────────────
  // GET /api/audio/my-history/
  getMyHistory: async () => {
    const response = await apiClient.get('/audio/my-history/');
    return response.data;
  },

  // ── Delete a session ──────────────────────────────────────
  deleteSession: async (sessionId) => {
    await apiClient.delete(`/audio/sessions/${sessionId}/`);
  },

  // ── Submit final threshold for a frequency ───────────────
  // POST /api/audio/sessions/{id}/threshold/
  submitThreshold: async (sessionId, frequency, thresholdDb) => {
    const response = await apiClient.post(`/audio/sessions/${sessionId}/threshold/`, {
      frequency,
      threshold_db: thresholdDb,
    });
    return response.data;
  },

  // ── Classify session results ──────────────────────────────
  classifySession: async (sessionId) => {
    const response = await apiClient.get(`/audio/sessions/${sessionId}/classify/`);
    return response.data;
  },

  // ── Get current user history ──────────────────────────────
  getMyHistory: async () => {
    const response = await apiClient.get('/audio/history/');
    return response.data;
  },

  // ── Get user test history ─────────────────────────────────
  getUserHistory: async (userId) => {
    const response = await apiClient.get(`/audio/users/${userId}/history/`);
    return response.data;
  },
};

export default TestService;
