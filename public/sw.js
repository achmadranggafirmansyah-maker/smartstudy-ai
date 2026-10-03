// SW dimatikan total — biarkan browser ambil file langsung dari server.
// Ini mencegah cache lama mengganggu update aplikasi.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(k => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.registration.unregister())
  );
});

self.addEventListener('fetch', () => { /* no-op: biarkan browser handle */ });
