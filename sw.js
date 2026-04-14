const CACHE = 'fastwasp-v2';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './favicon.png',
  './manifest.webmanifest',
  './js/storage.js',
  './js/fasting.js',
  './js/weight.js',
  './js/chart.js',
  './js/cravings.js',
  './js/ui.js',
];

const CDN_ORIGINS = ['cdn.jsdelivr.net', 'cdnjs.cloudflare.com'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (CDN_ORIGINS.includes(url.hostname)) {
    e.respondWith(staleWhileRevalidate(e.request));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request))
  );
});

async function staleWhileRevalidate(req) {
  const cache  = await caches.open(CACHE);
  const cached = await cache.match(req);
  const fresh  = fetch(req).then(res => {
    if (res.ok) cache.put(req, res.clone());
    return res;
  }).catch(() => null);
  return cached || await fresh;
}
