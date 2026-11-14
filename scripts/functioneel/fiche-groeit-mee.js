// Nieuwe gebruiker op een gsm: de slanke Projectopdracht, de fiche die meegroeit, en de slotstap.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 8991);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => {
  const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, serviceWorkers: 'block', locale: 'nl-BE' });
  const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  const shot = n => p.screenshot({ path: `shots/${n}.png` });
  await p.goto(B + '/', { waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  await p.click('#wz-start'); await p.waitForTimeout(300); await p.click('#wz-keuzes [data-doel="project"]'); await p.waitForTimeout(400); await p.fill('#wz-naam', 'Digitaal premieloket');
  ok((await p.textContent('#wz-rk')).trim() === '7 stappen', 'wizard: korte route telt 7 stappen: ' + (await p.textContent('#wz-rk')));
  await p.click('#wz-form button[type=submit]'); await p.waitForTimeout(300); await (await p.$('#wiz .wz-scherm[data-scherm="4"] .wz-go')).click(); await p.waitForTimeout(1600);
  const fr = async () => { for (const h of await p.$$('iframe')) if (await h.isVisible().catch(() => false)) return await h.contentFrame(); return null; };
  const balk = async () => (await p.textContent('#pathbar')).replace(/\s+/g, ' ').trim().slice(0, 90);
  const volgende = async () => { await p.click('#pathbar .pb-next'); await p.waitForTimeout(1500); return await fr(); };
  const meet = f => f.evaluate(() => { const zicht = e => e.offsetParent !== null; const v = [...document.querySelectorAll('#form textarea, #form input, #teken-wrap input')].filter(zicht);
    const cut = v.filter(e => e.tagName === 'TEXTAREA' && !e.value && e.placeholder).filter(e => { const h = e.clientHeight; e.value = e.placeholder; const s = e.scrollHeight; e.value = ''; return s > h + 1; }).length;
    return { velden: v.length, hoog: document.documentElement.scrollHeight, schermen: +(document.documentElement.scrollHeight / innerHeight).toFixed(1), afgesneden: cut, breed: document.documentElement.scrollWidth > innerWidth + 1 }; });

  // ---- stap 1: de kern
  let f = await fr(); await shot('1-start');
  console.log('balk:', await balk());
  if (await f.isVisible('#begin-btn')) { await f.click('#begin-btn'); await p.waitForTimeout(700); } await f.evaluate(() => document.activeElement && document.activeElement.blur()); await shot('2-kern-leeg');
  let m = await meet(f); console.log('kern leeg:', JSON.stringify(m));
  ok(m.velden === 5, 'kern toont 5 vakken (was 20): ' + m.velden); ok(m.afgesneden === 0, 'geen afgesneden voorbeeldtekst'); ok(!m.breed, 'geen zijwaarts scrollen'); ok(m.schermen <= 2.2, 'kern past in ruim 2 schermen: ' + m.schermen);
  ok(!(await f.isVisible('#secnav')) && !(await f.isVisible('#controle')) && !(await f.isVisible('#s-teken')), 'kern: geen nummers, geen controle, geen aftekenen');
  await f.fill('#f-waarom', 'Aanvragers wachten nu drie weken op een beslissing.'); await f.fill('[data-list="doelen"] [data-i="0"]', 'Een beslissing binnen 10 werkdagen'); await f.fill('#f-opleveren', 'Een online loket voor premies'); await f.fill('#f-opdrachtgever', 'An Peeters, directeur'); await f.fill('#f-einddatum', '2027-06-30');
  await p.waitForTimeout(500); ok(await f.isVisible('[data-kern-ok]'), 'melding: de kern staat erin'); await f.evaluate(() => scrollTo(0, 0)); await shot('3-kern-vol');
  await f.evaluate(() => scrollTo(0, 99999)); await p.waitForTimeout(200); await shot('4-kern-rest');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('opdracht.v1')).opdrachten[0].vol === false), 'zicht bewaard: de kern');

  // ---- stap 2: Productboom
  f = await volgende(); console.log('balk:', await balk());
  for (const [oud, nieuw] of [['Eerste deelresultaat', 'Website'], ['Tweede deelresultaat', 'Handleiding'], ['Derde deelresultaat', 'Opleiding']]) { const g = f.locator('#canvas g[data-node]', { hasText: oud }).first(); await g.scrollIntoViewIfNeeded().catch(() => {}); await g.tap().catch(() => console.log('  tik mislukt', oud)); await p.waitForTimeout(350); await g.tap().catch(() => {}); await p.waitForTimeout(350); await p.keyboard.press('Control+A'); await p.keyboard.type(nieuw); await p.keyboard.press('Enter'); await p.waitForTimeout(400); await f.locator('#canvas').tap({ position: { x: 5, y: 5 } }).catch(() => {}); }
  await p.waitForTimeout(600);
  // ---- stap 3: Tijdlijn (mijlpalen via de tool zelf)
  f = await volgende(); console.log('balk:', await balk());
  await f.evaluate(() => { const l = cur(); [['Ontwerp goedgekeurd', '2027-01-15'], ['Loket getest', '2027-04-01'], ['Loket online', '2027-06-15']].forEach(([text, date], i) => l.items.push(normItem({ text, date, created: Date.now() + i }))); save(); render(); });
  await p.waitForTimeout(500);
  // ---- stap 4: RACI
  f = await volgende(); console.log('balk:', await balk());
  await f.evaluate(() => { addRoles('Sara\nJonas\nLeen'); }); await p.waitForTimeout(500);
  console.log('  raci rollen:', await p.evaluate(() => JSON.parse(localStorage.getItem('raci.v1')).mats.map(m => m.name + ': ' + m.roles.map(r => r.name).join(',')).join(' | ')));
  // ---- stap 5: Takenbord
  f = await volgende(); console.log('balk:', await balk());
  // ---- stap 6: slotstap
  ok(/Kijk na en laat aftekenen/.test(await p.textContent('#pathbar .pb-next')), 'volgende knop na het Takenbord: ' + (await p.textContent('#pathbar .pb-next')).replace(/\s+/g, ' ').trim());
  f = await volgende(); await p.waitForTimeout(800); f = await fr(); console.log('balk:', await balk());
  ok(/6 van 7/.test(await balk()), 'slotstap is stap 6 van 7');
  ok(/toon=alles/.test(f.url()), 'fiche opent met alle vakken: ' + f.url());
  await shot('5-slot-boven');
  const st = await f.evaluate(() => { const o = cur(); return { vol: o.vol, ms: o.mijlpalen.map(x => x.text + ' ' + x.date), team: o.kernteam, od: (document.querySelector('[data-onderdelen]') || {}).textContent, status: document.getElementById('status-row').textContent.trim(), bronMs: (document.querySelector('[data-bron="mijlpalen"]') || {}).textContent, bronT: (document.querySelector('[data-bron="kernteam"]') || {}).textContent }; });
  console.log('  fiche:', JSON.stringify(st));
  ok(st.vol === true, 'alle vakken'); ok(st.ms.length === 3 && /Ontwerp goedgekeurd 2027-01-15/.test(st.ms[0]), 'mijlpalen uit de Tijdlijn staan in de fiche');
  ok(st.team === 'Sara, Jonas, Leen', 'team uit de RACI-matrix: ' + st.team); ok(/Website, Handleiding, Opleiding/.test(st.od || ''), 'onderdelen uit de Productboom: ' + st.od);
  ok(/Komt uit je Tijdlijn/.test(st.bronMs || ''), 'herkomst bij de mijlpalen'); ok(/Nog \d+ punt/.test(st.status), 'status bovenaan: ' + st.status);
  m = await meet(f); console.log('alles:', JSON.stringify(m)); ok(m.afgesneden === 0, 'alle vakken: geen afgesneden voorbeeldtekst'); ok(!m.breed, 'alle vakken: geen zijwaarts scrollen');
  await f.evaluate(() => document.getElementById('s-mijlpalen').scrollIntoView()); await p.waitForTimeout(200); await shot('6-slot-mijlpalen');
  await f.evaluate(() => document.getElementById('s-einde').scrollIntoView()); await p.waitForTimeout(200); await shot('7-slot-einde');
  ok(/Onderdelen: Website, Handleiding, Opleiding/.test(await f.evaluate(() => alsTekst())), 'export als tekst bevat de onderdelen');

  // ---- de bron verandert: onaangeroerd volgt, eigen werk wordt gevraagd
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('tijdlijn.v1')); d.lists[0].items[0].date = '2027-02-01'; localStorage.setItem('tijdlijn.v1', JSON.stringify(d)); });
  await f.evaluate(() => groeiNu()); await p.waitForTimeout(300);
  ok(await f.evaluate(() => cur().mijlpalen[0].date === '2027-02-01'), 'datum gewijzigd in de Tijdlijn: de fiche volgt');
  await f.fill('[data-ms] [data-msf="text"]', 'Ontwerp afgeklopt'); await p.waitForTimeout(400);
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('tijdlijn.v1')); d.lists[0].items[1].date = '2027-04-10'; localStorage.setItem('tijdlijn.v1', JSON.stringify(d)); });
  await f.evaluate(() => { document.activeElement.blur(); groeiNu(); }); await p.waitForTimeout(300);
  ok(await f.evaluate(() => cur().mijlpalen[0].text === 'Ontwerp afgeklopt') && /heeft iets anders/.test(await f.textContent('[data-bron="mijlpalen"]')), 'zelf gewijzigd: niet overschreven, wel een vraag');
  await f.evaluate(() => document.querySelector('[data-bron="mijlpalen"]').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200); await shot('8-vraag');
  await f.click('[data-bron-laat="mijlpalen"]'); await p.waitForTimeout(300);
  ok(await f.evaluate(() => document.querySelector('[data-bron="mijlpalen"]').hidden && cur().mijlpalen[0].text === 'Ontwerp afgeklopt'), 'Laat zo: de vraag verdwijnt, je tekst blijft');
  await f.evaluate(() => groeiNu()); ok(await f.evaluate(() => document.querySelector('[data-bron="mijlpalen"]').hidden), 'Laat zo: de vraag komt niet terug zolang de bron gelijk blijft');
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('tijdlijn.v1')); d.lists[0].items[2].date = '2027-06-20'; localStorage.setItem('tijdlijn.v1', JSON.stringify(d)); });
  await f.evaluate(() => groeiNu()); await p.waitForTimeout(200); await f.click('[data-bron-neem="mijlpalen"]'); await p.waitForTimeout(400);
  ok(await f.evaluate(() => cur().mijlpalen[0].text === 'Ontwerp goedgekeurd' && cur().mijlpalen[2].date === '2027-06-20'), 'Werk bij: de fiche neemt de Tijdlijn over');

  // ---- wisselen tussen de kern en alle vakken
  await f.evaluate(() => scrollTo(0, 0)); await f.click('.zicht [data-zicht="kern"]'); await p.waitForTimeout(400);
  m = await meet(f); ok(m.velden === 5, 'terug naar de kern: 5 vakken'); await f.evaluate(() => scrollTo(0, 99999)); await p.waitForTimeout(200); await shot('9-kern-gegroeid');
  ok(/3 mijlpalen/.test(await f.textContent('[data-groei]')) && /Sara, Jonas, Leen/.test(await f.textContent('[data-groei]')), 'de kern toont wat er al bijkwam');
  await f.click('#groei [data-zicht="alles"]'); await p.waitForTimeout(400); ok(await f.isVisible('#s-risicos'), 'Toon alle vakken werkt');

  // ---- aftekenen: de slotstap is klaar
  await f.fill('#f-tnaam', 'An Peeters'); await f.fill('#f-tdatum', '2026-11-14'); await p.waitForTimeout(600);
  ok(await p.evaluate(() => ficheAfgetekend()), 'afgetekend: de slotstap telt als klaar');
  // afgetekend en de bron verandert: nooit vanzelf
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('tijdlijn.v1')); d.lists[0].items[0].date = '2027-02-10'; localStorage.setItem('tijdlijn.v1', JSON.stringify(d)); });
  await f.evaluate(() => { document.activeElement.blur(); groeiNu(); }); await p.waitForTimeout(300);
  ok(await f.evaluate(() => cur().mijlpalen[0].date === '2027-02-01') && /heeft iets anders/.test(await f.textContent('[data-bron="mijlpalen"]')), 'afgetekend: de fiche verandert niet vanzelf, er komt een vraag');

  // ---- de Projectopdracht zelf openen is weer stap 1
  await p.click('#pathbar .pb-where'); await p.waitForTimeout(500); await shot('10-plan');
  const plan = await p.evaluate(() => [...document.querySelectorAll('#plan-dlg li')].map(l => l.textContent.replace(/\s+/g, ' ').trim().slice(0, 60)));
  console.log('  plan:', JSON.stringify(plan));
  console.log('paginafouten:', E.length ? E : 'geen'); ok(!E.length, 'geen paginafouten');
  console.log(fout.length ? `\n${fout.length} FOUT` : '\nalles ok'); await b.close(); process.exit(fout.length ? 1 : 0);
})().catch(e => { console.error('CRASH', e); process.exit(2); });
