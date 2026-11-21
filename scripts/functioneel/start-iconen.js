// Elk doel op Start heeft een eigen icoon: nooit dat van de eerste tool in het plan (of van een andere tool),
// anders lijkt de tegel die ene tool te openen in plaats van een plan te starten.
const { chromium } = require('playwright');
const B = process.env.BASE || 'http://127.0.0.1:8000';
let fout = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) fout++; };
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' })).newPage();
  await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1'));
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(600);
  const r = await p.evaluate(() => {
    const vorm = h => { const d = document.createElement('div'); d.innerHTML = h; return [...d.querySelectorAll('path,circle,rect,line,polyline,polygon')].map(e => e.outerHTML.replace(/\s+/g, ' ')).join(''); };
    const tools = TOOLS.map(t => ({ id: t.id, v: vorm(iconHTML(t.icon)) }));
    return STARTS.filter(s => s.path).map(s => { const tegel = document.querySelector(`.stile[data-start="${s.path}"] .icon`), v = tegel ? vorm(tegel.innerHTML) : '', eerste = (trajectStappen(s.path)[0] || {}).t; return { plan: s.path, eigen: !!s.logo, leeg: !v, zelfde: tools.filter(t => t.v && t.v === v).map(t => t.id).join(), eerste: eerste && eerste.id }; });
  });
  ok(r.length >= 5, 'vijf plannen op Start (' + r.map(x => x.plan).join() + ')');
  r.forEach(x => ok(x.eigen && !x.leeg && !x.zelfde, `${x.plan}: een eigen icoon, niet dat van een tool${x.zelfde ? ' (nu dat van ' + x.zelfde + ')' : ''}`));
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
