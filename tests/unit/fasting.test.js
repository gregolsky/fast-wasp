// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatHMS, elapsed, remaining,
  getProgramById, PROGRAMS,
  startFast, stopFast, stopConsumption,
  getActiveFastState, getActiveConsumption,
  setActiveFastStart,
} from '../../js/fasting.js';
import { getFastHistory, getConsumptionHistory } from '../../js/storage.js';

function toLocalDT(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// ── formatHMS ────────────────────────────────────────────────
describe('formatHMS', () => {
  it('formats zero',               () => expect(formatHMS(0)).toBe('00:00:00'));
  it('formats seconds only',       () => expect(formatHMS(59)).toBe('00:00:59'));
  it('formats minutes and seconds',() => expect(formatHMS(90)).toBe('00:01:30'));
  it('formats hours',              () => expect(formatHMS(3661)).toBe('01:01:01'));
  it('formats 16 hours',           () => expect(formatHMS(16 * 3600)).toBe('16:00:00'));
  it('handles negative (overtime)',() => expect(formatHMS(-3661)).toBe('01:01:01'));
  it('truncates fractional seconds',() => expect(formatHMS(1.9)).toBe('00:00:01'));
});

// ── elapsed / remaining ──────────────────────────────────────
describe('elapsed', () => {
  it('returns seconds since startedAt', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 5000);
    const start = new Date(now).toISOString();
    expect(elapsed(start)).toBeCloseTo(5);
    vi.restoreAllMocks();
  });
});

describe('remaining', () => {
  it('returns positive when time left', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 3600 * 1000); // 1 h elapsed
    const start = new Date(now).toISOString();
    expect(remaining(start, 16)).toBeCloseTo(15 * 3600);
    vi.restoreAllMocks();
  });

  it('returns negative when overtime', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now + 17 * 3600 * 1000);
    const start = new Date(now).toISOString();
    expect(remaining(start, 16)).toBeLessThan(0);
    vi.restoreAllMocks();
  });
});

// ── getProgramById ───────────────────────────────────────────
describe('getProgramById', () => {
  it('finds 16:8',     () => expect(getProgramById('16:8').hours).toBe(16));
  it('finds omad',     () => expect(getProgramById('omad').omad).toBe(true));
  it('finds custom',   () => expect(getProgramById('custom').custom).toBe(true));
  it('returns null for unknown', () => expect(getProgramById('nope')).toBeNull());
  it('covers all PROGRAMS entries', () => {
    for (const p of PROGRAMS) {
      expect(getProgramById(p.id)).toBe(p);
    }
  });
});

// ── startFast / stopFast / stopConsumption ───────────────────
describe('startFast / stopFast / stopConsumption', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => localStorage.clear());

  it('startFast sets an active fast', () => {
    startFast('16:8', 16, 8);
    const state = getActiveFastState();
    expect(state).not.toBeNull();
    expect(state.programId).toBe('16:8');
    expect(state.targetHours).toBe(16);
    expect(state.eatHours).toBe(8);
  });

  it('stopFast records history and starts consumption window', () => {
    startFast('16:8', 16, 8);
    stopFast();
    expect(getActiveFastState()).toBeNull();
    const hist = getFastHistory();
    expect(hist.length).toBe(1);
    expect(hist[0].programId).toBe('16:8');
    const consumption = getActiveConsumption();
    expect(consumption).not.toBeNull();
    expect(consumption.targetHours).toBe(8);
  });

  it('stopFast with eatHours=0 does not start consumption window', () => {
    startFast('custom', 20, 0);
    stopFast();
    expect(getActiveConsumption()).toBeNull();
  });

  it('stopConsumption records consumption history', () => {
    startFast('16:8', 16, 8);
    stopFast();
    stopConsumption();
    expect(getActiveConsumption()).toBeNull();
    const hist = getConsumptionHistory();
    expect(hist.length).toBe(1);
    expect(hist[0].programId).toBe('16:8');
  });

  it('startFast while consumption is active closes the consumption window first', () => {
    startFast('16:8', 16, 8);
    stopFast(); // creates consumption window
    startFast('14:10', 14, 10); // should close old consumption and start new fast
    expect(getActiveConsumption()).toBeNull();
    const hist = getConsumptionHistory();
    expect(hist.length).toBe(1);
    const state = getActiveFastState();
    expect(state.programId).toBe('14:10');
  });
});

// ── setActiveFastStart ───────────────────────────────────────
describe('setActiveFastStart', () => {
  beforeEach(() => { localStorage.clear(); startFast('16:8', 16, 8); });
  afterEach(() => localStorage.clear());

  it('updates startedAt when given a valid past datetime', () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);
    const result = setActiveFastStart(toLocalDT(twoHoursAgo));
    expect(result.ok).toBe(true);
    expect(result.error).toBe('');
    const diff = Math.abs(new Date(getActiveFastState().startedAt).getTime() - twoHoursAgo.getTime());
    expect(diff).toBeLessThan(60 * 1000); // within 1 minute (input precision)
  });

  it('leaves startedAt unchanged on rejection', () => {
    const original = getActiveFastState().startedAt;
    setActiveFastStart(toLocalDT(new Date(Date.now() + 3600 * 1000)));
    expect(getActiveFastState().startedAt).toBe(original);
  });

  it('rejects a future datetime', () => {
    const result = setActiveFastStart(toLocalDT(new Date(Date.now() + 3600 * 1000)));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/future/i);
  });

  it('rejects datetime older than 14 days', () => {
    const result = setActiveFastStart(toLocalDT(new Date(Date.now() - 15 * 24 * 3600 * 1000)));
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/past/i);
  });

  it('rejects an unparseable string', () => {
    const result = setActiveFastStart('not-a-date');
    expect(result.ok).toBe(false);
  });

  it('is a no-op when there is no active fast', () => {
    localStorage.clear();
    expect(() => setActiveFastStart(toLocalDT(new Date(Date.now() - 3600 * 1000)))).not.toThrow();
  });
});
