// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { logCraving, getCravingStats, getStreak, getLast30Days } from '../../js/cravings.js';
import { pushCraving } from '../../js/storage.js';

function isoDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ── logCraving ───────────────────────────────────────────────
describe('logCraving', () => {
  it('returns an entry with id and at', () => {
    const e = logCraving();
    expect(e.id).toBeTruthy();
    expect(typeof e.at).toBe('string');
  });
});

// ── getCravingStats ──────────────────────────────────────────
describe('getCravingStats', () => {
  it('returns zeros when no cravings', () => {
    expect(getCravingStats()).toEqual({ daily: 0, weekly: 0, monthly: 0, total: 0 });
  });

  it('counts a craving logged now in all buckets', () => {
    logCraving();
    const s = getCravingStats();
    expect(s.daily).toBe(1);
    expect(s.weekly).toBe(1);
    expect(s.monthly).toBe(1);
    expect(s.total).toBe(1);
  });

  it('does not count a 2-day-old craving in daily', () => {
    pushCraving({ id: 'old', at: isoDaysAgo(2) });
    logCraving();
    const s = getCravingStats();
    expect(s.daily).toBe(1);
    expect(s.total).toBe(2);
  });

  it('does not count a 35-day-old craving in monthly', () => {
    pushCraving({ id: 'ancient', at: isoDaysAgo(35) });
    const s = getCravingStats();
    expect(s.monthly).toBe(0);
    expect(s.total).toBe(1);
  });

  it('multiple cravings today all counted', () => {
    logCraving(); logCraving(); logCraving();
    expect(getCravingStats().daily).toBe(3);
  });
});

// ── getStreak ────────────────────────────────────────────────
describe('getStreak', () => {
  it('returns 0 with no cravings', () => {
    expect(getStreak()).toBe(0);
  });

  it('returns 1 when only today has cravings', () => {
    logCraving();
    expect(getStreak()).toBe(1);
  });

  it('returns 2 for today and yesterday', () => {
    logCraving();
    pushCraving({ id: 'y', at: isoDaysAgo(1) });
    expect(getStreak()).toBe(2);
  });

  it('breaks streak on a gap day', () => {
    logCraving();
    pushCraving({ id: 'two', at: isoDaysAgo(2) }); // gap: no craving yesterday
    expect(getStreak()).toBe(1);
  });
});

// ── getLast30Days ────────────────────────────────────────────
describe('getLast30Days', () => {
  it('always returns exactly 30 entries', () => {
    expect(getLast30Days()).toHaveLength(30);
  });

  it('returns zero counts when no cravings', () => {
    expect(getLast30Days().every(d => d.count === 0)).toBe(true);
  });

  it('reflects cravings logged today', () => {
    logCraving(); logCraving();
    const days = getLast30Days();
    expect(days[days.length - 1].count).toBe(2);
  });

  it('entries are oldest-first', () => {
    const days = getLast30Days();
    expect(days[0].key < days[days.length - 1].key).toBe(true);
  });

  it('does not include cravings older than 30 days', () => {
    pushCraving({ id: 'old', at: isoDaysAgo(31) });
    expect(getLast30Days().every(d => d.count === 0)).toBe(true);
  });
});
