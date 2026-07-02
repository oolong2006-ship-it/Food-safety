/* ============================================================
   sw.js — Service Worker لتشغيل التطبيق دون اتصال (PWA)
   استراتيجية: تخزين مسبق لهيكل التطبيق + cache-first للأصول المحلية
   ============================================================ */
const CACHE = 'fs-gmp-v7';

// أصول هيكل التطبيق (تُخزّن مسبقًا عند التثبيت)
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './assets/css/style.css',
  './assets/js/icons.js',
  './assets/js/store.js',
  './assets/js/standards.js',
  './assets/js/nutrition.js',
  './assets/js/ai.js',
  './assets/js/ui.js',
  './assets/js/config.js',
  './assets/js/cloud.js',
  './assets/js/views.js',
  './assets/js/reports.js',
  './assets/js/app.js',
  './assets/icons/logo.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // لا نخزّن طلبات Claude API أبدًا — تمرّ مباشرة للشبكة
  if (url.hostname.includes('api.anthropic.com')) return;

  // طلبات التنقل: قدّم index.html (يعمل دون اتصال)
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // الأصول المحلية: cache-first مع تحديث في الخلفية
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req).then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // أصول خارجية (مثل خطوط Google): cache-first انتهازي
  e.respondWith(
    caches.match(req).then((cached) =>
      cached || fetch(req).then((res) => {
        if (res && (res.status === 200 || res.type === 'opaque')) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached)
    )
  );
});
