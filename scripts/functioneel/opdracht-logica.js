// Projectopdracht: vaste testen voor inhoudelijke fouten die testers vonden. Elke toets is een geval dat ooit fout ging.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9022);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const PE = [];
  const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block', locale:'nl-BE', timezoneId:'Europe/Brussels' });
  await c.clock.setFixedTime(new Date('2026-11-15T10:00:00+01:00'));   // vandaag: zondag 15 november 2026
  const p = await c.newPage(); p.on('pageerror', e => PE.push(String(e))); await p.goto(B + '/opdracht/', { waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const sig = (o, vb) => p.evaluate(([o, vb]) => { const x = Object.assign({}, cur(), { waarom:'x', opleveren:'y', opdrachtgever:'z', doelen:['Wachttijd halveren'], buiten:['Papier'], knelt:'tijd', risicos:['r'], escaleren:'e' }, o);
    if (vb) x.voorbeeld = true; return signalen(x).map(s => (s.zacht ? '~' : '!') + s.tekst); }, [o, vb]);
  // 1. Einddatum voorbij: een (zachte) vraag
  let s = await sig({ einddatum:'2026-06-30', mijlpalen:[{ id:'a', text:'Ontwerp goedgekeurd', date:'2026-03-01' }] });
  ok(s.some(x => /^~De einddatum is voorbij: 30 jun\.? 2026/.test(x)), 'einddatum 30 juni 2026 is voorbij: signaal (' + s.join(' | ') + ')');
  ok(s.some(x => /^~Datum voorbij: ‘Ontwerp goedgekeurd’/.test(x)), 'mijlpaal 1 maart 2026 is voorbij: signaal');
  // 2. Toekomst en vandaag: geen signaal
  s = await sig({ einddatum:'2027-06-30', mijlpalen:[{ id:'a', text:'Vandaag klaar', date:'2026-11-15' }, { id:'b', text:'Live', date:'2027-01-15' }] });
  ok(!s.some(x => /voorbij/.test(x)), 'vandaag en later: geen signaal (' + s.join(' | ') + ')');
  // 3. Een mijlpaal na de einddatum blijft het harde signaal
  s = await sig({ einddatum:'2027-06-30', mijlpalen:[{ id:'a', text:'Live', date:'2027-07-15' }] });
  ok(s.some(x => /^!Mijlpaal na de einddatum/.test(x)) && !s.some(x => /voorbij/.test(x)), 'mijlpaal na de einddatum: zoals vroeger');
  // 4. Het voorbeeld (vaste datums) krijgt dit signaal niet, ook niet later
  s = await sig({ einddatum:'2026-06-30', mijlpalen:[{ id:'a', text:'Ontwerp goedgekeurd', date:'2026-03-01' }] }, true);
  ok(!s.some(x => /voorbij/.test(x)), 'geen "voorbij" in het voorbeeld');
  // 5. Op het scherm
  await p.evaluate(() => { Object.assign(cur(), { waarom:'x', opleveren:'y', opdrachtgever:'z', doelen:['Wachttijd halveren met 50%'], buiten:['Papier'], knelt:'tijd', risicos:['r'], escaleren:'e', einddatum:'2026-06-30', mijlpalen:[{ id:'a', text:'Ontwerp goedgekeurd', date:'2026-03-01' }] }); save(); render(); });
  await p.waitForTimeout(300);
  ok(/De einddatum is voorbij/.test(await p.evaluate(() => document.getElementById('controle').textContent)), 'het signaal staat in het vak Klaar om te laten aftekenen');
  ok(!PE.length, 'geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
