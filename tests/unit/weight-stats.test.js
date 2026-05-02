// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { get3MonthStats, getChartData, addWeightEntry, getWeightDisplay } from '../../js/weight.js';
import { addWeight } from '../../js/storage.js';

function isoAt(daysAgo) {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

beforeEach(() => localStorage.clear());
afterEach(() => localStorage.clear());

// ── get3MonthStats ───────────────────────────────────────────
describe('get3MonthStats', () => {
  it('returns null with no entries', () => {
    expect(get3MonthStats('kg')).toBeNull();
  });

  it('returns null with a single entry', () => {
    addWeight({ id: '1', at: isoAt(5), kg: 80 });
    expect(get3MonthStats('kg')).toBeNull();
  });

  it('computes delta between first and last in window', () => {
    addWeight({ id: '1', at: isoAt(30), kg: 82 });
    addWeight({ id: '2', at: isoAt(0),  kg: 80 });
    const s = get3MonthStats('kg');
    expect(s).not.toBeNull();
    expect(s.from).toBe(82);
    expect(s.to).toBe(80);
    expect(s.delta).toBeCloseTo(-2);
    expect(s.entries).toBe(2);
  });

  it('trend is "down" when lost weight', () => {
    addWeight({ id: '1', at: isoAt(10), kg: 85 });
    addWeight({ id: '2', at: isoAt(0),  kg: 80 });
    expect(get3MonthStats('kg').trend).toBe('down');
  });

  it('trend is "up" when gained weight', () => {
    addWeight({ id: '1', at: isoAt(10), kg: 75 });
    addWeight({ id: '2', at: isoAt(0),  kg: 80 });
    expect(get3MonthStats('kg').trend).toBe('up');
  });

  it('trend is "neutral" for tiny change', () => {
    addWeight({ id: '1', at: isoAt(10), kg: 80 });
    addWeight({ id: '2', at: isoAt(0),  kg: 80.02 });
    expect(get3MonthStats('kg').trend).toBe('neutral');
  });

  it('falls back to all entries when window has < 2', () => {
    // Only one entry within 90 days, but two total
    addWeight({ id: '1', at: isoAt(200), kg: 90 });
    addWeight({ id: '2', at: isoAt(0),   kg: 80 });
    const s = get3MonthStats('kg');
    expect(s).not.toBeNull();
    expect(s.entries).toBe(2);
  });

  it('converts to lb when unit is lb', () => {
    addWeight({ id: '1', at: isoAt(5), kg: 70 });
    addWeight({ id: '2', at: isoAt(0), kg: 65 });
    const s = get3MonthStats('lb');
    expect(s.unit).toBe('lb');
    expect(s.from).toBeCloseTo(154.3, 0);
    expect(s.to).toBeCloseTo(143.3, 0);
  });

  it('computes min, max, avg correctly', () => {
    addWeight({ id: '1', at: isoAt(20), kg: 80 });
    addWeight({ id: '2', at: isoAt(10), kg: 78 });
    addWeight({ id: '3', at: isoAt(0),  kg: 76 });
    const s = get3MonthStats('kg');
    expect(s.min).toBe(76);
    expect(s.max).toBe(80);
    expect(s.avg).toBeCloseTo(78, 0);
  });
});

// ── getChartData ─────────────────────────────────────────────
describe('getChartData', () => {
  it('returns empty array with no entries', () => {
    expect(getChartData('kg')).toEqual([]);
  });

  it('returns {x, y} pairs in kg', () => {
    addWeight({ id: '1', at: isoAt(5), kg: 80 });
    const data = getChartData('kg');
    expect(data).toHaveLength(1);
    expect(data[0].y).toBe(80);
    expect(data[0].x).toBeTruthy();
  });

  it('filters by rangeDays', () => {
    addWeight({ id: '1', at: isoAt(60), kg: 85 });
    addWeight({ id: '2', at: isoAt(5),  kg: 80 });
    const data = getChartData('kg', 30);
    expect(data).toHaveLength(1);
    expect(data[0].y).toBe(80);
  });

  it('no filter when rangeDays is Infinity', () => {
    addWeight({ id: '1', at: isoAt(200), kg: 90 });
    addWeight({ id: '2', at: isoAt(0),   kg: 80 });
    expect(getChartData('kg', Infinity)).toHaveLength(2);
  });
});

// ── addWeightEntry / getWeightDisplay ─────────────────────────
describe('addWeightEntry', () => {
  it('stores a kg entry directly', () => {
    addWeightEntry(isoAt(0), '75', 'kg');
    const entries = getWeightDisplay('kg');
    expect(entries).toHaveLength(1);
    expect(entries[0].display).toBe(75);
  });

  it('converts lb to kg on save', () => {
    addWeightEntry(isoAt(0), '165', 'lb');
    const entries = getWeightDisplay('kg');
    expect(entries[0].kg).toBeCloseTo(74.84, 1);
  });
});
