import {
  getActiveFast, saveActiveFast, clearActiveFast,
  pushFastHistory, uid,
  getOmad, saveOmad, clearOmad, getOmadHistory, pushOmadHistory, getFastHistory
} from './storage.js';

export const PROGRAMS = [
  { id: '12:12',   label: '12:12', sub: 'Beginner',   hours: 12 },
  { id: '14:10',   label: '14:10', sub: 'Crescendo',  hours: 14 },
  { id: '16:8',    label: '16:8',  sub: 'Leangains',  hours: 16 },
  { id: '18:6',    label: '18:6',  sub: '',            hours: 18 },
  { id: '20:4',    label: '20:4',  sub: 'Warrior',    hours: 20 },
  { id: 'omad',    label: 'OMAD',  sub: 'One Meal/Day', hours: 23, omad: true },
  { id: 'custom',  label: 'Custom', sub: 'Set hours',  hours: null, custom: true },
];

// ── Timer arithmetic ──────────────────────────────────────────
export function elapsed(startedAt) {
  return (Date.now() - new Date(startedAt).getTime()) / 1000; // seconds
}

export function remaining(startedAt, targetHours) {
  return targetHours * 3600 - elapsed(startedAt); // seconds, negative = overtime
}

export function formatHMS(seconds) {
  const abs = Math.abs(Math.floor(seconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// ── Active fast control ───────────────────────────────────────
export function startFast(programId, targetHours) {
  saveActiveFast({
    id: uid(),
    startedAt: new Date().toISOString(),
    targetHours,
    programId,
  });
}

export function stopFast() {
  const active = getActiveFast();
  if (!active) return;
  const endedAt = new Date().toISOString();
  const actualSec = elapsed(active.startedAt);
  const targetSec = active.targetHours * 3600;
  const overtimeSec = Math.max(0, actualSec - targetSec);
  pushFastHistory({
    id: active.id,
    startedAt: active.startedAt,
    endedAt,
    targetHours: active.targetHours,
    actualHours: +(actualSec / 3600).toFixed(2),
    overtimeHours: +(overtimeSec / 3600).toFixed(2),
    programId: active.programId,
  });
  clearActiveFast();
}

export function getActiveFastState() {
  return getActiveFast();
}

// ── OMAD control ──────────────────────────────────────────────
export function logMeal(targetHours = 23) {
  const prev = getOmad();
  if (prev) {
    // Record fast from last meal to now
    const endedAt = new Date().toISOString();
    const actualSec = elapsed(prev.lastMealAt);
    const targetSec = prev.targetHours * 3600;
    const overtimeSec = Math.max(0, actualSec - targetSec);
    pushFastHistory({
      id: uid(),
      startedAt: prev.lastMealAt,
      endedAt,
      targetHours: prev.targetHours,
      actualHours: +(actualSec / 3600).toFixed(2),
      overtimeHours: +(overtimeSec / 3600).toFixed(2),
      programId: 'omad',
    });
  }
  const entry = { id: uid(), at: new Date().toISOString() };
  pushOmadHistory(entry);
  saveOmad({ lastMealAt: entry.at, targetHours });
}

export function getOmadState() {
  return getOmad();
}

export { getFastHistory, getOmadHistory };
