// Stap voor stap staat op Projecten, Verandering en Vergaderen op dezelfde hoogte (v17.27): het kopje en de eerste kaart verspringen niet als je van tab wisselt.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  for (const vp of [{ width:1440, height:900 }, { width:1024, height:768 }, { width:768, height:1024 }, { width:390, height:844 }, { width:320, height:640 }]) {
    const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500); const m = {};
    for (const t of ['Projecten', 'Verandering', 'Vergaderen']) { await p.evaluate(t => { const k = [...document.querySelectorAll('button')].find(e => new RegExp('^\\s*' + t + '\\s*$').test(e.textContent)); if (k) k.click(); }, t); await p.waitForTimeout(600); await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(100);
      m[t] = await p.evaluate(() => { const zie = e => e.getClientRects().length, y = e => e ? Math.round(e.getBoundingClientRect().top) : null; return { kop:y([...document.querySelectorAll('.tab-hero .th-title')].find(zie)), label:y([...document.querySelectorAll('.blok-kop')].find(e => zie(e) && /^\s*Stap voor stap/i.test(e.textContent))), kaart:y([...document.querySelectorAll('.plan-keuze .path, .plan-tab .path')].find(zie)) }; });
      if (vp.width === 1440) await p.screenshot({ path:S + '/tabs-hoogte-' + t + '.png' }); }
    const a = m.Projecten; ok(a.label !== null && a.kaart !== null, vp.width + ': Projecten toont het kopje en een kaart');
    for (const t of ['Verandering', 'Vergaderen']) ok(m[t].kop === a.kop && m[t].label === a.label && m[t].kaart === a.kaart, vp.width + ': ' + t + ' staat even hoog als Projecten (titel ' + m[t].kop + '/' + a.kop + ', kopje ' + m[t].label + '/' + a.label + ', kaart ' + m[t].kaart + '/' + a.kaart + ')');
    await c.close(); }
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
