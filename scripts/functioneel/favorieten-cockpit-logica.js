const { chromium } = require('playwright');
// Favorieten via het sterretje in de app: een gewone tool, de Cockpit zonder bewaard bord (vroeger verdween die favoriet meteen),
// een bewaard bord met naam en een bewaard bord zonder naam. Draai: PORT=P node favorieten-cockpit-logica.js
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) process.exitCode = 1; };
const B = `http://127.0.0.1:${process.env.PORT}/`;
async function sessie(b, voor, arg) {
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' }); const p = await c.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(B); await p.waitForTimeout(700);
  if (voor) { await p.evaluate(voor, arg); await p.reload(); await p.waitForTimeout(700); }
  await p.evaluate(() => { const d = document.getElementById('wiz'); if (d && d.open) d.close(); });
  return { c, p, errs };
}
(async () => { const b = await chromium.launch();
  { const { c, p, errs } = await sessie(b);
    await p.evaluate(() => openTool('vinkje')); await p.waitForTimeout(1200); await p.click('#fav-tool'); await p.waitForTimeout(300);
    ok(JSON.stringify(await p.evaluate(() => favs())) === '["vinkje"]', 'gewone tool: sterretje zet Vinkje vast');
    ok(!errs.length, 'geen paginafouten ' + errs.join('|')); await c.close(); }
  { const { c, p, errs } = await sessie(b);
    await p.evaluate(() => openTool('cockpit')); await p.waitForTimeout(1600); await p.click('#fav-tool'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ f: favs(), aan: document.getElementById('fav-tool').getAttribute('aria-pressed') }));
    ok(JSON.stringify(r.f) === '["cockpit"]' && r.aan === 'true', 'Cockpit zonder bewaard bord: de Cockpit zelf staat vast ' + JSON.stringify(r));
    ok(!errs.length, 'geen paginafouten ' + errs.join('|')); await c.close(); }
  for (const [naam, label] of [['Teamweek', 'met naam'], ['', 'zonder naam']]) {
    const { c, p, errs } = await sessie(b, n => localStorage.setItem('cockpit.v1', JSON.stringify({ borden:[{ id:'bx1', naam:n, kolommen:[{ id:'k1', naam:'Kolom', blokken:[] }] }], actief:'bx1' })), naam);
    await p.evaluate(() => openTool('cockpit')); await p.waitForTimeout(1600); await p.click('#fav-tool'); await p.waitForTimeout(300);
    const r = await p.evaluate(() => ({ f: favs(), tegel: (document.querySelector('#fav-grid') || {}).textContent || '' }));
    ok(JSON.stringify(r.f) === '["cockpit#bx1"]', `bewaard bord ${label}: dat bord staat vast ` + JSON.stringify(r.f));
    ok(naam ? r.tegel.includes('Teamweek') : /Cockpit/.test(r.tegel), `bewaard bord ${label}: tegel op Start toont ` + (naam || 'Cockpit'));
    ok(!errs.length, 'geen paginafouten ' + errs.join('|')); await c.close(); }
  await b.close(); })();
