// Systeemkaart: drie kaarten van een systeemdenker (toxisch leiderschap, thuiswerken, werkdruk) als vaste toetsen voor de rekenkern (1.2).
// Elke toets ging fout in versie 1.1 (v16.54): kantelpunt op nul, geen tijdelijke ingreep, geen voorraad, flikkerend ↕, kringvolgorde, A/B-tekst, tips.
// Gebruik: PORT=9461 node systeemkaart-cases-logica.js   (SK=/ander-pad/ om een andere bouw te toetsen)
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461), PAD = process.env.SK || '/systeemkaart/';
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
// kaart uit korte rijen: elementen [id, soort, naam, x, y, extra], verbanden [van, naar, teken, sterkte, pas na een tijd, vermoeden]
const kaart = (id, E, V, extra = {}) => Object.assign({ id, name:id, over:'', ing:{},
  els:E.map(([i, t, n, x, y, o]) => Object.assign({ id:i, t, n, x, y }, o || {})),
  ver:V.map(([a, b, s, w = 2, v = 0, z = 0], k) => ({ id:'v' + k, a, b, s, w, v:!!v, z:!!z, uit:'' })) }, extra);
const TOX_E = [['g1', 'gedrag', 'kleineert medewerkers in overleg', 420, 0, { wie:'Leidinggevende', doel:'minder', st:'deels' }], ['f1', 'factor', 'Veiligheid om je uit te spreken', 120, 120, { pl:'willen' }], ['g2', 'gedrag', 'melden fouten en problemen', 120, 360, { wie:'Teamleden', doel:'meer' }],
  ['f4', 'factor', 'Fouten die pas laat bovenkomen', 420, 480], ['u1', 'uitkomst', 'Teamresultaten', 720, 360, { doel:'meer' }], ['f5', 'factor', 'Druk van hogerop op de leidinggevende', 720, 120, { st:'nee' }],
  ['f2', 'factor', 'Verzuim', -240, 80], ['f3', 'factor', 'Werkdruk voor wie blijft', -240, 260], ['u2', 'uitkomst', 'Verloop', -240, 460, { doel:'minder' }],
  ['i1', 'ingreep', 'Coaching voor de leidinggevende', 120, -160, { ik:'Oefenen', st:'ja' }], ['i2', 'ingreep', 'Feedback van team en collega\'s', 420, -200, { ik:'Uitleggen', st:'ja' }], ['i3', 'ingreep', 'Vertrouwenspersoon', 120, 640, { ik:'Hindernissen wegnemen', st:'ja' }], ['i4', 'ingreep', 'Leidinggevende vervangen', 720, -160, { ik:'Omgeving aanpassen', st:'ja' }]];
const TOX_V = [['g1', 'f1', '-', 3], ['f1', 'g2', '+', 3], ['f1', 'f2', '-'], ['f1', 'u2', '-'], ['g1', 'u2', '+', 2, 1], ['g2', 'f4', '-'], ['f4', 'u1', '-'], ['u1', 'f5', '-'], ['f5', 'g1', '+', 2, 0, 1], ['f2', 'f3', '+'], ['u2', 'f3', '+'], ['f3', 'f2', '+', 2, 1], ['f3', 'u2', '+', 1, 1], ['f3', 'u1', '-'],
  ['g2', 'f5', '?', 1, 0, 1], ['i1', 'g1', '-', 1, 1], ['i2', 'g1', '-', 1, 1], ['i3', 'g2', '+', 1], ['i4', 'g1', '-', 3]];
const THUIS_E = [['g1', 'gedrag', 'werken thuis', 300, 200, { wie:'Medewerkers' }], ['g2', 'gedrag', 'controleren of iemand online is', 300, -120, { wie:'Leidinggevenden', doel:'minder' }], ['f1', 'factor', 'Pendeltijd', 620, -60], ['f2', 'factor', 'Autonomie', 620, 80, { pl:'willen' }],
  ['f3', 'factor', 'Tijd om geconcentreerd te werken', 620, 500, { pl:'kans' }], ['f4', 'factor', 'Gevoel er alleen voor te staan', 620, 360], ['f5', 'factor', 'Kennis delen tussendoor', 620, 640, { pl:'kunnen' }], ['f6', 'factor', 'Inwerken van nieuwe collega\'s', 950, 760, { pl:'kunnen' }],
  ['f7', 'factor', 'Vertrouwen', 0, -120], ['f8', 'factor', 'Werk dat doorloopt in de vrije tijd', 620, 220], ['f9', 'factor', 'Collega\'s op kantoor', 300, 440, { pl:'kans' }], ['u1', 'uitkomst', 'Welzijn', 950, 100, { doel:'meer' }], ['u2', 'uitkomst', 'Kwaliteit van het werk', 950, 560, { doel:'meer' }],
  ['i1', 'ingreep', 'Vaste teamdag op kantoor', 0, 440, { ik:'Omgeving aanpassen', st:'ja' }], ['i2', 'ingreep', 'Betere samenwerkingstools', 300, 700, { ik:'Hindernissen wegnemen', st:'ja' }], ['i3', 'ingreep', 'Afspraken over bereikbaarheid', 950, 300, { ik:'Beperken', st:'ja' }]];
const THUIS_V = [['g1', 'f1', '-', 3], ['g1', 'f2', '+'], ['g1', 'f3', '?'], ['g1', 'f4', '+'], ['g1', 'f9', '-', 3], ['f9', 'g1', '-', 2, 0, 1], ['f9', 'f5', '+'], ['f5', 'f6', '+', 3], ['f5', 'u2', '+'], ['f6', 'u2', '+', 2, 1], ['f3', 'u2', '+'],
  ['f1', 'u1', '-'], ['f2', 'u1', '+'], ['f4', 'u1', '-', 2, 1], ['f8', 'u1', '-', 2, 1], ['g1', 'f8', '+', 1], ['f7', 'g2', '-'], ['g2', 'f7', '-', 2, 1], ['g2', 'f2', '-'], ['g2', 'f8', '+'], ['f9', 'f7', '+', 1], ['i1', 'f9', '+'], ['i1', 'f1', '+', 1], ['i2', 'f5', '+', 1], ['i2', 'f4', '-', 1], ['i3', 'f8', '-']];
const WERK_E = [['g1', 'gedrag', 'maken overuren', 360, 40, { wie:'Teamleden', doel:'minder' }], ['f1', 'factor', 'Werkdruk', 0, 40], ['f2', 'factor', 'Achterstand', 200, 220], ['f3', 'factor', 'Uitputting', 680, 40], ['f4', 'factor', 'Verzuim', 980, 40], ['f5', 'factor', 'Bezetting', 980, 220],
  ['f6', 'factor', 'Tijd kwijt aan inwerken', 330, 560], ['f7', 'factor', 'Fouten en herwerk', 680, 220], ['f8', 'factor', 'Druk om te kiezen wat voorgaat', 330, -180], ['f9', 'factor', 'Takenpakket', 0, -180, { st:'deels' }], ['u1', 'uitkomst', 'Kwaliteit van de dienstverlening', 680, 400, { doel:'meer' }], ['u2', 'uitkomst', 'Verloop', 980, 400, { doel:'minder' }],
  ['i1', 'ingreep', 'Extra handen', -160, 420, { ik:'Omgeving aanpassen', st:'ja' }], ['i2', 'ingreep', 'Samen kiezen wat voorgaat', 660, -180, { ik:'Hindernissen wegnemen', st:'ja' }], ['i3', 'ingreep', 'Taken schrappen', -300, -180, { ik:'Beperken', st:'ja' }]];
const WERK_V = [['f1', 'g1', '+', 3], ['g1', 'f2', '-'], ['f2', 'f1', '+'], ['g1', 'f3', '+', 2, 1], ['f3', 'f4', '+'], ['f3', 'u2', '+', 2, 1], ['f3', 'f7', '+'], ['f7', 'f2', '+'], ['f7', 'u1', '-'], ['f4', 'f5', '-'], ['u2', 'f5', '-'], ['f5', 'f1', '-'],
  ['u2', 'f6', '+', 2, 1], ['f6', 'f1', '+'], ['f1', 'u1', '-'], ['f2', 'f8', '+'], ['f8', 'f9', '-', 2, 1], ['f9', 'f1', '+'], ['i1', 'f2', '-'], ['i1', 'f6', '+'], ['i2', 'f8', '+'], ['i3', 'f9', '-', 3]];
const met = (E, wijzig) => E.map(r => { const o = wijzig[r[0]]; return o ? [r[0], r[1], r[2], r[3], r[4], Object.assign({}, r[5] || {}, o)] : r; });
const T = s => String(s || '').replace(/\s+/g, ' ').trim();

(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport:{ width:1280, height:900 }, serviceWorkers:'block' }); const p = await c.newPage(); const PE = []; p.on('pageerror', e => PE.push(String(e)));
  await p.goto(B + PAD, { waitUntil:'networkidle' });
  const laad = async k => { await p.evaluate(k => { localStorage.setItem('systeemkaart.v1', JSON.stringify({ lists:[k], current:k.id })); }, k); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300); };
  // per element: richting op het einde en de reeks richtingen per stap
  const sim = push => p.evaluate(push => { const S = window.systeem, r = S.simuleer(push), o = { T:r.T, rust:r.rust }; S.staat().els.forEach(e => { let q = ''; for (let t = 1; t <= r.T; t++) q += S._pijl(r, e.id, t) || '.'; o[e.id] = { eind:S._pijl(r, e.id, r.T), reeks:q, x:r.xs[r.T].get(e.id) || 0 }; }); return o; }, push);
  const ingrijpen = async () => { if (await p.getAttribute('#b-ing', 'aria-pressed') !== 'true') await p.click('#b-ing'); await p.waitForTimeout(400); };
  const tips = () => p.evaluate(() => [...document.querySelectorAll('#sk-paneel .sk-tip')].map(d => d.textContent.replace(/\s+/g, ' ').trim()).join(' | '));
  const oordeel = async () => T((await p.locator('.sk-oordeel').allTextContents()).join(' | '));
  const zie = async () => { await p.click('#b-zie'); await p.waitForTimeout(300); return T(await p.textContent('#sk-paneel')); };

  console.log('Toxisch leiderschap');
  // 1. Stabiel nulpunt: een tijdelijke duw (coaching, zwak en vertraagd) dooft uit. In 1.1 kantelde de kaart voorgoed (kleineren bleef −0,70).
  await laad(kaart('tox', met(TOX_E, { i1:{ duur:'tijdelijk' } }), TOX_V));
  let r = await sim({ i1:1 });
  const tijdens = ['g1', 'f1', 'u2'].filter(id => /[↑↓]/.test(r[id].reeks)), nog = Object.keys(r).filter(id => r[id] && r[id].eind);
  ok(tijdens.length === 3 && !nog.length && r.rust, 'coaching tijdelijk: tijdens de ingreep beweegt er iets, daarna is alles terug zoals nu (' + tijdens + ' | blijft: ' + nog.map(id => id + r[id].eind) + ')');
  // 2. Zwakke coaching tegenover een sterke ingreep (vervangen): het verschil is te zien, in de berekening en in het A/B-oordeel.
  await laad(kaart('tox', TOX_E, TOX_V, { ing:{ i4:1 }, ingA:{ i1:1 } }));
  const ra = await sim({ i1:1 }), rb = await sim({ i4:1 });
  ok(Math.abs(rb.g1.x) >= 1.25 * Math.abs(ra.g1.x) && Math.abs(rb.u2.x) >= 1.25 * Math.abs(ra.u2.x), 'vervangen (sterk) komt duidelijk verder dan coaching (zwak): kleineren ' + ra.g1.x.toFixed(2) + ' tegenover ' + rb.g1.x.toFixed(2) + ', verloop ' + ra.u2.x.toFixed(2) + ' tegenover ' + rb.u2.x.toFixed(2));
  await ingrijpen(); let o = await oordeel();
  ok(/Voor verloop doet B het volgens je kaart beter/.test(o) && /Voor teamresultaten doet B het volgens je kaart beter/.test(o) && !/grens/.test(o), 'A/B coaching tegenover vervangen: B beter voor verloop en teamresultaten (' + o + ')');
  // 3. Eén zwakke pijl "weet ik niet" (meer meldingen, meer of minder druk?): geen ↕ dat per stap aan en uit springt, en niet alles onzeker.
  r = await sim({ i3:1 });
  const flikker = Object.keys(r).filter(id => r[id] && r[id].reeks && /↕/.test(r[id].reeks) && /[↑↓]/.test(r[id].reeks));
  ok(!flikker.length, 'vertrouwenspersoon: geen element wisselt tussen ↕ en een richting (' + flikker.map(id => id + ' ' + r[id].reeks.slice(0, 20)).join(', ') + ')');
  ok(r.g2.eind === '↑' && r.u1.eind === '↑', 'vertrouwenspersoon: melden en teamresultaten stijgen zeker, niet alles is ↕ (' + r.g2.eind + r.u1.eind + ')');
  // 4. De kernkring (kleineren, veiligheid, melden, fouten, resultaten, druk) staat bovenaan en heeft een kringteken op de kaart.
  await laad(kaart('tox', TOX_E, TOX_V));
  const kr = await p.evaluate(() => { const A = window.systeem.analyse(); return { eerste:A.kringen[0].els.slice().sort().join(','), teken:!!document.querySelector('[data-kring="0"]') }; });
  ok(kr.eerste === 'f1,f4,f5,g1,g2,u1' && kr.teken, 'de kernkring staat eerst en krijgt een kringteken op de kaart (' + kr.eerste + ', teken ' + kr.teken + ')');
  // 5. Een ingreep is geen mogelijke hefboom (kaart van de expert, met de overgangskost van vervangen erbij).
  await laad(kaart('tox', TOX_E, TOX_V.concat([['i4', 'f3', '+', 1]])));
  const hef = await p.evaluate(() => window.systeem.analyse().hefbomen.map(e => e.t + ':' + e.n));
  ok(hef.length && hef.every(x => !/^ingreep/.test(x)), 'aandachtspunten zonder ingrepen (' + hef.join(', ') + ')');

  console.log('Thuiswerken');
  // 6. A meer thuiswerken, B meer thuiswerken met een vaste teamdag: B helpt, dus geen "Zoek een andere ingreep".
  await laad(kaart('thuis', THUIS_E, THUIS_V, { ing:{ g1:1, i1:1 }, ingA:{ g1:1 } }));
  await ingrijpen(); o = await oordeel();
  ok(!/Zoek een andere ingreep/.test(o) && /B (het volgens je kaart beter|beperkt de schade)/.test(o), 'A/B thuiswerken met of zonder teamdag: de tool zegt dat B beter doet of de schade beperkt (' + o + ')');
  // 7. Betere samenwerkingstools werkt via kennisdeling op de kwaliteit: geen "Ingreep zonder gedrag: niemand doet iets anders".
  await p.click('#sk-band-x').catch(() => {}); await p.waitForTimeout(200);
  const z = await zie();
  ok(!/niemand doet iets anders|Ingreep zonder/.test(z), 'Inzicht noemt een ingreep die een uitkomst raakt niet "zonder gedrag"');
  // 8. Beide de verkeerde kant op, maar B minder: dan zegt de tool dat B de schade beperkt.
  await laad(kaart('ab', [['x', 'ingreep', 'Strenge controle', 0, 0], ['y', 'ingreep', 'Lichte controle', 0, 160], ['u', 'uitkomst', 'Welzijn', 300, 80, { doel:'meer' }]], [['x', 'u', '-', 3], ['y', 'u', '-', 1]], { ing:{ y:1 }, ingA:{ x:1 } }));
  await ingrijpen(); o = await oordeel();
  ok(/B beperkt de schade/.test(o) && !/Zoek een andere ingreep/.test(o), 'A/B beide slecht, B minder: "B beperkt de schade" (' + o + ')');

  console.log('Werkdruk en verloop');
  // 9. Extra handen tijdelijk: de inwerkkost stopt mee, de kwaliteit herstelt. Blijvend blijft de inwerkkost duwen.
  await laad(kaart('werk', met(WERK_E, { i1:{ duur:'tijdelijk' } }), WERK_V));
  r = await sim({ i1:1 });
  ok(r.u1.eind !== '↓' && r.u1.x > -0.02 && r.f6.eind === '', 'extra handen tijdelijk: kwaliteit niet slechter op het einde, inwerken weer zoals nu (' + r.u1.eind + ' ' + r.u1.x.toFixed(3) + ', ' + r.f6.reeks.slice(0, 16) + ')');
  // 10. Minder overuren: kwaliteit eerst minder, later meer. Je koos al wat je wil: dus de tip zegt dat, en niet "Duid aan wat je wil".
  await laad(kaart('werk', WERK_E, WERK_V, { ing:{ g1:-1 } }));
  await ingrijpen(); let t = await tips();
  ok(!/Duid bij een gedrag of uitkomst aan wat je wil/.test(t) && /Kwaliteit van de dienstverlening" wordt eerst slechter en later beter/.test(t), 'minder overuren: de tip zegt eerst slechter, later beter (' + t + ')');
  // 11. Stapelt op: een achterstand die blijft na een tijdelijke ingreep; meteen: terug zoals nu. Blijvend en niets bouwt af: tip.
  const V3 = [['i', 'ingreep', 'Opruimdag', 0, 0, { duur:'tijdelijk' }], ['v', 'factor', 'Opgeruimde dossiers', 300, 0], ['u', 'uitkomst', 'Overzicht', 600, 0, { doel:'meer' }]], P3 = [['i', 'v', '+'], ['v', 'u', '+']];
  await laad(kaart('vr', met(V3, { v:{ dyn:'stapel' } }), P3)); const rs = await sim({ i:1 });
  await laad(kaart('vr', V3, P3)); const rm = await sim({ i:1 });
  ok(rs.v.eind === '↑' && rs.u.eind === '↑' && rm.v.eind === '' && rm.u.eind === '', 'stapelt op: blijft na de tijdelijke ingreep (' + rs.v.eind + rs.u.eind + '), meteen: terug zoals nu (' + (rm.v.eind || '-') + (rm.u.eind || '-') + ')');
  await laad(kaart('vr', met(V3, { v:{ dyn:'stapel' }, i:{ duur:'' } }), P3, { ing:{ i:1 } }));
  await ingrijpen(); t = await tips();
  ok(/Niets bouwt "Opgeruimde dossiers" af/.test(t), 'blijvend opstapelen zonder afbouw: tip "Niets bouwt ... af" (' + t + ')');
  await p.click('#sk-band-x').catch(() => {}); await p.waitForTimeout(200);
  ok(/Niets bouwt dit af/.test(await zie()), 'Inzicht: "Niets bouwt dit af" bij een voorraad zonder pijl met −');
  ok(await p.locator('[data-el="v"] .vul').count() === 1, 'op de kaart: een vulstreep onderaan wat opstapelt');
  await laad(kaart('vr2', [['a', 'factor', 'Vermoeidheid', 0, 0], ['f', 'factor', 'Fouten', 300, 0, { dyn:'stapel' }], ['i', 'ingreep', 'Rustpauzes', -300, 0]], [['a', 'f', '+'], ['i', 'a', '-']]));
  ok(!/Niets bouwt dit af/.test(await zie()), 'Inzicht: geen "Niets bouwt dit af" als de voorraad via iets anders kan dalen (minder vermoeidheid, minder fouten)');

  console.log('Paneel, voorbeelden en bewaren');
  // 12. Kiezen in het paneel: Hoe verandert dit? en Hoe lang?
  await laad(kaart('pn', [['f', 'factor', 'Achterstand', 0, 0], ['i', 'ingreep', 'Opruimdag', 300, 0]], [['i', 'f', '-']]));
  await p.click('#b-toe'); await p.click('[data-p="open-el"][data-id="f"]'); await p.waitForTimeout(200);
  const heeftDyn = await p.locator('[data-k="dyn"][data-v="stapel"]').count(); if (heeftDyn) { await p.click('[data-k="dyn"][data-v="stapel"]'); await p.waitForTimeout(200); }
  await p.click('#b-toe'); await p.click('[data-p="open-el"][data-id="i"]'); await p.waitForTimeout(200);
  const heeftDuur = await p.locator('[data-k="duur"][data-v="tijdelijk"]').count(); if (heeftDuur) { await p.click('[data-k="duur"][data-v="tijdelijk"]'); await p.waitForTimeout(200); }
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  let st = await p.evaluate(() => window.systeem.staat());
  ok(st.els.find(e => e.id === 'f').dyn === 'stapel' && st.els.find(e => e.id === 'i').duur === 'tijdelijk', 'Hoe verandert dit? (stapelt op) en Hoe lang? (tijdelijk) blijven bewaard na herladen');
  // 13. Een kaart uit versie 1.1 laadt nog; foute waarden vallen weg.
  await laad({ id:'oud', name:'Oud', over:'', versie:'1.1', ing:{}, els:[{ id:'a', t:'factor', n:'Werkdruk', x:0, y:0, dr:'vlot' }, { id:'b', t:'ingreep', n:'Verbod', x:200, y:0, ik:'Verplichten', duur:'altijd' }, { id:'c', t:'uitkomst', n:'Rust', x:400, y:0, dyn:'stapel' }, { id:'d', t:'factor', n:'Achterstand', x:0, y:160, dyn:'stapel' }], ver:[{ id:'v', a:'b', b:'a', s:'-', w:3 }, { id:'w', a:'a', b:'c', s:'-' }, { id:'x', a:'d', b:'a', s:'+' }] });
  st = await p.evaluate(() => window.systeem.staat());
  ok(st.els.length === 4 && st.ver.length === 3 && st.els[0].pl === 'kans' && st.els[1].ik === 'Sanctie of kost' && !st.els[1].duur && !st.els[2].dyn && st.els[3].dyn === 'stapel' && !st.els[0].dyn, 'een kaart uit 1.1 laadt (oude waarden omgezet); een geldige nieuwe keuze blijft, een foute valt weg');
  // 14. Vier voorbeelden: kiezen in de voorbeeldbalk, open na herladen, en "Maak er mijn eigen van".
  await p.evaluate(() => localStorage.removeItem('systeemkaart.v1')); await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(300);
  const gebaar = await p.evaluate(() => [...document.querySelectorAll('#ocStart .sk-gebaar li')].map(li => li.textContent.replace(/\s+/g, ' ').trim()));
  ok(gebaar.length === 4 && gebaar.some(x => /^Uitkomst/.test(x)), 'startscherm: je tekent dit, je krijgt dit, ook de uitkomst (' + gebaar.join(' | ') + ')');
  await p.click('#example'); await p.waitForTimeout(400);
  const opties = await p.evaluate(() => [...document.querySelectorAll('#vb-kies option')].map(o => o.value));
  ok(opties.length === 4, 'de voorbeeldbalk biedt vier voorbeelden (' + opties + ')');
  if (opties.includes('toxisch')) { await p.selectOption('#vb-kies', 'toxisch'); await p.waitForTimeout(400); }
  await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(400);
  st = await p.evaluate(() => window.systeem.staat());
  const namen = st.els.filter(e => e.t === 'gedrag').map(e => e.wie);
  ok(st.voorbeeld && st.vbId === 'toxisch' && namen.length === 2 && namen.every(w => /^(Leidinggevende|Teamleden)$/.test(w)) && await p.isVisible('#vb-bar'), 'het gekozen voorbeeld blijft open na herladen, met rollen en geen namen (' + st.name + ': ' + namen + ')');
  await p.click('#vb-eigen'); await p.waitForTimeout(300);
  st = await p.evaluate(() => window.systeem.staat());
  ok(!st.voorbeeld && st.els.length === 13 && !(await p.isVisible('#vb-bar')), 'Maak er mijn eigen van: het voorbeeld wordt eigen werk');
  const legende = await p.evaluate(() => (document.querySelector('.sk-mw') || { textContent:'' }).textContent.replace(/\s+/g, ' '));
  ok(/Stapelt op/.test(legende) && /Meteen/.test(legende) && /tijdelijk/.test(legende), 'Meer weten legt meteen, stapelt op en tijdelijk uit');
  for (const id of ['werkdruk', 'thuis', 'premie']) { await p.evaluate(id => { const s = document.getElementById('vb-kies'); if (s) { s.value = id; s.dispatchEvent(new Event('change')); } }, id); await p.waitForTimeout(300); }
  // 15. Tijdelijke ingrepen in A/B, en nooit tegenspraak tussen oordeel, zinnen en tabel: alle voorbeelden x alle paren ingrepen x blijvend, tijdelijk, gemengd.
  console.log('A en B: oordeel, zinnen en tabel spreken elkaar niet tegen');
  const strijd = [], ab = [];
  for (const vb of ['premie', 'werkdruk', 'toxisch', 'thuis']) {
    await p.evaluate(vb => window.systeem.laadVoorbeeld(true, vb), vb); await p.waitForTimeout(250);
    const k0 = await p.evaluate(() => window.systeem.staat()), ing = k0.els.filter(e => e.t === 'ingreep').map(e => e.id);
    for (let i = 0; i < ing.length; i++) for (let j = i + 1; j < ing.length; j++) for (const modus of ['blijvend', 'tijdelijk', 'gemengd']) {
      await p.evaluate(([a, b2, modus]) => { const d = JSON.parse(localStorage.getItem('systeemkaart.v1')), l = d.lists.find(x => x.id === d.current);
        l.els.forEach(e => { if (e.id === a) { if (modus === 'blijvend') delete e.duur; else e.duur = 'tijdelijk'; } if (e.id === b2) { if (modus === 'tijdelijk') e.duur = 'tijdelijk'; else delete e.duur; } });
        l.ingA = { [a]:1 }; l.ing = { [b2]:1 }; localStorage.setItem('systeemkaart.v1', JSON.stringify(d)); }, [ing[i], ing[j], modus]);
      await p.reload({ waitUntil:'networkidle' }); await p.waitForTimeout(150); await p.click('#b-ing'); await p.waitForTimeout(250);
      const r2 = await p.evaluate(() => { const l = window.systeem.staat(), T2 = s => s.replace(/\s+/g, ' ').trim();
        const tab = {}; document.querySelectorAll('.sk-tab tbody tr').forEach(tr => { const c2 = tr.querySelectorAll('td'); tab[T2(tr.querySelector('th').textContent)] = [0, 1].map(x => ({ p:(c2[x].querySelector('i') || {}).textContent || '', s:T2(c2[x].textContent) })); });
        const zin = T2((document.querySelector('#sk-ab ~ .sk-zin') || {}).textContent || ''), oo = T2((document.querySelector('.sk-oordeel') || {}).textContent || '');
        return { tab, zin, oo, u:l.els.filter(e => e.t === 'uitkomst' && e.doel).map(e => ({ n:e.n, doel:e.doel })) }; });
      const tag = vb + ' ' + modus + ' ' + ing[i] + '/' + ing[j];
      r2.u.forEach(u => {
        const rij = Object.entries(r2.tab).find(([n]) => u.n.startsWith(n.replace(/…$/, '')));
        const wil = u.doel === 'meer' ? '↑' : '↓', A2 = rij ? rij[1][0] : { p:'', s:'' }, B2 = rij ? rij[1][1] : { p:'', s:'' };
        const kl = u.n.charAt(0).toLowerCase() + u.n.slice(1), zinU = (r2.oo.split(/(?<=\.) /).find(x => x.includes(kl)) || ''), regel = (r2.zin.split(/(?<=\.)(?=[A-Z])/).find(x => x.startsWith(u.n.slice(0, 20))) || '');
        if (zinU) ab.push(tag + ': ' + zinU);
        if (/niet de kant op die je wil/.test(zinU) && (A2.p === wil || B2.p === wil)) strijd.push(tag + ': "' + zinU + '" maar de tabel toont ' + A2.p + '/' + B2.p);
        const m = /doet (A|B) het volgens je kaart beter/.exec(zinU); if (m && (m[1] === 'A' ? A2 : B2).p !== wil) strijd.push(tag + ': "' + zinU + '" maar ' + m[1] + ' toont ' + ((m[1] === 'A' ? A2 : B2).p || 'niets'));
        if (m && /met A en B hetzelfde/.test(regel)) strijd.push(tag + ': "' + zinU + '" naast "' + regel + '"');
        const e2 = /met (A|B) eerst de andere kant op/.exec(regel); if (e2 && !/eerst andersom/.test((e2[1] === 'A' ? A2 : B2).s)) strijd.push(tag + ': "' + regel + '" maar de tabel zegt dat niet (' + (e2[1] === 'A' ? A2 : B2).s + ')');
      });
    }
  }
  ok(!strijd.length, 'over ' + ab.length + ' oordelen geen tegenspraak met de tabel of de zinnen' + (strijd.length ? ': ' + strijd.slice(0, 4).join(' || ') : ''));
  if (process.env.TOON) console.log(ab.filter(x => /tijdelijk|gemengd/.test(x)).join('\n'));
  const wd = ab.filter(x => /^(werkdruk|premie) tijdelijk/.test(x));
  ok(wd.length >= 7 && wd.every(x => /Op zijn sterkst/.test(x) && !/niet de kant op die je wil/.test(x)), 'A en B allebei tijdelijk (werkdruk, premieloket): de tool beoordeelt de werking, niet het uitgedoofde einde (' + wd.slice(0, 2).join(' | ') + ')');
  await p.evaluate(() => window.systeem.laadVoorbeeld(true, 'premie')); await p.waitForTimeout(200);
  ok(await p.evaluate(() => window.systeem.staat().els.find(e => e.n === 'Tijdelijke extra kracht').duur === 'tijdelijk'), 'premieloket: "Tijdelijke extra kracht" staat op tijdelijk');
  ok(!PE.length, '(controle) geen fouten in de pagina ' + PE.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
