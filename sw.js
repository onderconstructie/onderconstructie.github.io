/*
  Service worker voor de Onder Constructie-app (/app/).
  Hij staat in de root zodat hij ook de tools in /focus/, /risico/ enz. offline kan houden,
  maar hij bemoeit zich alleen met de paden hieronder. Al de rest van de site gaat ongemoeid naar het netwerk.
  Wordt enkel geregistreerd wie /app/ opent.
*/
const VERSION = 'oc-app-v31';

const SHELL = [
  '/app/', '/tools.json', '/app/manifest.webmanifest', '/app/icon.svg',
  '/app/icon-180.png', '/app/icon-192.png', '/app/icon-512.png', '/app/icon-maskable.png',
  // eigen lettertypes: geen verkeer naar externe lettertypediensten, en altijd offline beschikbaar
  '/fonts/fonts.css', '/fonts/dm-sans-latin-400-normal.woff2', '/fonts/dm-sans-latin-ext-400-normal.woff2', '/fonts/dm-sans-latin-500-normal.woff2', '/fonts/dm-sans-latin-ext-500-normal.woff2', '/fonts/dm-sans-latin-600-normal.woff2', '/fonts/dm-sans-latin-ext-600-normal.woff2', '/fonts/dm-sans-latin-700-normal.woff2', '/fonts/dm-sans-latin-ext-700-normal.woff2', '/fonts/jetbrains-mono-latin-400-normal.woff2', '/fonts/jetbrains-mono-latin-500-normal.woff2', '/fonts/jetbrains-mono-latin-600-normal.woff2', '/fonts/jetbrains-mono-latin-700-normal.woff2'
];
// Welke tools offline bewaard worden, staat in /tools.json (gebouwd uit de metatags in de tools).
let TOOLS = [];
async function toolPaths(cache) {
  if (TOOLS.length) return TOOLS;
  try {
    const res = await (cache || await caches.open(VERSION)).match('/tools.json');
    if (res) TOOLS = (await res.json()).map(t => t.path);
  } catch {}
  return TOOLS;
}
// Bibliotheken staan op de eigen site (geen verkeer naar externe servers); ze veranderen niet.
const LIBS = ['/lib/html2canvas-1.4.1.min.js', '/lib/jspdf-2.5.1.umd.min.js', '/lib/chart-4.4.1.umd.js', '/lib/qrcode-generator-1.4.4.js'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];
const NETWORK_TIMEOUT = 3500;

function norm(path) {
  path = path.replace(/index\.html$/, '');
  if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
  return path;
}
function isOurs(path, paths) {
  return path.startsWith('/app/') || path === '/tools.json' || paths.some(t => path.startsWith(t));
}
// Een doorverwezen antwoord mag niet als antwoord op een navigatie dienen: maak er een schoon antwoord van.
async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    await cache.addAll(SHELL.map(u => new Request(u, { cache: 'reload' })));
    TOOLS = [];
    const paths = await toolPaths(cache);
    // Tools en bibliotheken: zo veel mogelijk, één mislukking houdt de rest niet tegen.
    await Promise.allSettled([
      ...paths.map(async u => {
        const res = await fetch(new Request(u, { cache: 'reload' }));
        if (res.ok) await cache.put(u, await clean(res));
      }),
      ...LIBS.map(async u => {
        const res = await fetch(u);
        if (res.ok) await cache.put(u, res);
      })
    ]);
    await self.skipWaiting();
  })());
});

toolPaths();   // de lijst meteen inlezen als de service worker opstart

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith('oc-app-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'status') return;
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const paths = await toolPaths(cache);
    let cached = 0;
    for (const t of paths) if (await cache.match(t)) cached++;
    e.source.postMessage({ type: 'status', cached, total: paths.length });
  })());
});

// Een nieuwe toollijst: ontbrekende tools meteen offline bewaren, verdwenen tools uit de bewaarde versie halen.
async function syncTools(cache) {
  const paths = await toolPaths(cache), have = (await cache.keys()).map(r => new URL(r.url));
  const ownTool = u => u.origin === location.origin && !u.pathname.startsWith('/app/') && u.pathname !== '/tools.json';
  await Promise.allSettled([
    ...paths.map(async u => {
      if (await cache.match(u)) return;
      const res = await fetch(new Request(u, { cache: 'reload' }));
      if (res.ok) await cache.put(u, await clean(res));
    }),
    ...have.filter(u => ownTool(u) && !paths.includes(norm(u.pathname))).map(u => cache.delete(u.href))
  ]);
}

// Eerst het netwerk, zodat je altijd de nieuwste versie krijgt. Is dat traag of weg: de bewaarde versie.
async function networkFirst(e, key) {
  const cache = await caches.open(VERSION);
  const net = fetch(e.request, { cache: 'no-cache' }).then(async res => {
    if (res.ok && res.type === 'basic') {
      await cache.put(key, await clean(res.clone()));
      if (key === '/tools.json') { TOOLS = []; try { e.waitUntil(syncTools(cache).catch(() => {})); } catch {} }   // nieuwe lijst: opnieuw inlezen en bijwerken
    }
    return res;
  });
  e.waitUntil(net.catch(() => {}));
  let cached = await cache.match(key, { ignoreSearch: true });
  // Een onbekend adres binnen de app: toon offline de app zelf, niet een foutmelding.
  if (!cached && key.startsWith('/app/') && e.request.mode === 'navigate') cached = await cache.match('/app/');
  if (!cached) {
    return net.catch(() => new Response(
      '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
      '<body style="font-family:system-ui,sans-serif;color:#475569;padding:2rem;text-align:center">' +
      '<p style="margin-top:30vh">Geen verbinding, en deze tool is nog niet offline bewaard.</p></body>',
      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
  }
  const timeout = new Promise(r => setTimeout(() => r(cached), NETWORK_TIMEOUT));
  return Promise.race([net.catch(() => cached), timeout]);
}

// Bibliotheken en lettertypes veranderen niet: eerst de bewaarde versie.
async function cacheFirst(e) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(e.request);
  if (hit) return hit;
  const res = await fetch(e.request);
  if (res.ok || res.type === 'opaque') e.waitUntil(cache.put(e.request, res.clone()));
  return res;
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    const path = url.pathname === '/tools.json' ? '/tools.json' : norm(url.pathname);
    if (url.pathname.startsWith('/fonts/') || url.pathname.startsWith('/lib/')) { e.respondWith(cacheFirst(e)); return; }
    if (path.startsWith('/app/') || path === '/tools.json') { e.respondWith(networkFirst(e, path)); return; }
    if (TOOLS.length) {
      if (!isOurs(path, TOOLS)) return;   // de rest van de site: niet aankomen
      e.respondWith(networkFirst(e, path));
      return;
    }
    // Net opgestart en de lijst nog niet ingelezen: eerst inlezen, dan beslissen.
    e.respondWith(toolPaths().then(paths => isOurs(path, paths) ? networkFirst(e, path) : fetch(e.request)));
  } else if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(e));
  }
});
