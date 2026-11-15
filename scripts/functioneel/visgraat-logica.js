// Visgraat: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/visgraat/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  await p.evaluate(() => example()); await p.waitForTimeout(300);
  const meerDanDrie = () => p.evaluate(() => [...document.querySelectorAll('.warn')].some(x => /meer dan drie/.test(x.textContent)));
  // Vier oorzaken als waarschijnlijk aanduiden, allemaal nog na te gaan
  const ids = await p.evaluate(() => { const u = cur(); u.causes.forEach(c => { c.likely = false; c.uit = ''; }); const k = u.causes.filter(c => c.text.trim()).slice(0, 4); k.forEach(c => c.likely = true); save(); render(); return k.map(c => c.id); });
  await p.waitForTimeout(200);
  ok(ids.length === 4 && await meerDanDrie(), 'vier gekozen oorzaken: waarschuwing "meer dan drie"');
  // 1. Eén ervan klopt niet: dan blijven er drie over en past de waarschuwing niet meer (denken, visgraat)
  await p.click(`[data-act="uit"][data-id="${ids[0]}"][data-v="nee"]`); await p.waitForTimeout(200);
  ok(await p.evaluate(id => cur().causes.find(c => c.id === id).uit === 'nee', ids[0]), 'de eerste oorzaak staat op "klopt niet"');
  ok(!(await meerDanDrie()), 'een oorzaak die niet klopt, telt niet mee voor "meer dan drie"');
  // Een vijfde kiezen: weer vier die kunnen kloppen, de waarschuwing komt terug
  await p.evaluate(() => { const u = cur(); const x = u.causes.find(c => c.text.trim() && !c.likely); x.likely = true; save(); render(); }); await p.waitForTimeout(200);
  ok(await meerDanDrie(), 'vier oorzaken die nog kunnen kloppen: de waarschuwing komt terug');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
