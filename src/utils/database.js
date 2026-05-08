// ===================================================
// DATABASE - Local SQLite storage for test results
// ===================================================
import * as SQLite from 'expo-sqlite';

let db = null;

export const getDB = async () => {
  if (!db) {
    db = await SQLite.openDatabaseAsync('audiogram.db');
    await initDB(db);
  }
  return db;
};

const initDB = async (database) => {
  // Create table with session_type column (air | bone)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS tests (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      date          TEXT NOT NULL,
      ear           TEXT NOT NULL,
      session_type  TEXT NOT NULL DEFAULT 'air',
      results       TEXT NOT NULL,
      avg_threshold REAL,
      hearing_level TEXT,
      synced        INTEGER DEFAULT 0,
      remote_id     TEXT DEFAULT NULL
    );
  `);

  // Migration: add session_type column if it doesn't exist (for existing installs)
  try {
    await database.execAsync(`ALTER TABLE tests ADD COLUMN session_type TEXT NOT NULL DEFAULT 'air';`);
  } catch (_) {
    // Column already exists — ignore
  }
};

export const saveTestResult = async (ear, sessionType = 'air', results, avgThreshold, hearingLevel, remoteId = null) => {
  const database = await getDB();
  const date = new Date().toISOString();
  const resultsJson = JSON.stringify(results);

  const result = await database.runAsync(
    'INSERT INTO tests (date, ear, session_type, results, avg_threshold, hearing_level, remote_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [date, ear, sessionType, resultsJson, avgThreshold, hearingLevel, remoteId ? String(remoteId) : null]
  );
  return result.lastInsertRowId;
};

export const getAllTests = async () => {
  const database = await getDB();
  const rows = await database.getAllAsync('SELECT * FROM tests ORDER BY date DESC');
  return rows.map(row => ({
    ...row,
    session_type: row.session_type ?? 'air',
    results: JSON.parse(row.results),
  }));
};

export const deleteTest = async (id) => {
  const database = await getDB();
  await database.runAsync('DELETE FROM tests WHERE id = ?', [id]);
};

export const clearAllTests = async () => {
  const database = await getDB();
  await database.runAsync('DELETE FROM tests');
};
