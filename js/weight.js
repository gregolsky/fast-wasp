import { getWeights, addWeight, deleteWeight, updateWeight, uid } from './storage.js';

export const KG_PER_LB = 0.45359237;

export function toKg(value, unit) {
  return unit === 'lb' ? value * KG_PER_LB : value;
}
export function fromKg(kg, unit) {
  return unit === 'lb' ? +(kg / KG_PER_LB).toFixed(1) : +kg.toFixed(1);
}
export function unitLabel(unit) {
  return unit === 'lb' ? 'lb' : 'kg';
}

export function addWeightEntry(dateStr, value, unit) {
  const kg = toKg(parseFloat(value), unit);
  addWeight({ id: uid(), at: dateStr, kg });
}

export function deleteWeightEntry(id) {
  deleteWeight(id);
}

export function updateWeightEntry(id, dateStr, value, unit) {
  const kg = toKg(parseFloat(value), unit);
  updateWeight(id, { at: dateStr, kg });
}

export function getWeightEntries() {
  return getWeights(); // sorted by date asc
}

// Returns entries in display unit
export function getWeightDisplay(unit) {
  return getWeights().map(w => ({
    ...w,
    display: fromKg(w.kg, unit),
  }));
}

// ── Stats ─────────────────────────────────────────────────────
export function get3MonthStats(unit) {
  const entries = getWeights().filter(w => w.kg > 0);
  if (entries.length === 0) return null;

  const now = Date.now();
  const cutoff = now - 90 * 24 * 3600 * 1000;

  const window = entries.filter(w => new Date(w.at).getTime() >= cutoff);
  if (window.length < 2) {
    if (entries.length < 2) return null;
    // Fall back to all entries
    const first = entries[0];
    const last  = entries[entries.length - 1];
    return buildStats(first, last, entries, unit);
  }
  const first = window[0];
  const last  = window[window.length - 1];
  return buildStats(first, last, window, unit);
}

function buildStats(first, last, arr, unit) {
  const delta = last.kg - first.kg;
  const pct   = (delta / first.kg) * 100;
  const kgs   = arr.map(w => w.kg);
  return {
    from:    fromKg(first.kg, unit),
    to:      fromKg(last.kg, unit),
    delta:   fromKg(Math.abs(delta), unit) * Math.sign(delta),
    pct:     +pct.toFixed(1),
    min:     fromKg(Math.min(...kgs), unit),
    max:     fromKg(Math.max(...kgs), unit),
    avg:     fromKg(kgs.reduce((a, b) => a + b, 0) / kgs.length, unit),
    entries: arr.length,
    unit,
    trend:   delta < -0.05 ? 'down' : delta > 0.05 ? 'up' : 'neutral',
  };
}

// ── Chart data ────────────────────────────────────────────────
export function getChartData(unit, rangeDays) {
  let entries = getWeights();
  if (rangeDays && rangeDays !== Infinity) {
    const cutoff = Date.now() - rangeDays * 24 * 3600 * 1000;
    entries = entries.filter(w => new Date(w.at).getTime() >= cutoff);
  }
  return entries.map(w => ({ x: w.at, y: fromKg(w.kg, unit) }));
}
