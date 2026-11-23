// Uit de webdesign-audit (v17.16): zoeken op laptop bovenaan, ingeklapte groepen niet in de tabvolgorde, uit een plan meteen in het formulier.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:8970', S = process.env.SHOTS || '.';
(async () => { const b = await chromium.launch(); const fout = []; const ok = (v, t) => { console.log((v ? '  ok  ' : '  FOUT ') + t); if (!v) fout.push(t); };
  const nieuw = async vp => { const c = await b.newContext({ viewport:vp, serviceWorkers:'block' }); const p = await c.newPage(); await p.addInitScript(() => localStorage.setItem('oc-app.welkom-weg', '1')); await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(500); return p; };
  // 1. zoeken op laptop
  let p = await nieuw({ width:1440, height:900 });
  if (await p.isVisible('#search-open')) await p.click('#search-open'); await p.fill('#search', 'risico'); await p.waitForTimeout(700);
  const r = await p.evaluate(() => { const e = document.querySelector('#results .row, #results [data-id]'); const q = e && e.getBoundingClientRect(); return { top:q ? Math.round(q.top) : -1, n:document.querySelectorAll('#results [data-id]').length, rk:!!(document.getElementById('rk') && document.getElementById('rk').getClientRects().length) }; });
  ok(r.n >= 1 && r.top > 0 && r.top < 450 && !r.rk, 'laptop: het eerste zoekresultaat staat bovenaan (y=' + r.top + '), het routepaneel is weg'); await p.screenshot({ path:S + '/audit-zoek-laptop.png' });
  await p.fill('#search', ''); await p.keyboard.press('Escape'); await p.waitForTimeout(500); ok(await p.evaluate(() => !!document.getElementById('rk').getClientRects().length), 'na zoeken staat het routepaneel er weer');
  // 2. ingeklapte groepen
  for (const tab of ['verandering', 'vergaderen', 'zakmes']) { await p.click(`.tab[data-tab="${tab}"]`); await p.waitForTimeout(700);
    const n = await p.evaluate(() => [...document.querySelectorAll('section.group.collapsed .row')].filter(e => getComputedStyle(e).visibility !== 'hidden' && !e.closest('[inert]')).length);
    ok(n === 0, tab + ': geen tabbare rijen in ingeklapte groepen (' + n + ')'); }
  await p.evaluate(() => document.querySelector('section.group.collapsed .group-head, section.group.collapsed [aria-expanded]').click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => { const g = document.querySelector('section.group:not(.collapsed) .row'); return !!g && getComputedStyle(g).visibility === 'visible' && g.getClientRects().length > 0; }), 'een opengeklapte groep toont haar rijen weer');
  await p.context().close();
  // 3. uit een plan meteen in het formulier
  for (const [w, vp] of [['gsm', { width:390, height:844 }], ['laptop', { width:1440, height:900 }]]) { p = await nieuw(vp);
    await p.click('.stile[data-start="project"]'); await p.waitForTimeout(600); if (await p.isVisible('#pn-skip')) await p.click('#pn-skip'); await p.waitForTimeout(3500);
    const f = p.frames().find(x => /\/opdracht\/(\?|$)/.test(x.url()) && x !== p.mainFrame());
    ok(!!f && await f.isHidden('.oc-start') && await f.locator('#f-waarom').isVisible(), w + ': Start een project opent de Projectopdracht meteen in het formulier'); await p.screenshot({ path:S + '/audit-formulier-' + w + '.png' });
    await p.context().close(); }
  // 4. een tool met inhoud opent gewoon, zonder dat er iets aangetikt wordt
  p = await nieuw({ width:1440, height:900 }); await p.goto(B + '/opdracht/', { waitUntil:'networkidle' }); await p.getByRole('button', { name:'Voorbeeld bekijken' }).click(); await p.waitForTimeout(500);
  await p.goto(B + '/', { waitUntil:'networkidle' }); await p.click('.stile[data-start="project"]'); await p.waitForTimeout(600); if (await p.isVisible('#pn-skip')) await p.click('#pn-skip'); await p.waitForTimeout(3000);
  ok(!(await p.evaluate(() => document.getElementById('app-toast').classList.contains('show'))) , 'met inhoud: geen onverwachte melding');
  console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })();
