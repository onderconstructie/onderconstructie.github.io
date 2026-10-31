/*
  Service worker voor de Onder Constructie-app (/app/).
  Hij staat in de root zodat hij ook de tools in /focus/, /risico/ enz. offline kan houden,
  maar hij bemoeit zich alleen met de paden hieronder. Al de rest van de site gaat ongemoeid naar het netwerk.
  Wordt enkel geregistreerd wie /app/ opent.

  Werkwijze (v36):
  - Bij het installeren staat alles meteen klaar: de app, de toollijst, alle tools, de overzichtspagina's,
    de lettertypes en de bibliotheken. Daarna werkt alles ook offline.
  - Openen gaat altijd meteen uit de bewaarde versie. Op de achtergrond haalt hij de nieuwste versie op
    (een voorwaardelijk verzoek: wat niet veranderde, komt niet opnieuw binnen). Die gebruik je de volgende keer.
  - Een nieuwe versie van de service worker wacht. De app toont "Nieuwe versie klaar" met Vernieuwen;
    pas dan wisselt hij. Nooit stil wisselen terwijl je werkt.
*/
const VERSION = 'oc-app-v54';
// Lettertypes en bibliotheken hebben vaste bestandsnamen (met versienummer): die bewaren we apart,
// zodat een nieuwe versie van de app ze niet opnieuw moet downloaden.
const STATIC = 'oc-static-1';

const SHELL = [
  '/app/', '/tools.json', '/app/manifest.webmanifest', '/app/icon.svg',
  '/app/icon-180.png', '/app/icon-192.png', '/app/icon-512.png', '/app/icon-maskable.png', '/fonts/fonts.css'
];
// Losse pagina's die ook offline moeten werken: privacy en de overzichtspagina's.
const PAGES = ['/privacy/', '/', '/projectmanagement/', '/zakmes/', '/reset/'];
const FONTS = ['dm-sans-latin-400', 'dm-sans-latin-ext-400', 'dm-sans-latin-500', 'dm-sans-latin-ext-500', 'dm-sans-latin-600', 'dm-sans-latin-ext-600',
  'dm-sans-latin-700', 'dm-sans-latin-ext-700', 'jetbrains-mono-latin-400', 'jetbrains-mono-latin-500', 'jetbrains-mono-latin-600', 'jetbrains-mono-latin-700']
  .map(f => `/fonts/${f}-normal.woff2`);
// Bibliotheken staan op de eigen site (geen verkeer naar externe servers).
const LIBS = ['/lib/html2canvas-1.4.1.min.js', '/lib/jspdf-2.5.1.umd.min.js', '/lib/chart-4.4.1.umd.js', '/lib/qrcode-generator-1.4.4.js'];
const CDN_HOSTS = ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net'];

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

function norm(path) {
  path = path.replace(/index\.html$/, '');
  if (!path.endsWith('/') && !/\.[a-z0-9]+$/i.test(path)) path += '/';
  return path;
}
function isOurs(path, paths) {
  return path.startsWith('/app/') || path === '/tools.json' || paths.some(t => path.startsWith(t));
}
const isStatic = p => p.startsWith('/lib/') || (p.startsWith('/fonts/') && p.endsWith('.woff2'));
// Een doorverwezen antwoord mag niet als antwoord op een navigatie dienen: maak er een schoon antwoord van.
async function clean(res) {
  if (!res.redirected) return res;
  return new Response(await res.blob(), { status: res.status, statusText: res.statusText, headers: res.headers });
}
// Een handvol tegelijk, zodat wat je zelf opent niet achteraan in de rij staat.
async function pool(items, n, fn) {
  const q = [...items];
  await Promise.all(Array.from({ length: n }, async () => { while (q.length) { try { await fn(q.shift()); } catch {} } }));
}
// 'no-cache' = een voorwaardelijk verzoek: wat de browser al heeft en niet veranderde, komt niet opnieuw binnen.
async function store(cache, u) {
  const res = await fetch(new Request(u, { cache: 'no-cache' }));
  if (res.ok) await cache.put(u, await clean(res));
}

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const [cache, stat] = await Promise.all([caches.open(VERSION), caches.open(STATIC)]);
    await cache.addAll(SHELL.map(u => new Request(u, { cache: 'no-cache' })));
    TOOLS = [];
    const paths = await toolPaths(cache);
    const have = new Set((await stat.keys()).map(r => new URL(r.url).pathname));
    await pool([...paths, ...PAGES], 4, u => store(cache, u));
    await pool([...FONTS, ...LIBS].filter(u => !have.has(u)), 4, async u => { const res = await fetch(u); if (res.ok) await stat.put(u, res); });
    // Eenmalige overgang van v35 of ouder: die app kent "Vernieuwen" nog niet (en herlaadt zichzelf bij een wissel).
    const old = (await caches.keys()).filter(k => /^oc-app-v\d+$/.test(k) && k !== VERSION).map(k => +k.slice(8));
    if (old.length && Math.max(...old) <= 35) await self.skipWaiting();
  })());
});

toolPaths();   // de lijst meteen inlezen als de service worker opstart

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => (k.startsWith('oc-app-') && k !== VERSION) || (k.startsWith('oc-static-') && k !== STATIC)).map(k => caches.delete(k)));
    // Navigatie meteen laten vertrekken, terwijl de service worker nog opstart.
    if (self.registration.navigationPreload) { try { await self.registration.navigationPreload.enable(); } catch {} }
    await self.clients.claim();
  })());
});

self.addEventListener('message', e => {
  if (!e.data) return;
  if (e.data.type === 'skip') { self.skipWaiting(); return; }   // de gebruiker koos Vernieuwen
  if (e.data.type !== 'status') return;
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    const paths = await toolPaths(cache);
    let cached = 0;
    for (const t of paths) if (await cache.match(t)) cached++;
    e.source.postMessage({ type: 'status', cached, total: paths.length });
  })());
});

async function tell(type) {
  for (const c of await self.clients.matchAll({ type: 'window' })) c.postMessage({ type });
}

// Een nieuwe toollijst: ontbrekende tools meteen offline bewaren, verdwenen tools uit de bewaarde versie halen.
async function syncTools(cache) {
  const paths = await toolPaths(cache), have = (await cache.keys()).map(r => new URL(r.url));
  const ownTool = u => u.origin === location.origin && !u.pathname.startsWith('/app/') && !u.pathname.startsWith('/fonts/')
    && u.pathname !== '/tools.json' && !PAGES.includes(norm(u.pathname));
  await Promise.allSettled(have.filter(u => ownTool(u) && !paths.some(p => norm(u.pathname).startsWith(p))).map(u => cache.delete(u.href)));
  await pool(paths, 4, async u => { if (!(await cache.match(u))) await store(cache, u); });
}

/* Meteen de bewaarde versie; op de achtergrond de nieuwste ophalen voor de volgende keer.
   Nog niets bewaard: dan het netwerk (en een vriendelijke melding als dat er niet is). */
async function staleWhileRevalidate(e, key) {
  const cache = await caches.open(VERSION);
  let cached = await cache.match(key, { ignoreSearch: true });
  // Een onbekend adres binnen de app: toon offline de app zelf, niet een foutmelding.
  if (!cached && key.startsWith('/app/') && e.request.mode === 'navigate') cached = await cache.match('/app/');
  // een kopie om te vergelijken, nu al: het antwoord zelf gaat zo meteen naar de pagina
  const before = cached && (key === '/tools.json' || key === '/app/') ? cached.clone() : null;
  const net = (async () => {
    const pre = e.request.mode === 'navigate' ? await Promise.resolve(e.preloadResponse).catch(() => null) : null;
    const res = pre || await fetch(e.request, { cache: 'no-cache' });
    if (res.ok && res.type === 'basic') {
      const copy = await clean(res.clone());
      // Veranderd? Dan krijgt de app een seintje: nieuwe toollijst of nieuwe versie van de app.
      const changed = before ? (await before.text()) !== (await copy.clone().text()) : false;
      await cache.put(key, copy);
      if (changed && key === '/tools.json') { TOOLS = []; await tell('tools'); await syncTools(cache); }
      if (changed && key === '/app/') await tell('update');
    }
    return res;
  })();
  e.waitUntil(net.catch(() => {}));
  if (cached) return cached;
  return net.catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<body style="font-family:system-ui,sans-serif;color:#475569;padding:2rem;text-align:center">' +
    '<p style="margin-top:30vh">Geen verbinding, en deze pagina is nog niet offline bewaard.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
}

// Lettertypes en bibliotheken veranderen niet: eerst de bewaarde versie.
async function cacheFirst(e) {
  const cache = await caches.open(STATIC);
  const hit = await cache.match(e.request);
  if (hit) return hit;
  const res = await fetch(e.request);
  if (res.ok || res.type === 'opaque') e.waitUntil(cache.put(e.request, res.clone()));
  return res;
}

// Een pagina die niet van ons is: gewoon het netwerk (de vooraf vertrokken navigatie als die er is).
async function passThrough(e) {
  const pre = await Promise.resolve(e.preloadResponse).catch(() => null);
  return pre || fetch(e.request);
}

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  const nav = e.request.mode === 'navigate';
  if (url.origin === location.origin) {
    const path = url.pathname === '/tools.json' ? '/tools.json' : norm(url.pathname);
    if (isStatic(url.pathname)) { e.respondWith(cacheFirst(e)); return; }
    if (path.startsWith('/app/') || path === '/tools.json' || path === '/fonts/fonts.css' || PAGES.includes(path)) { e.respondWith(staleWhileRevalidate(e, path)); return; }
    if (TOOLS.length) {
      if (isOurs(path, TOOLS)) e.respondWith(staleWhileRevalidate(e, path));
      else if (nav) e.respondWith(passThrough(e));   // de rest van de site: niet aankomen
      return;
    }
    // Net opgestart en de lijst nog niet ingelezen: eerst inlezen, dan beslissen.
    e.respondWith(toolPaths().then(paths => isOurs(path, paths) ? staleWhileRevalidate(e, path) : nav ? passThrough(e) : fetch(e.request)));
  } else if (CDN_HOSTS.includes(url.hostname)) {
    e.respondWith(cacheFirst(e));
  }
});
