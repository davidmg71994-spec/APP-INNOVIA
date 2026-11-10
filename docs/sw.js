/* Service worker de Visitas PRL: la app abre sin cobertura en obra.
   Red primero para la página (así llegan las versiones nuevas, sin esperar a la caché del navegador); si no hay red, la copia guardada.
   No toca la caché 'registro-rp-senal', que gestiona la propia app. */
const SHELL = 'visitasprl-shell-v2';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', './VisitasPRL.html'])).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('visitasprl-shell-') && k !== SHELL).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  /* la página se pide siempre al servidor (sin la caché de 10 minutos de GitHub Pages), así la versión nueva sale al recargar */
  const red = req.mode === 'navigate' ? fetch(req.url, {cache:'no-cache', credentials:'same-origin'}).then(r => r.redirected ? fetch(req) : r) : fetch(req);
  e.respondWith(
    red.then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(SHELL).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, {ignoreSearch: true}).then(r => r || caches.match('./VisitasPRL.html')))
  );
});
