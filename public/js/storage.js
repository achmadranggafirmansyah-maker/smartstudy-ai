const PREFIX = 'smartstudy:';

export const KEYS = {
  HISTORY: `${PREFIX}history`,
  SETTINGS: `${PREFIX}settings`,
  STATS: `${PREFIX}stats`
};

export const DEFAULT_SETTINGS = { theme: 'auto', reduceMotion: false, saveHistory: true };

export const DEFAULT_STATS = {
  tutorSessions: 0, quizAttempts: 0, quizCorrect: 0, quizTotal: 0, essayAttempts: 0, lastActive: null
};

export function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return structuredClone(fallback);
    return { ...structuredClone(fallback), ...JSON.parse(raw) };
  } catch { return structuredClone(fallback); }
}

export function write(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function remove(key) { try { localStorage.removeItem(key); } catch {} }

export function clearAll() { Object.values(KEYS).forEach(remove); }

export function getHistory() {
  try { return JSON.parse(localStorage.getItem(KEYS.HISTORY) || '[]'); }
  catch { return []; }
}

export function pushHistory(entry) {
  const settings = read(KEYS.SETTINGS, DEFAULT_SETTINGS);
  if (!settings.saveHistory) return;
  const list = getHistory();
  list.unshift({ id: crypto.randomUUID(), ts: Date.now(), ...entry });
  write(KEYS.HISTORY, list.slice(0, 100));
}

export function clearHistory() { remove(KEYS.HISTORY); }

export function getStats() { return read(KEYS.STATS, DEFAULT_STATS); }
export function setStats(patch) {
  const s = getStats();
  const next = { ...s, ...patch, lastActive: Date.now() };
  write(KEYS.STATS, next);
  return next;
}
export function bumpStat(field, delta = 1) {
  const s = getStats();
  s[field] = (s[field] || 0) + delta;
  s.lastActive = Date.now();
  write(KEYS.STATS, s);
  return s;
}
