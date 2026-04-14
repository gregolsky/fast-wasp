import { getCravings, pushCraving, deleteLastCraving, uid } from './storage.js';

export { getCravings, deleteLastCraving };

export function logCraving() {
  const entry = { id: uid(), at: new Date().toISOString() };
  pushCraving(entry);
  return entry;
}

// ── Date helpers ──────────────────────────────────────────────
function dayKey(iso) {
  // Returns "YYYY-MM-DD" in local time
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function todayKey() { return dayKey(new Date().toISOString()); }

function startOfWeek() {
  // Monday-based week start
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfMonth() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ── Stats ─────────────────────────────────────────────────────
export function getCravingStats() {
  const all = getCravings();
  const today   = todayKey();
  const weekStart  = startOfWeek().getTime();
  const monthStart = startOfMonth().getTime();

  let daily = 0, weekly = 0, monthly = 0;
  for (const c of all) {
    const t = new Date(c.at).getTime();
    if (dayKey(c.at) === today)   daily++;
    if (t >= weekStart)            weekly++;
    if (t >= monthStart)           monthly++;
  }

  return { daily, weekly, monthly, total: all.length };
}

// ── Resistance streak ─────────────────────────────────────────
// Counts consecutive calendar days (backwards from today) where
// the user pressed the panic button at least once.
export function getStreak() {
  const all = getCravings();
  if (!all.length) return 0;

  const daysWithResistance = new Set(all.map(c => dayKey(c.at)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);

  while (true) {
    const k = dayKey(cursor.toISOString());
    if (!daysWithResistance.has(k)) break;
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

// ── Calendar dots (last 30 days) ──────────────────────────────
// Returns array of { key, count } for the past 30 days, oldest first.
export function getLast30Days() {
  const all = getCravings();
  const counts = {};
  for (const c of all) {
    const k = dayKey(c.at);
    counts[k] = (counts[k] || 0) + 1;
  }

  const days = [];
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 29; i >= 0; i--) {
    const d = new Date(cursor);
    d.setDate(cursor.getDate() - i);
    const k = dayKey(d.toISOString());
    days.push({ key: k, count: counts[k] || 0 });
  }
  return days;
}
