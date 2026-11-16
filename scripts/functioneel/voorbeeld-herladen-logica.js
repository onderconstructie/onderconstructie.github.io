// v16.54/v16.55: het voorbeeld blijft open na herladen, tot je in de app een ander project kiest.
// Per tool: eigen werk voor Alfa (voorbeeld, Maak er mijn eigen van), dan project Beta en "Voorbeeld bekijken": herladen, het voorbeeld staat terug open.
// Dan in de projectkiezer eerst het tabblad van Alfa en daarna het voorbeeld kiezen: herladen, het voorbeeld blijft open (v16.55: Weerstand, Informatie,
// Verhaal en Oefen sprongen naar Alfa). Een ander project in de app (Gamma): de tool volgt, het voorbeeld blijft in de kiezer. Het werk van Alfa blijft.
// Zonder argument: alle tools uit tools.json met een voorbeeld (de Systeemkaart niet). Een tool zonder voorbeeld of zonder kiezer slaat die stap over.
const { chromium } = require('playwright'); const fs = require('fs'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const ALLE = JSON.parse(fs.readFileSync(require('path').join(__dirname, '../../tools.json'), 'utf8')).map(t => t.path.replace(/\//g, '')).filter(x => x && x !== 'systeemkaart');
const TOOLS = process.argv[2] ? process.argv[2].split(',') : ALLE;
const VB = ['#example', '#example-btn', '#exampleBtn', '#vb-show', '#vb-load', '#vbLoad', '#vb-laad', '[data-act="example"]', '[data-vb="start"]', '.oc-vb', 'button:has-text("Voorbeeld bekijken")'];
const EIG = ['#vb-eigen', '.vb-eigen', '[data-act="vb-eigen"]', '#vbEigen', '[data-vb="eigen"]'];
(async () => { const b = await chromium.launch(); const PE = []; let getest = 0, kiezer = 0;
  for (const t of TOOLS) {
    const c = await b.newContext({ viewport:{ width:1200, height:900 }, serviceWorkers:'block' }); const p = await c.newPage();
    p.on('pageerror', e => PE.push(t + ': ' + String(e).slice(0, 120))); p.on('dialog', d => d.accept().catch(() => {}));
    await c.addInitScript(() => { localStorage.setItem('oc.welkom', '1'); });
    const app = n => p.evaluate(n => localStorage.setItem('oc.project', JSON.stringify({ name:n, since:Date.now() })), n);
    const vbOpen = () => p.evaluate(() => [...document.querySelectorAll('.vb-bar, #vb-bar, #vbBar')].some(x => x.getClientRects().length && !x.closest('[hidden]')));
    const herlaad = async () => { await p.reload({ waitUntil:'networkidle' }); await p.waitForFunction(() => document.readyState === 'complete', null, { timeout:15000 }); await p.waitForTimeout(500); };
    const klik = async L => { for (const s of L) { const l = p.locator(s + ':visible').first(); if (await l.count()) { await l.click(); await p.waitForTimeout(700); return true; } } return false; };
    const pk = f => p.evaluate(f => { if (!window.ocPk || !ocPk.knop) return null; ocPk.knop.click(); const it = [...document.querySelectorAll('.oc-pk-item[data-id]')];
      const x = f === 'vb' ? it.find(i => i.querySelector('.oc-pk-vb')) : it.find(i => !i.querySelector('.oc-pk-vb')); if (!x) { ocPk.sluit && ocPk.sluit(); return false; } x.click(); return true; }, f);
    try {
      await p.goto(B + '/' + t + '/', { waitUntil:'domcontentloaded' }); await app('Alfa'); await herlaad();
      if (!await klik(VB) || !await vbOpen()) { console.log(`  --   ${t}: geen voorbeeld`); await c.close(); continue; }
      getest++;
      const eigen = await klik(EIG); await herlaad();
      await app('Beta'); await herlaad(); await klik(VB);
      // geen voorbeeldknop meer in beeld (de tool toont geen startkaart naast eigen werk van een ander project): die stap kan hier niet
      if (!await vbOpen()) { console.log(`  --   ${t}: onder Beta geen knop Voorbeeld bekijken in beeld`); await c.close(); continue; }
      await herlaad(); ok(await vbOpen(), `${t}: Voorbeeld bekijken en herladen: het voorbeeld staat terug open`);
      // via de projectkiezer: eerst een ander tabblad (Alfa, eigen werk), dan het voorbeeld
      const a1 = eigen ? await pk('ander') : null;
      if (a1) { await p.waitForTimeout(600); const a2 = await pk('vb'); await p.waitForTimeout(700);
        if (a2) { kiezer++; const voor = await vbOpen(); await herlaad();
          ok(voor && await vbOpen(), `${t}: eerst het tabblad van Alfa, dan het voorbeeld in de projectkiezer, herladen: het voorbeeld blijft open`); } }
      // een ander project in de app: de tool volgt, het voorbeeld blijft in de kiezer
      await app('Gamma'); await herlaad();
      const naG = await vbOpen(), nog = await p.evaluate(() => { if (!window.ocPk || !ocPk.knop) return true; ocPk.knop.click(); const n = document.querySelectorAll('.oc-pk-item .oc-pk-vb').length; ocPk.sluit && ocPk.sluit(); return n > 0; });
      ok(!naG && nog, `${t}: een ander project in de app: de tool volgt, het voorbeeld blijft in de kiezer (open=${naG}, in kiezer=${nog})`);
    } catch (e) { ok(false, `${t}: ${String(e).slice(0, 120)}`); }
    await c.close();
  }
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  console.log(`${getest} tools met een voorbeeld, ${kiezer} met de kiezerstap`);
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
