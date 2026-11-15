// Mindmap: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
const plak = (p, sel, tekst) => p.evaluate(([sel, tekst]) => { const el = document.querySelector(sel); el.focus(); const dt = new DataTransfer(); dt.setData('text/plain', tekst); el.dispatchEvent(new ClipboardEvent('paste', { clipboardData:dt, bubbles:true, cancelable:true })); }, [sel, tekst]);
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/mindmap/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const nieuweKaart = naam => p.evaluate(naam => { const m = newMap(naam); state.maps.push(m); state.current = m.id; save(); render(); return m.nodes[0].id; }, naam);
  const toast = () => p.innerText('#toast-text');
  // 1. Een ingesprongen lijst in een lege kern: "Opleiding" blijft onder "Personeel" (denken, mindmap)
  let kern = await nieuweKaart('Test'); await p.waitForTimeout(200);
  await plak(p, `.mtxt[data-id="${kern}"]`, 'Nieuw loket\n- Openingsuren\n- Personeel\n  - Opleiding\n- Budget'); await p.waitForTimeout(250);
  let ideeen = await p.evaluate(() => cur().nodes.map(n => n.level + ':' + n.text).join(', '));
  ok(ideeen === '0:Nieuw loket, 1:Openingsuren, 1:Personeel, 2:Opleiding, 1:Budget', 'de niveaus blijven zoals in de lijst (' + ideeen + ')');
  let t = await toast(); ok(/^Kern ingevuld en 4 ideeën geplakt/.test(t), 'de melding telt de vier ideeën onder de kern (' + t + ')');
  // 2. Een lijst die onder de eerste regel inspringt: de eerste ingesprongen regel wordt een hoofdtak
  kern = await nieuweKaart('Inspring'); await p.waitForTimeout(200);
  await plak(p, `.mtxt[data-id="${kern}"]`, 'Kern\n  Tak\n    Subtak\n  Tak twee'); await p.waitForTimeout(250);
  ideeen = await p.evaluate(() => cur().nodes.map(n => n.level + ':' + n.text).join(', '));
  ok(ideeen === '0:Kern, 1:Tak, 2:Subtak, 1:Tak twee', 'ingesprongen onder de kern: tak, subtak, tak (' + ideeen + ')');
  // 3. Twee regels in een lege kern: enkelvoud, geen "1 ideeën"
  kern = await nieuweKaart('Twee'); await p.waitForTimeout(200);
  await plak(p, `.mtxt[data-id="${kern}"]`, 'Kern\nEen tak'); await p.waitForTimeout(250);
  t = await toast(); ok(!/1 ideeën/.test(t) && /1 idee geplakt/.test(t), 'enkelvoud bij één idee (' + t + ')');
  // 4. Twee regels in een gevulde kern: twee ideeën
  await plak(p, `.mtxt[data-id="${kern}"]`, 'Alpha\nBeta'); await p.waitForTimeout(250);
  t = await toast(); ok(/^2 ideeën geplakt/.test(t), 'twee regels in een gevulde kern: 2 ideeën (' + t + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })().catch(e => { console.error('CRASH', e); process.exit(2); });
