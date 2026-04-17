// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.click('[data-view="weight"]');
  // Clear any existing localStorage weight data so tests are isolated
  await page.evaluate(() => {
    const key = Object.keys(localStorage).find(k => k.includes('weight'));
    if (key) localStorage.removeItem(key);
  });
  // Re-navigate to get a clean render
  await page.click('[data-view="fast"]');
  await page.click('[data-view="weight"]');
});

test('shows error for empty weight', async ({ page }) => {
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).toHaveText(/valid weight/i);
});

test('shows error for zero weight', async ({ page }) => {
  await page.fill('#w-val', '0');
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).toHaveText(/at least 1/i);
});

test('shows error for negative weight', async ({ page }) => {
  await page.fill('#w-val', '-10');
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).toHaveText(/at least 1/i);
});

test('shows error for weight above 500', async ({ page }) => {
  await page.fill('#w-val', '999');
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).toHaveText(/500 or less/i);
});

test('input gets error styling on invalid entry', async ({ page }) => {
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val')).toHaveClass(/input-error/);
});

test('clears error and saves a valid weight entry', async ({ page }) => {
  await page.fill('#w-val', '75.5');
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).toHaveText('');
  await expect(page.locator('.entry-list .entry-item')).toHaveCount(1);
});

test('error clears when a valid value is saved after invalid attempt', async ({ page }) => {
  // First trigger the error
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).not.toHaveText('');

  // Then enter valid value
  await page.fill('#w-val', '80');
  await page.click('#save-weight-btn');
  await expect(page.locator('#w-val-error')).toHaveText('');
});
