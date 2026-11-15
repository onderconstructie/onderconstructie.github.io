// v16.54: met een actief project (Alfa) "Voorbeeld bekijken" en herladen: het voorbeeld staat terug open (vroeger opende de tool de lijst van Alfa
// en stond het voorbeeld weg). Ook als je het voorbeeld in de projectkiezer kiest. Kies je daarna in de app een ander project, dan volgt de tool dat;
// na "Wis voorbeeld" volgt de tool de app weer. Het voorbeeld gaat nooit verloren.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const TOOLS = (process.argv[2] || 'klimaat,swot,pestle,tijdlijn,weerstand,vinkje,beslissingen,dossier').split(',');
const VB = ['#example', '#example-btn', '#exampleBtn', '#vb-show', '#vb-load', '[data-act="example"]', '.oc-vb'];
(async () => { const b = await chromium.launch(); const PE = [];
  const vbOpen = p => p.evaluate(() => [...document.querySelectorAll('.vb-bar, #vb-bar, #vbBar')].some(x => x.getClientRects().length && !x.closest('[hidden]')));
  const herlaad = async p => { await p.reload({ waitUntil:'networkidle' }); await p.waitForFunction(() => document.readyState === 'complete', null, { timeout:15000 }); await p.waitForTimeout(500); };
  for (const t of TOOLS) {
    const c = await b.newContext({ viewport:{ width:1200, height:900 }, serviceWorkers:'block' }); const p = await c.newPage();
    p.on('pageerror', e => PE.push(t + ': ' + String(e).slice(0, 120))); p.on('dialog', d => d.accept().catch(() => {}));
    await c.addInitScript(() => { if (!localStorage.getItem('oc.welkom')) { localStorage.setItem('oc.welkom', '1'); localStorage.setItem('oc.project', JSON.stringify({ name:'Alfa', since:1 })); } });
    await p.goto(B + '/' + t + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(400);
    let geklikt = false; for (const s of VB) { const l = p.locator(s + ':visible').first(); if (await l.count()) { await l.click(); geklikt = true; break; } }
    await p.waitForTimeout(700);
    if (!geklikt || !await vbOpen(p)) { ok(false, `${t}: geen voorbeeld gevonden`); await c.close(); continue; }
    await herlaad(p); ok(await vbOpen(p), `${t}: Voorbeeld bekijken en herladen: het voorbeeld staat terug open`);
    // via de projectkiezer: eerst een ander tabblad (Alfa), dan het voorbeeld kiezen, herladen
    const tabs = await p.evaluate(() => { if (!window.ocPk || !ocPk.knop) return 0; ocPk.knop.click(); const n = document.querySelectorAll('.oc-pk-item[data-id]').length; ocPk.sluit && ocPk.sluit(); return n; });
    if (tabs >= 2) {
      await p.evaluate(() => { ocPk.knop.click(); }); await p.waitForTimeout(150);
      await p.locator('.oc-pk-item:visible[data-id]:not(:has(.oc-pk-vb))').first().click(); await p.waitForTimeout(400);
      await p.evaluate(() => { ocPk.knop.click(); }); await p.waitForTimeout(150);
      await p.locator('.oc-pk-item:visible[data-id]:has(.oc-pk-vb)').first().click(); await p.waitForTimeout(400);
      await herlaad(p); ok(await vbOpen(p), `${t}: het voorbeeld gekozen in de projectkiezer en herladen: het voorbeeld blijft open`);
    }
    // een andere projectkeuze in de app: de tool volgt, het voorbeeld blijft bestaan
    await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Beta', since:Date.now() }))); await herlaad(p);
    const naB = await vbOpen(p); const nogVb = await p.evaluate(() => { if (!window.ocPk || !ocPk.knop) return true; ocPk.knop.click(); const n = document.querySelectorAll('.oc-pk-item .oc-pk-vb').length; ocPk.sluit && ocPk.sluit(); return n > 0; });
    ok(!naB && nogVb, `${t}: een ander project in de app: de tool volgt Beta, het voorbeeld blijft in de kiezer (open=${naB}, in kiezer=${nogVb})`);
    await c.close();
  }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
