const CACHE = 'smartstudy-v1';
const ASSETS = [
  '/', '/index.html', '/manifest.webmanifest', '/css/styles.css',
  '/js/app.js', '/js/ui.js', '/js/storage.js', '/js/api.js',
  '/js/tutor.js', '/js/quiz.js', '/js/essay.js', '/js/calc.js', '/js/settings.js',
  '/icons/icon.svg', '/icons/icon-maskable.svg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (url.pathname.startsWith('/api/')) {
    e.respondWith(
      fetch(request).catch(() =>
        new Response(JSON.stringify({ ok: false, error: 'Anda sedang offline.' }), {
          headers: { 'Content-Type': 'application/json' }, status: 503
        })
      )
    );
    return;
  }

  if (request.mode === 'navigate') {
    e.respondWith(caches.match('/index.html').then(r => r || fetch(request)));
    return;
  }

  e.respondWith(
    caches.match(request).then(cached => cached || fetch(request).then(res => {
      if (res.ok && request.method === 'GET') {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
      }
      return res;
    }))
  );
});
