// RACI-matrix: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8000);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/raci/', { waitUntil:'domcontentloaded' });
  // 1. "Scholen" kwam uit de Betrokkenenradar, werd daar verwijderd en opnieuw toegevoegd (nieuwe ref). Het signaal "staat niet meer in" bleef staan (hertest b).
  // 2. Zelfde naam in twee projecten (een gekopieerd project heeft dezelfde refs): Zwembad heeft geen Scholen meer in de bron.
  //    Dat Nieuwe bib er wel een heeft (met dezelfde ref), mag het signaal in Zwembad niet wegnemen.
  await p.evaluate(() => {
    localStorage.setItem('oc.share.stakeholders', JSON.stringify({ id:'stakeholders', tool:'Betrokkenenradar', updated:Date.now(), lists:[
      { name:'Nieuwe bib', project:'Nieuwe bib', items:[{ type:'betrokkene', text:'Scholen', ref:'s2' }] },
      { name:'Zwembad', project:'Zwembad', items:[{ type:'betrokkene', text:'Ouders', ref:'s9' }] }] }));
    const rol = (id, ref) => ({ id, name:'Scholen', van:'stakeholders', ref, bron:'Betrokkenenradar' });
    localStorage.setItem('raci.v1', JSON.stringify({ mats:[{ id:'m1', name:'Nieuwe bib', roles:[rol('r1', 's1')], tasks:[] }, { id:'m2', name:'Zwembad', roles:[rol('r2', 's2')], tasks:[] }], current:'m1' }));
    localStorage.setItem('oc.project', JSON.stringify({ name:'Nieuwe bib', since:1 }));
  });
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400);
  const sein = () => p.evaluate(() => [...document.querySelectorAll('.oc-weg')].map(e => e.textContent.trim()).join(' | '));
  let r = await sein(); ok(r === '', 'Nieuwe bib: Scholen staat opnieuw in de Betrokkenenradar, geen signaal (' + r + ')');
  await p.evaluate(() => localStorage.setItem('oc.project', JSON.stringify({ name:'Zwembad', since:2 }))); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(1200);
  r = await sein(); ok(/staat niet meer in Betrokkenenradar/.test(r), 'Zwembad: Scholen staat daar niet meer in de bron, het signaal blijft (' + r + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
