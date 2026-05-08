// ============================================================
// useTests HOOK — Fetches from backend (source of truth)
// Falls back to localStorage if backend unavailable
// ============================================================
import { useState, useCallback } from 'react';
import TestService from '../api/testService';

// localStorage helpers
const LS_KEY = 'audiogram_tests';
const getLocal  = () => { try { return JSON.parse(localStorage.getItem(LS_KEY) || '[]'); } catch { return []; } };
const saveLocal = (tests) => { try { localStorage.setItem(LS_KEY, JSON.stringify(tests)); } catch {} };

// One-time cleanup: remove old auto-created bone sessions from cache
try {
  const cached = JSON.parse(localStorage.getItem(LS_KEY) || '[]');
  const cleaned = cached.filter(t => {
    // Keep air sessions always
    if (t.session_type === 'air') return true;
    // Keep bone sessions only if there's a matching air session within 24h
    if (t.session_type === 'bone') {
      return cached.some(a =>
        a.session_type === 'air' &&
        a.ear === t.ear &&
        Math.abs(new Date(a.date) - new Date(t.date)) < 24 * 60 * 60 * 1000
      );
    }
    return true;
  });
  if (cleaned.length !== cached.length) {
    localStorage.setItem(LS_KEY, JSON.stringify(cleaned));
  }
} catch {}

// Convert backend session format to local format
const sessionToTest = (s) => {
  // Backend returns results as dict {freq: threshold} OR array of objects
  let results = {};
  if (Array.isArray(s.results)) {
    s.results.forEach(r => {
      if (r.is_completed) results[parseInt(r.frequency)] = r.threshold_db;
    });
  } else if (s.results && typeof s.results === 'object') {
    // Dict format: {"250": 50.0, ...} — convert keys to integers
    Object.entries(s.results).forEach(([k, v]) => {
      results[parseInt(k)] = v;
    });
  }

  return {
    id:            s.id,
    date:          s.created_at || s.date || new Date().toISOString(),
    ear:           s.ear === 'R' ? 'right' : s.ear === 'L' ? 'left' : s.ear,
    session_type:  s.session_type,
    strategy_type: s.strategy_type || 'traditional',
    results,
    avg_threshold: s.avg_threshold ?? s.classification?.pta ?? 0,
    hearing_level: s.hearing_level ?? s.classification?.classification ?? '',
    from_backend:  true,
  };
};

export const useTests = () => {
  const [tests,   setTests]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch from backend (source of truth)
      const sessions = await TestService.getMyHistory();
      const mapped = sessions.map(sessionToTest);
      setTests(mapped);
      saveLocal(mapped); // cache locally — this overwrites old bone sessions
    } catch (err) {
      // Fallback to localStorage — filter out bone sessions without air pair
      console.warn('[useTests] backend failed, using local:', err.message);
      const local = getLocal();
      setTests(local);
      setError(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTest = useCallback(async (test) => {
    // Remove from UI immediately (optimistic update)
    setTests(prev => prev.filter(t => t.id !== test.id));
    // Remove from local cache
    const updated = getLocal().filter(t => t.id !== test.id);
    saveLocal(updated);
    // Delete from backend if it was synced
    if (test.from_backend && test.id) {
      try {
        await TestService.deleteSession(test.id);
      } catch (err) {
        console.warn('[useTests] backend delete failed:', err.message);
      }
    }
  }, []);

  return { tests, loading, error, refresh: load, deleteTest };
};
