// Verandering toont twee stappenplannen: 'Begeleid een verandering' en 'Vertel een verhaal'.
// Breed staan ze naast elkaar (zoals op Projecten), op een gsm onder elkaar. Vergaderen toont er ook twee: vergadering en stand-up.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  for (const [w, h, naam] of [[1366, 900, 'laptop'], [820, 1180, 'tablet'], [390, 844, 'gsm']]) {
    const c = await b.newContext({ viewport:{ width:w, height:h }, serviceWorkers:'block' }), p = await c.newPage();
    p.on('pageerror', e => ok(false, naam + ': paginafout ' + e.message));
    await p.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); } catch {} });
    await p.goto(BASE + '/'); await p.waitForTimeout(1200);
    await p.locator('.tab[data-tab="verandering"]').click(); await p.waitForTimeout(600);
    const k = await p.evaluate(() => [...document.querySelectorAll('#plan-tab .path')].map(e => { const r = e.getBoundingClientRect(); return { id:e.dataset.path, l:r.left, r:r.right, t:r.top, h:r.height }; }));
    ok(k.length === 2 && k[0].id === 'verandering' && k[1].id === 'verhaal', naam + ': twee plannen, eerst de verandering, dan het verhaal');
    if (k.length === 2) {
      if (w >= 700) ok(Math.abs(k[0].t - k[1].t) < 1 && k[1].l >= k[0].r && Math.abs(k[0].h - k[1].h) < 1, naam + ': naast elkaar en even hoog');
      else ok(k[1].t >= k[0].t + k[0].h && Math.abs(k[0].l - k[1].l) < 1, naam + ': onder elkaar');
    }
    ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), naam + ': niets loopt buiten het scherm');
    if (naam === 'laptop') {
      await p.locator('#plan-tab .path[data-path="verhaal"] .path-next').click(); await p.waitForTimeout(900);
      ok(await p.evaluate(() => { const d = document.getElementById('pn-dlg'); return document.documentElement.classList.contains('in-tool') || (d && !d.hidden); }), 'laptop: "Begin hier" van het verhaal start het plan (eerst de vraag naar een naam)');
      await p.goto(BASE + '/'); await p.waitForTimeout(1000);
      await p.locator('.tab[data-tab="vergaderen"]').click(); await p.waitForTimeout(600);
      ok(await p.locator('#plan-tab .path').count() === 2 && await p.locator('#plan-tab .pt-twee').count() === 1, 'laptop: Vergaderen toont twee plannen naast elkaar: vergadering en stand-up');
    }
    await c.close();
  }
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
