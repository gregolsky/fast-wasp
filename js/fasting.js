// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import {
  getActiveFast, saveActiveFast, clearActiveFast,
  pushFastHistory, uid,
  getOmad, saveOmad, clearOmad, getOmadHistory, pushOmadHistory, getFastHistory,
  getActiveConsumption, saveActiveConsumption, clearActiveConsumption,
  pushConsumptionHistory, getConsumptionHistory,
} from './storage.js';

export const PROGRAMS = [
  { id: '12:12', label: '12:12', sub: 'Beginner',    hours: 12, eatHours: 12 },
  { id: '14:10', label: '14:10', sub: 'Crescendo',   hours: 14, eatHours: 10 },
  { id: '16:8',  label: '16:8',  sub: 'Leangains',   hours: 16, eatHours:  8 },
  { id: '18:6',  label: '18:6',  sub: '',             hours: 18, eatHours:  6 },
  { id: '20:4',  label: '20:4',  sub: 'Warrior',     hours: 20, eatHours:  4 },
  { id: 'omad',  label: 'OMAD',  sub: 'One Meal/Day',hours: 23, eatHours:  1, omad: true },
  { id: 'custom',label: 'Custom',sub: 'Set hours',   hours: null, eatHours: null, custom: true },
];

export function getProgramById(id) {
  return PROGRAMS.find(p => p.id === id) ?? null;
}

// ── Timer arithmetic ──────────────────────────────────────────
export function elapsed(startedAt) {
  return (Date.now() - new Date(startedAt).getTime()) / 1000; // seconds
}

export function remaining(startedAt, targetHours) {
  return targetHours * 3600 - elapsed(startedAt); // negative = overtime
}

export function formatHMS(totalSeconds) {
  const abs = Math.abs(Math.floor(totalSeconds));
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = abs % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':');
}

// ── Active fast ───────────────────────────────────────────────
export function startFast(programId, fastHours, eatHours) {
  // If there's an active consumption window, close it first
  const consumption = getActiveConsumption();
  if (consumption) {
    const endedAt = new Date().toISOString();
    const actualSec = elapsed(consumption.startedAt);
    const targetSec = consumption.targetHours * 3600;
    pushConsumptionHistory({
      id: consumption.id,
      startedAt: consumption.startedAt,
      endedAt,
      targetHours: consumption.targetHours,
      actualHours: +(actualSec / 3600).toFixed(2),
      overtimeHours: +(Math.max(0, actualSec - targetSec) / 3600).toFixed(2),
      programId: consumption.programId,
    });
    clearActiveConsumption();
  }
  saveActiveFast({
    id: uid(),
    startedAt: new Date().toISOString(),
    targetHours: fastHours,
    eatHours,
    programId,
  });
}

export function stopFast() {
  const active = getActiveFast();
  if (!active) return;
  const endedAt = new Date().toISOString();
  const actualSec = elapsed(active.startedAt);
  const targetSec = active.targetHours * 3600;
  pushFastHistory({
    id: active.id,
    startedAt: active.startedAt,
    endedAt,
    targetHours: active.targetHours,
    actualHours: +(actualSec / 3600).toFixed(2),
    overtimeHours: +(Math.max(0, actualSec - targetSec) / 3600).toFixed(2),
    programId: active.programId,
  });
  clearActiveFast();
  // Start the eating/consumption window
  if (active.eatHours > 0) {
    saveActiveConsumption({
      id: uid(),
      startedAt: endedAt,
      targetHours: active.eatHours,
      programId: active.programId,
    });
  }
}

export function stopConsumption() {
  const c = getActiveConsumption();
  if (!c) return;
  const endedAt = new Date().toISOString();
  const actualSec = elapsed(c.startedAt);
  const targetSec = c.targetHours * 3600;
  pushConsumptionHistory({
    id: c.id,
    startedAt: c.startedAt,
    endedAt,
    targetHours: c.targetHours,
    actualHours: +(actualSec / 3600).toFixed(2),
    overtimeHours: +(Math.max(0, actualSec - targetSec) / 3600).toFixed(2),
    programId: c.programId,
  });
  clearActiveConsumption();
}

export function getActiveFastState() { return getActiveFast(); }
export { getActiveConsumption, getConsumptionHistory };

// ── OMAD ──────────────────────────────────────────────────────
export function logMeal(targetHours = 23) {
  const prev = getOmad();
  if (prev) {
    const endedAt = new Date().toISOString();
    const actualSec = elapsed(prev.lastMealAt);
    const targetSec = prev.targetHours * 3600;
    pushFastHistory({
      id: uid(),
      startedAt: prev.lastMealAt,
      endedAt,
      targetHours: prev.targetHours,
      actualHours: +(actualSec / 3600).toFixed(2),
      overtimeHours: +(Math.max(0, actualSec - targetSec) / 3600).toFixed(2),
      programId: 'omad',
    });
  }
  const entry = { id: uid(), at: new Date().toISOString() };
  pushOmadHistory(entry);
  saveOmad({ lastMealAt: entry.at, targetHours });
}

export function getOmadState() { return getOmad(); }
export { getFastHistory, getOmadHistory };
