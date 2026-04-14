// Copyright 2025 Grzegorz Lachowski
// SPDX-License-Identifier: Apache-2.0
import {
  renderFast, renderWeight, renderStats, renderSettings, renderCravings, clearTick,
} from './js/ui.js';
import { getSettings } from './js/storage.js';

const view = document.getElementById('view');

const VIEWS = {
  fast:     renderFast,
  weight:   renderWeight,
  cravings: renderCravings,
  stats:    renderStats,
  settings: renderSettings,
};

let _active = null;

export function navigate(name) {
  if (_active === name) return;
  _active = name;
  clearTick();

  // Update top nav active state
  document.querySelectorAll('[data-view]').forEach(el =>
    el.classList.toggle('active', el.dataset.view === name)
  );

  // Close hamburger if open
  closeHamburger();

  const fn = VIEWS[name];
  if (fn) fn(view);
}

// ── Top nav clicks ────────────────────────────────────────────
document.querySelectorAll('.topnav-btn[data-view]').forEach(btn =>
  btn.addEventListener('click', () => navigate(btn.dataset.view))
);

// ── Hamburger ─────────────────────────────────────────────────
const hamburgerBtn = document.getElementById('hamburger-btn');
const hmenu        = document.getElementById('hmenu');

function openHamburger() {
  hmenu.classList.add('open');
  hamburgerBtn.setAttribute('aria-expanded', 'true');
}
function closeHamburger() {
  hmenu.classList.remove('open');
  hamburgerBtn.setAttribute('aria-expanded', 'false');
}
function toggleHamburger() {
  hmenu.classList.contains('open') ? closeHamburger() : openHamburger();
}

hamburgerBtn.addEventListener('click', e => { e.stopPropagation(); toggleHamburger(); });

document.querySelectorAll('#hmenu [data-view]').forEach(btn =>
  btn.addEventListener('click', () => navigate(btn.dataset.view))
);

// Close hamburger when clicking outside
document.addEventListener('click', e => {
  if (!hmenu.contains(e.target) && e.target !== hamburgerBtn) closeHamburger();
});

// ── Service Worker ────────────────────────────────────────────
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err =>
      console.warn('SW registration failed:', err)
    );
  });
}

// ── Boot ──────────────────────────────────────────────────────
const name = getSettings().name?.trim();
navigate(name ? 'fast' : 'fast'); // always fast — onboarding rendered inside renderFast
