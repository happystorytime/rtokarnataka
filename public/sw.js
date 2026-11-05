// Simple Service Worker for PWA installation and offline shell caching
const CACHE_NAME = 'ka-rto-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass through API requests directly to the network
  if (event.request.url.includes('/api/')) {
    return;
  }
  // Allow network-first for pages and assets
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
