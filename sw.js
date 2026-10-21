/* Service worker: offline app shell + OneSignal push handling */
try {
  importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');
} catch (e) {
  // Push stays off if the OneSignal worker can't load; the app still works.
}

const CACHE = 'bbteam-v28';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './config.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './fonts/HiltonSerif-Regular.woff2',
  './fonts/HiltonSans-Regular.woff2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('bbteam-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

const IMG_CACHE = 'img-bbteam-v1';
const IMG_MAX = 400;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Uploaded photos (Google Drive image links): kept on the phone after the first view, so screens open instantly.
  if (url.hostname === 'lh3.googleusercontent.com') {
    event.respondWith(
      caches.open(IMG_CACHE).then((c) => c.match(req).then((hit) => {
        // A copy saved for display only (opaque) can't be used where the app reads the picture (share images, PDFs).
        if (hit && !(req.mode === 'cors' && hit.type === 'opaque')) return hit;
        return fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            c.put(req, res.clone()).then(() => c.keys()).then((keys) => {
              if (keys.length > IMG_MAX) keys.slice(0, keys.length - IMG_MAX).forEach((k) => c.delete(k));
            }).catch(() => {});
          }
          return res;
        });
      })).catch(() => fetch(req))
    );
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Network first for the app files, so updates show up; cached copy when offline.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
