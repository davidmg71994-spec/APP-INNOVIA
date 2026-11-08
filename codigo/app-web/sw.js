/* Registros Visitas Técnicos PRL · service worker: keeps the app working without connection. */
const VERSION = 'registro-rp-v30';
const SENAL = 'registro-rp-senal';
const FILES = ['./', './index.html', './pdf-lib.min.js', './pdfjs/pdf.min.js', './pdfjs/pdf.worker.min.js', './pdfjs/wasm/openjpeg.wasm', './pdfjs/wasm/jbig2.wasm', './pdfjs/wasm/qcms_bg.wasm', './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png', './icons/favicon-64.png',
  './icons/logo-innovia.png', './icons/logo-innovia-dark.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== SENAL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin && url.pathname.includes('/senal/')) {
    // Láminas de señalización: se guardan aparte para que no se borren al actualizar la app.
    e.respondWith(caches.open(SENAL).then(c => c.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) c.put(req, res.clone());
      return res;
    }))));
    return;
  }
  if (url.origin === self.location.origin) {
    if (req.mode === 'navigate') {
      // Online: newest version. Offline, or if the hosting answers with an error page
      // (site paused, server down…): the copy saved on the phone.
      e.respondWith(fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put('./index.html', copy)); return res; }
        return caches.match('./index.html').then(hit => hit || res);
      }).catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    })));
    return;
  }
});
