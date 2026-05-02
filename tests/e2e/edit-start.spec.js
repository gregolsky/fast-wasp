// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import { test, expect } from '@playwright/test';

function toLocalDT(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // Inject settings + an active 16:8 fast started 30 minutes ago
  const startedAt = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  await page.evaluate((startedAt) => {
    localStorage.setItem('fastfast.v1.settings', JSON.stringify({
      unit: 'kg', name: 'Test', selectedProgramId: '16:8',
    }));
    localStorage.setItem('fastfast.v1.activeFast', JSON.stringify({
      id: 'test1', startedAt, targetHours: 16, eatHours: 8, programId: '16:8',
    }));
  }, startedAt);
  // Re-render the fast view with injected state
  await page.click('[data-view="weight"]');
  await page.click('[data-view="fast"]');
});

test('edit start time button is visible below the timer', async ({ page }) => {
  await expect(page.locator('#edit-start-btn')).toBeVisible();
});

test('clicking edit button reveals the panel', async ({ page }) => {
  await expect(page.locator('#edit-start-panel')).toBeHidden();
  await page.click('#edit-start-btn');
  await expect(page.locator('#edit-start-panel')).toBeVisible();
});

test('edit start time updates the timer', async ({ page }) => {
  // Current state: ~30 min elapsed → timer shows ~15:29:xx remaining
  // After edit: 2 hours ago → timer should show ~14:xx:xx remaining
  const twoHoursAgo = new Date(Date.now() - 2 * 3600 * 1000);

  await page.click('#edit-start-btn');
  await page.fill('#edit-start-input', toLocalDT(twoHoursAgo));
  await page.click('#edit-start-save');

  // Panel should close and timer should reflect ~14h remaining (13:5x–14:0x depending on test speed)
  await expect(page.locator('#edit-start-panel')).toBeHidden();
  await expect(page.locator('#timer-digits')).toContainText(/^1[34]:/);
});

test('rejects a future start time and shows an error', async ({ page }) => {
  const future = new Date(Date.now() + 3600 * 1000);

  await page.click('#edit-start-btn');
  await page.fill('#edit-start-input', toLocalDT(future));
  await page.click('#edit-start-save');

  await expect(page.locator('#edit-start-error')).not.toBeEmpty();
  // Panel stays open
  await expect(page.locator('#edit-start-panel')).toBeVisible();
});

test('cancel hides the panel without changing the timer', async ({ page }) => {
  const digits = await page.locator('#timer-digits').textContent();

  await page.click('#edit-start-btn');
  await page.fill('#edit-start-input', toLocalDT(new Date(Date.now() - 5 * 3600 * 1000)));
  await page.click('#edit-start-cancel');

  await expect(page.locator('#edit-start-panel')).toBeHidden();
  // Timer digits should be unchanged (within 1 second tolerance handled by substring check)
  const newDigits = await page.locator('#timer-digits').textContent();
  expect(newDigits.slice(0, 3)).toBe(digits.slice(0, 3)); // same hours part
});
