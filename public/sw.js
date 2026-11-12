// Offline support for the installed game: network first (so updates arrive whenever there is a connection),
// falling back to the last copy saved here when offline.
// The build stamp is put into the name at build time (vite.config.ts): every deploy has its own cache, and the old ones are removed.
const CACHE = 'eterra-survivors-__BUILD__';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        // Only whole answers (200): a partial 206 (audio range request) would break the saved copy.
        if (res.status === 200) {
          const copy = res.clone();
          caches
            .open(CACHE)
            .then((c) => c.put(req, copy))
            .catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit ?? caches.match('./'))),
  );
});
