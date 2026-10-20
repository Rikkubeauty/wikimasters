/* Carnet des aérodromes — service worker
   Page : réseau d'abord (toujours la dernière version), copie locale si hors ligne.
   Bibliothèques, polices et icônes : copie locale d'abord.
   Les données (coches, ajouts) ne passent pas ici : Firebase gère sa propre synchronisation hors ligne. */
const VERSION = 'v1';
const SHELL = `carnet-shell-${VERSION}`;
const ASSETS = `carnet-assets-${VERSION}`;
const PRECACHE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(k => k.startsWith('carnet-') && k !== SHELL && k !== ASSETS).map(k => caches.delete(k))
  )).then(() => self.clients.claim()));
});

const CACHE_FIRST = [
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/',
  'https://www.gstatic.com/firebasejs/',
  'https://fonts.googleapis.com/',
  'https://fonts.gstatic.com/'
];

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = req.url;

  // Page de l'application : réseau d'abord
  if (req.mode === 'navigate' || (url.startsWith(self.location.origin) && /\/(index\.html)?(\?.*)?$/.test(new URL(url).pathname + new URL(url).search))) {
    e.respondWith(
      fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put('./index.html', copy)); }
        return res;
      }).catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  // Bibliothèques et polices : copie locale d'abord
  if (CACHE_FIRST.some(p => url.startsWith(p)) || (url.startsWith(self.location.origin) && /\.(png|webmanifest|js)$/.test(url))) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(ASSETS).then(c => c.put(req, copy)); }
        return res;
      }))
    );
  }
  // Tout le reste (Firebase, tuiles de carte) : comportement normal du navigateur
});
