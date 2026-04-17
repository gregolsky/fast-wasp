// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { describe, it, expect } from 'vitest';
import { validateWeight, toKg, fromKg } from '../../js/weight.js';

describe('validateWeight', () => {
  it('rejects empty string',  () => expect(validateWeight('').ok).toBe(false));
  it('rejects non-numeric',   () => expect(validateWeight('abc').ok).toBe(false));
  it('rejects zero',          () => expect(validateWeight('0').ok).toBe(false));
  it('rejects negative',      () => expect(validateWeight('-5').ok).toBe(false));
  it('rejects above max',     () => expect(validateWeight('501').ok).toBe(false));
  it('accepts 1',             () => expect(validateWeight('1').ok).toBe(true));
  it('accepts 75.5',          () => expect(validateWeight('75.5').ok).toBe(true));
  it('accepts 500',           () => expect(validateWeight('500').ok).toBe(true));

  it('returns error text for empty',   () => expect(validateWeight('').error).toMatch(/valid weight/i));
  it('returns error text for below 1', () => expect(validateWeight('0').error).toMatch(/at least 1/i));
  it('returns error text for above 500', () => expect(validateWeight('999').error).toMatch(/500 or less/i));
  it('returns empty error on valid',   () => expect(validateWeight('80').error).toBe(''));
});

describe('toKg / fromKg', () => {
  it('converts lb to kg',  () => expect(toKg(165, 'lb')).toBeCloseTo(74.84));
  it('identity for kg',    () => expect(toKg(75, 'kg')).toBe(75));
  it('converts kg to lb',  () => expect(fromKg(74.84, 'lb')).toBeCloseTo(165.0, 0));
  it('identity fromKg kg', () => expect(fromKg(75, 'kg')).toBe(75));
});
