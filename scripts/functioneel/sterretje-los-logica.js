const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
// Sterretje in een los geopende tool (bladwijzer, gedeelde link): zet de tool op Start; in de app geen tweede sterretje.
// Over alle tools uit tools.json. Draai: PORT=P node sterretje-los-logica.js (cwd scripts/functioneel)
const ok = (c, m) => { console.log((c ? 'ok   ' : 'FOUT ') + m); if (!c) process.exitCode = 1; };
const B = `http://127.0.0.1:${process.env.PORT}`;
const T = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', 'tools.json'), 'utf8'));
const L = Array.isArray(T) ? T : T.tools;
(async () => { const b = await chromium.launch(); let fout = 0;
  // Zonder gedeelde kop (eigen header) of buiten deze werkmappen: nog geen sterretje, bewust overgeslagen.
  const UITZ = new Set(['schets', 'paradox', 'hier', 'adem']);
  for (const t of L) {
    if (UITZ.has(t.id)) { console.log('--   ' + t.id + ': overgeslagen (eigen kop)'); continue; }
    const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block' }); const p = await c.newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto(B + t.path); await p.waitForTimeout(500);
    const s = p.locator('header[data-oc-kop] .oc-ster');
    if (!(await s.count())) { ok(false, `${t.id}: sterretje in de kop ontbreekt`); await c.close(); continue; }
    const bb = await s.boundingBox(); ok(bb && bb.width >= 44 && bb.height >= 44, `${t.id}: sterretje 44x44`);
    await s.click(); await p.waitForTimeout(200);
    const f = await p.evaluate(() => JSON.parse(localStorage.getItem('oc-app.favs') || '[]'));
    ok(f.includes(t.id) && (await s.getAttribute('aria-pressed')) === 'true', `${t.id}: staat op je startscherm`);
    await p.goto(B + '/'); await p.waitForTimeout(700);
    ok(await p.evaluate(id => favs().includes(id), t.id), `${t.id}: Start toont de favoriet`);
    await p.evaluate(id => { const d = document.getElementById('wiz'); if (d && d.open) d.close(); openTool(id); }, t.id); await p.waitForTimeout(1300);
    const dubbel = await p.evaluate(() => { const fr = document.querySelector('.frames iframe.active'); try { return fr && fr.contentDocument ? fr.contentDocument.querySelectorAll('header[data-oc-kop] .oc-ster').length : -1; } catch (e) { return -2; } });
    ok(dubbel === 0, `${t.id}: in de app geen tweede sterretje (${dubbel})`);
    ok(!errs.length, `${t.id}: geen paginafouten ${errs.join('|')}`);
    await c.close(); }
  await b.close(); })();
