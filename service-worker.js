/* Service Worker para MrGlass Galeria
 * Estrategia:
 *  - Cache-first para assets locales (HTML, CSS, JS, manifest, iconos)
 *  - Network-first para todo lo demas (Supabase, imagenes, QR API)
 *  - Fallback a pagina offline cuando no hay red ni cache
 */

const CACHE_VERSION = 'mrglass-v6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './style.css',
  './script.js',
  './manifest.json',
  './icon.svg'
];

// Instalacion: precachea assets criticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('SW install error:', err))
  );
});

// Activacion: limpia caches viejos y toma control inmediato
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => {
          if (key !== CACHE_VERSION) return caches.delete(key);
          return null;
        })
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch con estrategia mixta
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Solo manejar GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;

  // Para assets locales: cache-first
  if (isSameOrigin && STATIC_ASSETS.includes('.' + url.pathname) || url.pathname === '/') {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => caches.match('./index.html'));
      })
    );
    return;
  }

  // Para imagenes de Supabase Storage: stale-while-revalidate
  if (url.hostname.endsWith('.supabase.co') && request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const networkFetch = fetch(request).then((response) => {
          if (response && response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() => cached);
        return cached || networkFetch;
      })
    );
    return;
  }

  // Para todo lo demas: network-first con fallback a cache
  event.respondWith(
    fetch(request)
      .then((response) => response)
      .catch(() => caches.match(request))
  );
});

// Mensajeria: permitir forzar update desde el cliente
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
