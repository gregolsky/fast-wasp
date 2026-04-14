// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
const SCHEMA_VERSION = 1;
const NS = 'fastfast.v1';

const KEYS = {
  schema:             `${NS}.schemaVersion`,
  settings:           `${NS}.settings`,
  activeFast:         `${NS}.activeFast`,
  fastHistory:        `${NS}.fastHistory`,
  activeConsumption:  `${NS}.activeConsumption`,
  consumptionHistory: `${NS}.consumptionHistory`,
  weights:            `${NS}.weights`,
  omad:               `${NS}.omad`,
  omadHistory:        `${NS}.omadHistory`,
  cravings:           `${NS}.cravings`,
};

function get(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
  } catch { return fallback; }
}

function set(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function migrate() {
  const ver = get(KEYS.schema, 0);
  if (ver < SCHEMA_VERSION) {
    set(KEYS.schema, SCHEMA_VERSION);
  }
}

migrate();

// ── Settings ──────────────────────────────────────────────────
export function getSettings() {
  return get(KEYS.settings, { unit: 'kg' });
}
export function saveSettings(s) {
  set(KEYS.settings, s);
}

// ── Active fast ───────────────────────────────────────────────
export function getActiveFast() {
  return get(KEYS.activeFast, null);
}
export function saveActiveFast(f) {
  set(KEYS.activeFast, f);
}
export function clearActiveFast() {
  localStorage.removeItem(KEYS.activeFast);
}

// ── Fast history ──────────────────────────────────────────────
export function getFastHistory() {
  return get(KEYS.fastHistory, []);
}
export function pushFastHistory(entry) {
  const hist = getFastHistory();
  hist.unshift(entry);
  set(KEYS.fastHistory, hist);
}

// ── Weights ───────────────────────────────────────────────────
export function getWeights() {
  return get(KEYS.weights, []);
}
export function saveWeights(arr) {
  set(KEYS.weights, arr);
}
export function addWeight(entry) {
  const arr = getWeights();
  arr.push(entry);
  arr.sort((a, b) => a.at.localeCompare(b.at));
  set(KEYS.weights, arr);
}
export function deleteWeight(id) {
  const arr = getWeights().filter(w => w.id !== id);
  set(KEYS.weights, arr);
}
export function updateWeight(id, patch) {
  const arr = getWeights().map(w => w.id === id ? { ...w, ...patch } : w);
  arr.sort((a, b) => a.at.localeCompare(b.at));
  set(KEYS.weights, arr);
}

// ── OMAD ──────────────────────────────────────────────────────
export function getOmad() {
  return get(KEYS.omad, null);
}
export function saveOmad(s) {
  set(KEYS.omad, s);
}
export function clearOmad() {
  localStorage.removeItem(KEYS.omad);
}
export function getOmadHistory() {
  return get(KEYS.omadHistory, []);
}
export function pushOmadHistory(entry) {
  const hist = getOmadHistory();
  hist.unshift(entry);
  set(KEYS.omadHistory, hist);
}

// ── Active consumption window ─────────────────────────────────
export function getActiveConsumption() {
  return get(KEYS.activeConsumption, null);
}
export function saveActiveConsumption(c) {
  set(KEYS.activeConsumption, c);
}
export function clearActiveConsumption() {
  localStorage.removeItem(KEYS.activeConsumption);
}
export function getConsumptionHistory() {
  return get(KEYS.consumptionHistory, []);
}
export function pushConsumptionHistory(entry) {
  const hist = getConsumptionHistory();
  hist.unshift(entry);
  set(KEYS.consumptionHistory, hist);
}

// ── Cravings ──────────────────────────────────────────────────
export function getCravings() {
  return get(KEYS.cravings, []);
}
export function pushCraving(entry) {
  const arr = getCravings();
  arr.unshift(entry);
  set(KEYS.cravings, arr);
}
export function deleteLastCraving() {
  const arr = getCravings();
  if (!arr.length) return;
  arr.shift();
  set(KEYS.cravings, arr);
}

// ── Helpers ───────────────────────────────────────────────────
export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
