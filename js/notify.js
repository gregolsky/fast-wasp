// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
// ─────────────────────────────────────────────────────────────
// Notifications — Web Notifications API wrapper
// ─────────────────────────────────────────────────────────────

export function notificationsSupported() {
  return 'Notification' in window;
}

export function notificationPermission() {
  return notificationsSupported() ? Notification.permission : 'denied';
}

export async function requestPermission() {
  if (!notificationsSupported()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied')  return 'denied';
  return Notification.requestPermission();
}

export function canNotify() {
  return notificationsSupported() && Notification.permission === 'granted';
}

// Show a notification via SW (works when tab is backgrounded) or
// fall back to new Notification() when SW isn't available.
export async function notify(title, body, opts = {}) {
  if (!canNotify()) return;
  const icon = './favicon.png';
  const badge = './favicon.png';
  try {
    const sw = navigator.serviceWorker?.controller;
    if (sw) {
      const reg = await navigator.serviceWorker.ready;
      await reg.showNotification(title, { body, icon, badge, ...opts });
    } else {
      new Notification(title, { body, icon, ...opts });
    }
  } catch {
    // Silently ignore — notifications are optional
  }
}

// ── Dedup guard — only fire each notification once per session ─
const _fired = new Set();

export function notifyOnce(key, title, body, opts = {}) {
  if (_fired.has(key)) return;
  _fired.add(key);
  notify(title, body, opts);
}

export function clearNotifyKey(key) {
  _fired.delete(key);
}
