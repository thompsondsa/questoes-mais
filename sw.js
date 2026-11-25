// Service Worker: pré-cache do "app shell" e cache-first com atualização em segundo plano.
const CACHE = 'qmais-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './css/styles.css', './icons/icon-192.png', './icons/icon-512.png',
  './js/main.js', './js/pwa.js', './js/db/idb.js', './js/db/memory.js', './js/db/store.js', './js/backup/backup.js', './js/backup/files.js',
  './js/data/demo-pack.js', './js/services/catalog.js', './js/services/questionRepo.js', './js/nav/navigator.js',
  './js/ui/icons.js', './js/ui/alternatives.js', './js/ui/screen.js', './js/ui/sheets.js'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return; // catálogo externo não passa pelo SW
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = fetch(req).then((r) => { if (r.ok) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { e.waitUntil(net); return hit; }
    const r = await net;
    return r || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error());
  })());
});
