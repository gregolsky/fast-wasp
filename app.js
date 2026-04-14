import { renderFast, renderWeight, renderStats, renderSettings, renderCravings, clearTick } from './js/ui.js';

const view    = document.getElementById('view');
const tabs    = document.querySelectorAll('.tab');

const VIEWS = {
  fast:     renderFast,
  weight:   renderWeight,
  cravings: renderCravings,
  stats:    renderStats,
  settings: renderSettings,
};

let _active = null;

function navigate(name) {
  if (_active === name) return;
  _active = name;
  clearTick();

  tabs.forEach(t => t.classList.toggle('active', t.dataset.view === name));
  const fn = VIEWS[name];
  if (fn) fn(view);
}

tabs.forEach(t => t.addEventListener('click', () => navigate(t.dataset.view)));

// Default view
navigate('fast');

// ── Service Worker ────────────────────────────────────────────
if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}
