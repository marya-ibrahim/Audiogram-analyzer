// ============================================================
// SYNC SERVICE — Local SQLite storage for offline history
// The backend is the source of truth for sessions.
// We save session IDs locally so we can fetch audiograms later.
// ============================================================
import { saveTestResult, getAllTests, getDB } from './database';

// Called after a session completes — stores session reference locally
export const saveAndSync = async ({
  ear,
  sessionType = 'air',
  sessionId = null,          // backend session ID
  thresholds,
  avgThreshold,
  hearingLevel,
}) => {
  // Always save locally
  const localId = await saveTestResult(
    ear, sessionType, thresholds, avgThreshold, hearingLevel, sessionId
  );
  return { localId, sessionId };
};

// Fetch pending local tests (for display when offline)
export const getLocalTests = async () => {
  try {
    const db = await getDB();
    const rows = await db.getAllAsync('SELECT * FROM tests ORDER BY date DESC');
    return rows.map((r) => ({
      ...r,
      results: (() => { try { return JSON.parse(r.results); } catch { return {}; } })(),
    }));
  } catch (err) {
    console.error('[Sync] getLocalTests error:', err);
    return [];
  }
};
