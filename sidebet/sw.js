const CACHE_NAME = 'sidebet-wheel-cache-v1';

// The core files and CDNs your app needs to run
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://unpkg.com/vue@3/dist/vue.global.js',
    'https://fonts.googleapis.com/css2?family=Rye&family=Inter:wght@400;700&display=swap'
];

// 1. Install Event: Cache our core assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Opened cache');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // Force the waiting service worker to become the active service worker.
    self.skipWaiting(); 
});

// 2. Activate Event: Clean up old caches to ensure seamless updates
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Ensure the service worker takes control of the page immediately.
    self.clients.claim(); 
});

// 3. Fetch Event: Serve from cache first, fallback to network
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Return the cached version if we have it
            if (cachedResponse) {
                return cachedResponse;
            }

            // Otherwise, fetch from the network
            return fetch(event.request).then((networkResponse) => {
                // Check if we received a valid response
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    // For third-party (CORS) requests like Google Fonts (gstatic), we still want to cache them dynamically.
                    // We only strictly check 'basic' for our own domain.
                    if(networkResponse && networkResponse.status === 200) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, responseToCache);
                        });
                    }
                    return networkResponse;
                }

                // Dynamically cache new assets (like the actual font files loaded by Google Fonts)
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // If both cache and network fail (e.g., offline and asset isn't cached), 
                // you could return a custom offline fallback page here if you had one.
                console.log('Fetch failed; returning offline page instead.', event.request.url);
            });
        })
    );
});
