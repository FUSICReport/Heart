const CACHE = 'fusic-hd-v2';
const PRECACHE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './FHD.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then(cache =>
      cache.match(e.request).then(cached => {
        const fetchPromise = fetch(e.request).then(network => {
          if (network && network.ok) {
            const clone = network.clone();
            cache.put(e.request, network.clone()).then(async () => {
              if (cached) {
                const oldBody = await cached.clone().text();
                const newBody = await clone.text();
                if (oldBody !== newBody) {
                  const clients = await self.clients.matchAll({ type: 'window' });
                  clients.forEach(c => c.postMessage({ type: 'update-available' }));
                }
              }
            });
          }
          return network;
        }).catch(() => cached);

        return cached || fetchPromise;
      })
    )
  );
});
