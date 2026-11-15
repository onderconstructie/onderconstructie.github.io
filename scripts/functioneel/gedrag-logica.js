// Gedragsverandering: vaste testen voor inhoudelijke fouten die testers vonden (niet gescoorde delen zijn niet "zit goed").
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9021);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + '/gedrag/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const zet = sc => p.evaluate(sc => { let u = state.units.find(x => x.wie === 'Baliemedewerkers'); if (!u) { u = newUnit('Baliemedewerkers'); u.wat = 'plannen elke afspraak in het nieuwe systeem'; state.units.push(u); }
    u.scores = sc; state.current = u.id; save(); render();
    return { s3: document.getElementById('s3').innerText.replace(/\s+/g, ' '), staat: Object.fromEntries([...document.querySelectorAll('#s3 .help-block')].map(h => [h.id.slice(3), h.querySelector('.hb-state').innerText.trim()])) }; }, sc);
  // 1. Eén deel gescoord als "zit goed": niet "Alles zit goed", en de andere delen staan als nog niet gescoord
  let r = await zet({ duidelijk:2 });
  ok(!/Alles zit goed/.test(r.s3), 'één deel gescoord: stap 3 zegt niet "Alles zit goed"');
  ok(r.staat.duidelijk === 'zit goed' && ['eraan', 'vlot', 'loont', 'gezien'].every(k => r.staat[k] === 'nog niet gescoord'), 'niet gescoorde delen: "nog niet gescoord" (' + JSON.stringify(r.staat) + ')');
  // 2. Alle vijf gescoord als "zit goed": dan wel "Alles zit goed"
  r = await zet({ duidelijk:2, eraan:2, vlot:2, loont:2, gezien:2 });
  ok(/Alles zit goed/.test(r.s3) && Object.values(r.staat).every(v => v === 'zit goed'), 'alle delen gescoord: "Alles zit goed"');
  // 3. Een remmer en de rest leeg: alleen de remmer staat in stap 3
  r = await zet({ vlot:0 }); ok(!/Alles zit goed/.test(r.s3) && Object.keys(r.staat).join() === 'vlot' && r.staat.vlot === 'houdt tegen', 'een remmer: alleen die staat in stap 3 (' + JSON.stringify(r.staat) + ')');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
