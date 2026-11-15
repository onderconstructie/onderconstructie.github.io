// Meetplan: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  await c.clock.setFixedTime(new Date('2026-11-15T10:00:00+01:00'));
  const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e))); await p.goto(B + '/meetplan/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const stand = o => p.evaluate(o => { const i = normInd(Object.assign(newInd(), { name:'X' }, o)); const c = calc(i), s = standOf(i, c); return { short:s.short, words:s.words, pct:s.pct }; }, o);
  const sig = o => p.evaluate(o => { const d = Object.assign(newDoel('Doel'), { inds:[normInd(Object.assign(newInd(), { name:'X' }, o))] }); return doelSignals(d).map(s => s.f + ':' + s.text); }, o);
  // 1. "Hoger is beter" met een streefwaarde onder de nulmeting: niet stil "gehaald", wel een melding
  const H = { nul:{ v:'10', d:'2026-01-01' }, streef:{ v:'5', d:'2026-12-31' }, richting:'hoger', freq:'kwartaal', wie:'An', metingen:[{ id:'m1', d:'2026-07-01', v:'8' }] };
  let s = await stand(H); ok(s.short !== 'gehaald' && s.pct == null, 'hoger is beter, streef 5 onder nul 10: geen "gehaald" (' + s.short + ')');
  ok(/Hoger is beter.*streefwaarde \(5\) ligt lager dan je nulmeting \(10\)/.test(s.words), 'de stand zegt wat botst (' + s.words + ')');
  let g = await sig(H); ok(g.some(x => /^richting:.*Kijk de richting of de cijfers na/.test(x)), 'een melding bij de richting (' + g.join(' | ') + ')');
  ok(!g.some(x => /al gehaald bij de nulmeting/.test(x)), 'geen tip "al gehaald bij de nulmeting"');
  // 2. Omgekeerd: "Lager is beter" en de streefwaarde ligt hoger
  const L = Object.assign({}, H, { nul:{ v:'40%', d:'2026-01-01' }, streef:{ v:'60%', d:'2026-12-31' }, richting:'lager', metingen:[{ id:'m1', d:'2026-07-01', v:'30%' }] });
  s = await stand(L); ok(s.short !== 'gehaald' && /Lager is beter.*\(60%\) ligt hoger dan je nulmeting \(40%\)/.test(s.words), 'lager is beter, streef 60% boven nul 40%: melding (' + s.short + ' | ' + s.words + ')');
  // 3. Geen botsing: alles blijft zoals het was
  s = await stand(Object.assign({}, H, { richting:'lager' })); ok(s.short === '40%', 'lager is beter, 10 naar 5, meting 8: 40% (' + s.short + ')');
  s = await stand(Object.assign({}, H, { richting:'' })); ok(s.short === '40%', 'zonder gekozen richting volgt ze uit de cijfers: 40% (' + s.short + ')');
  g = await sig(Object.assign({}, H, { richting:'lager' })); ok(!g.some(x => /^richting:/.test(x)), 'geen melding als de richting klopt');
  // 4. Op het scherm
  await p.evaluate(H => { const pl = cur(); pl.doelen.push(Object.assign(newDoel('Minder klachten'), { open:true, inds:[normInd(Object.assign(newInd(), { name:'Klachten' }, H))] })); save(); render(); }, H);
  await p.waitForTimeout(300);
  const t = await p.evaluate(() => document.body.innerText);
  ok(/richting nakijken|Kijk de richting of de cijfers na/.test(t) && !/Streefwaarde gehaald/.test(t), 'op het scherm staat de melding, niet "gehaald"');
  // 5. Het voorbeeld botst nergens
  await p.evaluate(() => document.getElementById('example').click()); await p.waitForTimeout(300);
  ok(await p.evaluate(() => cur().doelen.every(d => d.inds.every(i => !calc(i).botst))), 'het voorbeeld heeft geen botsende richting');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
