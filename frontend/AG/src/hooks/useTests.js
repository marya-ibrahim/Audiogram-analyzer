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
      // Try backend first
      const sessions = await TestService.getMyHistory();
      const mapped = sessions.map(sessionToTest);
      setTests(mapped);
      saveLocal(mapped); // cache locally
    } catch (err) {
      // Fallback to localStorage
      console.warn('[useTests] backend failed, using local:', err.message);
      setTests(getLocal());
      setError(null); // don't show error, just use local
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteTest = useCallback(async (test) => {
    // Remove from local cache
    const updated = getLocal().filter(t => t.id !== test.id);
    saveLocal(updated);
    setTests(prev => prev.filter(t => t.id !== test.id));
    // Backend delete not implemented yet — just local removal
  }, []);

  return { tests, loading, error, refresh: load, deleteTest };
};
