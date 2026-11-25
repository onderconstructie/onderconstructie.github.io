// "Nog open" op Start: het kruisje verbergt de regel voor dat plan; "Stop met dit plan" maakt het plan weer niet-begonnen. Gegevens blijven.
const { chromium } = require('playwright'); const B = process.env.BASE || 'http://127.0.0.1:' + (process.env.PORT || 9281); const S = process.env.SHOTS || 'shots';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:390, height:844 }, hasTouch:true, isMobile:true, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  // een begonnen plan (proces), met gegevens in de eerste stap en die stap als laatst gebruikte tool
  await p.addInitScript(() => { if (sessionStorage.getItem('x')) return; sessionStorage.setItem('x', '1'); localStorage.setItem('oc-app.welkom-weg', '1'); });
  await p.goto(B + '/', { waitUntil:'networkidle' }); await p.waitForTimeout(600);
  const zet = () => p.evaluate(() => { markStarted('proces'); pathCtx = 'proces'; store.set('path-ctx', 'proces'); const t = stepsOf('proces')[0].t; const u = store.get('usage', {}); u[t.id] = { t: Date.now(), n: 1 }; store.set('usage', u); renderRecent(); return t.id; });
  const stap = await zet(); await p.waitForTimeout(300);
  const zichtbaar = () => p.isVisible('#rs-open'); console.log('   eerste stap:', stap, '| regel:', (await p.textContent('#rs-open')).trim().slice(0, 80));
  if (!(await zichtbaar())) { console.log('   (regel niet zichtbaar in deze opstelling: de grote knop is geen planstap)'); }
  ok(await zichtbaar() && /Nog open:/.test(await p.textContent('#rs-open')), 'de regel Nog open staat er'); await p.screenshot({ path:S + '/nog-open.png', clip:{ x:0, y:0, width:390, height:520 } });
  ok(!(await p.$('#rs-open .rs-o-x')), 'zonder kruisje: de regel verdwijnt als je het plan afwerkt of stopt');
  // Stop met dit plan, in de plankaart
  await p.tap('.tab[data-tab="projecten"]'); await p.waitForTimeout(500); await p.evaluate(() => { store.set('paths-open', ['proces']); renderPaths(); }); await p.waitForTimeout(300);
  ok(await p.isVisible('#plan-keuze .path[data-path="proces"] [data-plan-stop]') && !(await p.$('#plan-keuze .path[data-path="project"] [data-plan-stop]')), 'Stop met dit plan staat alleen in het begonnen plan'); await p.screenshot({ path:S + '/plan-stop.png', fullPage:true });
  ok(!(await p.$('.path-x')) && /Stop met dit plan/.test(await p.textContent('#plan-keuze .path[data-path="proces"] .plan-stop:not(.plan-opnieuw)')) && await p.isVisible('#plan-keuze .path[data-path="proces"] .plan-stop:not(.plan-opnieuw) button'), 'als knop met woorden onderaan het plan, geen kruisje');
  { const m = await p.evaluate(() => { const k = document.querySelector('#plan-keuze .path[data-path="proces"] .plan-stop:not(.plan-opnieuw)'), b = k.querySelector('button'), c = getComputedStyle(b), r = b.getBoundingClientRect(); return { h:r.height, lijn:c.textDecorationLine, rand:parseFloat(c.borderTopWidth), icoon:!!b.querySelector('svg'), uitleg:k.querySelector(':scope > span').textContent, woorden:b.querySelector('span').textContent, strook:getComputedStyle(k).borderTopWidth, binnen:k.getBoundingClientRect().right <= k.closest('.path').getBoundingClientRect().right + 0.5 }; });
    ok(m.h >= 44 && m.h <= 48 && m.lijn === 'none' && m.rand >= 1 && m.icoon && m.strook === '1px' && m.binnen, 'stoppen is een rustige knop in een eigen strook onder de stappen, geen onderstreepte link (v17.34) ' + JSON.stringify(m));
    ok(m.uitleg === 'Je werk blijft staan.', 'en zegt in vier woorden dat je werk blijft staan (v17.35)'); }
  await p.evaluate(() => localStorage.setItem('testgegevens', 'x')); const voor = await p.evaluate(() => Object.keys(localStorage).filter(k => !k.startsWith('oc-app.')).sort().join());
  await p.evaluate(() => document.querySelector('#plan-keuze [data-plan-stop="proces"]').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => !startedPaths().includes('proces') && pathCtx === null) && !(await p.$('[data-plan-stop="proces"]')), 'gestopt: het plan telt niet meer als begonnen');
  ok(voor === await p.evaluate(() => Object.keys(localStorage).filter(k => !k.startsWith('oc-app.')).sort().join()), 'de gegevens in de tools blijven staan');
  // opnieuw beginnen: de regel mag terugkomen
  await p.tap('.tab[data-tab="start"]'); await zet(); await p.waitForTimeout(300); ok(await zichtbaar(), 'opnieuw begonnen: Nog open staat er weer');
  ok(!E.length, 'geen paginafouten ' + E); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); await b.close(); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
