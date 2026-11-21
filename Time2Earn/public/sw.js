/**
 * Time2Earn Service Worker (Phase 15: PWA)
 *
 * Implements static app-shell caching with add-to-home-screen & offline fallback.
 * STRICT SECURITY/INTEGRITY RULE:
 * NEVER cache Firestore, Firebase Auth, or user balance data. All authenticated
 * and dynamic database calls strictly bypass the service worker via network-only.
 */

const CACHE_NAME = 't2e-shell-v1';

// Static application shell files to pre-cache on install
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/favicon.svg',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
];

// Helper: Checks if request targets Firebase / Firestore / dynamic APIs
function isFirebaseOrApi(url) {
  const lower = url.toLowerCase();
  return (
    lower.includes('firestore.googleapis.com') ||
    lower.includes('firebaseio.com') ||
    lower.includes('identitytoolkit.googleapis.com') ||
    lower.includes('securetoken.googleapis.com') ||
    lower.includes('/google.firestore.') ||
    lower.includes('/api/')
  );
}

// Install Event: Pre-cache static shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL_FILES);
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Purge old cache versions and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Authoritative caching routing
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = request.url;

  // 1. Strict Guard: Non-GET requests and Firestore/Firebase requests MUST NEVER be cached
  if (request.method !== 'GET' || isFirebaseOrApi(url)) {
    // Network-only: direct pass-through
    return;
  }

  // 2. Navigation Requests: Network-first with offline fallback to /offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => {
        return caches.match(request).then((cached) => {
          return cached || caches.match('/offline.html');
        });
      })
    );
    return;
  }

  // 3. Static Assets (CSS, JS, Fonts, Images): Cache-first with network fallback
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to revalidate cache if online
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
        }).catch(() => {
          // Offline, ignore background update failure
        });
        return cachedResponse;
      }

      return fetch(request).then((networkResponse) => {
        // Cache valid static responses
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic' &&
          (url.endsWith('.js') || url.endsWith('.css') || url.endsWith('.svg') || url.endsWith('.png') || url.includes('/assets/'))
        ) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
        }
        return networkResponse;
      }).catch(() => {
        // If image fails, fallback or return empty
        if (request.destination === 'image') {
          return caches.match('/favicon.svg');
        }
        return new Response('Network error occurred', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});
