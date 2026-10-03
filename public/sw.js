const CACHE = 'smartstudy-v3';

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const { request } = e;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // API: SELALU network, tidak boleh cache
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

  // Aset lain: NETWORK-FIRST. Cache hanya sebagai fallback offline.
  e.respondWith(
    fetch(request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => caches.match(request).then(cached => cached || new Response('Offline', { status: 503 })))
  );
});
