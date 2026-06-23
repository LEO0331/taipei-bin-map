const CACHE_NAME = 'taipei-public-amenities-map-v10';
const APP_SHELL = [
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/data/facilities.json',
  '/data/pedestrian-bins.json',
  '/data/dog-waste-bag-boxes.json',
  '/data/public-toilets.json',
  '/data/drinking-fountains.json',
  '/data/timed-collection-points.json',
  '/data/direct-drinking-stations.json',
  '/data/used-clothing-recycling-boxes.json',
  '/data/lactation-rooms.json',
  '/data/lactation-room-summary.json',
  '/data/lactation-room-locations.json',
  '/data/conversion-report.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  if (event.request.mode === 'navigate') {
    event.respondWith(networkFirst(event.request, '/index.html'));
    return;
  }

  if (url.origin !== self.location.origin || url.pathname === '/service-worker.js') {
    return;
  }

  if (url.pathname.startsWith('/data/')) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request, fallbackKey) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return (
      (await caches.match(request)) ||
      (fallbackKey ? await caches.match(fallbackKey) : undefined) ||
      new Response('Offline', { status: 503, statusText: 'Offline' })
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  const response = await fetch(request);
  if (response.ok) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}
