// Koppeling Systeemkaart en Gedragsverandering: een gedrag doorgeven, en acties terug overnemen als ingreep.
const { chromium } = require('playwright'); const B = 'http://127.0.0.1:' + (process.env.PORT || 9461);
const fout = []; const ok = (c, m) => { console.log((c ? '  ok   ' : '  FOUT ') + m); if (!c) fout.push(m); };
(async () => { const b = await chromium.launch(); const c = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' }); const p = await c.newPage(); const E = []; p.on('pageerror', e => E.push(String(e).slice(0, 200)));
  await p.goto(B + '/systeemkaart/', { waitUntil: 'networkidle' }); await p.evaluate(() => window.systeem.laadVoorbeeld(true)); await p.waitForTimeout(500);
  await p.click('#vb-eigen'); await p.waitForTimeout(200);
  const id = await p.evaluate(() => window.systeem.staat().els.find(e => e.n === 'maken overuren').id);
  const r = await p.locator(`[data-el="${id}"] .vorm`).boundingBox(); await p.mouse.click(r.x + r.width / 2, r.y + r.height / 2); await p.waitForTimeout(250);
  await Promise.all([p.waitForURL(/\/gedrag\/\?van=systeemkaart/), p.click('[data-p="naar-gedrag"]')]);
  await p.waitForLoadState('networkidle'); await p.waitForTimeout(600);
  const st = await p.evaluate(() => JSON.parse(localStorage.getItem('gedrag.v1')));
  const u = st && st.units.find(x => x.id === st.current);
  ok(u && u.wie === 'Teamleden' && u.wat === '' && u.kaartOud === 'maken overuren', 'Gedragsverandering kreeg wie mee, en het ongewenste gedrag apart: Wat blijft leeg (' + (u && u.wie + ' / ' + u.wat + ' / ' + u.kaartOud) + ')');
  ok(u && u.kaart && u.kaart.some(k => k.t === 'Werkdruk' && k.e === '-') && u.kaartDoel === 'minder' && u.kaart.some(k => /Vermoeidheid|Werkdruk/.test(k.t)), 'en wat erop inwerkt, ten opzichte van de verandering (overuren minder: meer werkdruk remt) (' + (u && JSON.stringify(u.kaart)) + ')');
  ok(u && Array.isArray(u.kaartUit) && u.kaartUit.length > 0, 'en tot welke uitkomsten het gedrag leidt (' + (u && JSON.stringify(u.kaartUit)) + ')');
  ok(u && Array.isArray(u.kaartOm) && u.kaartOm.every(k => k.via), 'en wat er via een tussenstap op inwerkt, met "via" (' + (u && JSON.stringify(u.kaartOm)) + ')');
  console.log('     blok: ' + (await p.textContent('.kaart-blok')).replace(/\s+/g, ' ').slice(0, 600));
  ok(await p.isVisible('.kaart-blok') && /Uit je systeemkaart/.test(await p.textContent('.kaart-blok')), 'het blok "Uit je systeemkaart" staat in stap 1');
  ok(await p.evaluate(() => localStorage.getItem('oc.naar.gedrag') === null), 'de overdracht wordt maar één keer gebruikt');
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  const st2 = await p.evaluate(() => JSON.parse(localStorage.getItem('gedrag.v1')));
  ok(st2.units.filter(x => x.wie === 'Teamleden' && x.kaartOud === 'maken overuren').length === 1, 'herladen maakt geen tweede gedrag');
  // overuren wil je minder: wat doen ze in de plaats? Dat wordt het gedrag in Gedragsverandering
  ok(/In de plaats van/.test(await p.textContent('.kaart-blok')), 'het blok zegt: in de plaats van maken overuren');
  await p.fill('#f-wat', 'werken binnen hun uren'); await p.waitForTimeout(500);
  const st3 = await p.evaluate(() => JSON.parse(localStorage.getItem('gedrag.v1'))); const u3 = st3.units.find(x => x.id === st3.current);
  ok(u3.wat === 'werken binnen hun uren' && u3.kaartOud === 'maken overuren', 'het nieuwe gedrag staat er, met het gedrag van de kaart erbij (' + u3.wat + ' / ' + u3.kaartOud + ')');
  // een actie toevoegen in Gedragsverandering en terug overnemen als ingreep
  await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('gedrag.v1')); const u2 = d.units.find(x => x.id === d.current); u2.acts.push({ id:'a1', text:'Werkdruk elke vrijdag samen herverdelen', part:'vlot', help:'tijd', who:'', when:'', done:false }); localStorage.setItem('gedrag.v1', JSON.stringify(d)); });
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(800);
  ok(await p.evaluate(() => { const d = JSON.parse(localStorage.getItem('oc.share.gedrag') || 'null'); return !!(d && d.lists.some(l => l.items.some(i => i.type === 'actie'))); }), 'Gedragsverandering legt de actie klaar');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('oc.share.gedrag')).lists.some(l => l.items.some(i => i.type === 'actie' && /· Vlot te doen · in de plaats van maken overuren$/.test(i.note || '')))), 'de actie draagt haar deel en het gedrag van de kaart mee in de notitie');
  await p.goto(B + '/systeemkaart/', { waitUntil: 'networkidle' }); await p.waitForTimeout(400);
  await p.evaluate(() => { const S = window.systeem; S._zet(S.staat().els.find(e => e.n === 'Werkdruk').id, 'pl', 'kans'); });   // een factor met pijler: daar moet de pijl van de actie naartoe
  await p.click('#b-toe'); await p.waitForTimeout(250);
  ok(await p.isVisible('[data-p="imp-acties"]'), 'Toevoegen toont "Acties overnemen als ingreep"');
  await p.click('[data-p="imp-acties"]'); await p.waitForTimeout(400);
  const item = p.locator('.ocs-item').first(); if (await item.count()) { await item.click().catch(() => {}); }
  const okb = p.locator('.ocs-ok'); if (await okb.isDisabled().catch(() => true)) { const cb = p.locator('.ocs-item input').first(); if (await cb.count()) await cb.check().catch(() => {}); }
  await okb.click(); await p.waitForTimeout(400);
  const s3 = await p.evaluate(() => window.systeem.staat());
  const ing = s3.els.find(e => e.t === 'ingreep' && e.n === 'Werkdruk elke vrijdag samen herverdelen');
  ok(!!ing, 'de actie staat als ingreep op de kaart');
  const pijl = ing && s3.ver.find(v => v.a === ing.id), doelEl = pijl && s3.els.find(e => e.id === pijl.b);
  ok(pijl && pijl.z && doelEl && doelEl.n === 'Werkdruk' && pijl.s === '-', 'en is verbonden met de factor die ze aanpakt: minder werkdruk, want je wil minder overuren (vermoeden, naar ' + (doelEl && doelEl.n) + ')');
  ok(ing && ing.ik === 'Hindernissen wegnemen', 'de soort ingreep is afgeleid uit het deel Vlot te doen (' + (ing && ing.ik) + ')');
  // een vaste aanpak uit Gedragsverandering: soort uit de tekst, en de pijl gaat naar de factor met de juiste pijler
  const s4 = await p.evaluate(() => { const S = window.systeem, l = S.staat(); const g = l.els.find(e => e.n === 'maken overuren'); const f = S.nieuwEl ? null : null; return { g:g.id, fac:l.ver.filter(v => v.b === g.id).map(v => { const e = l.els.find(x => x.id === v.a); return e.n + ':' + e.t + ':' + (e.pl || '') + ':' + v.s; }) }; });
  console.log('     inwerkend op het gedrag: ' + s4.fac.join(', '));
  ok(!E.length, 'geen fouten ' + E.join(' | '));
  await b.close(); console.log(fout.length ? fout.length + ' FOUT' : 'alles ok'); process.exit(fout.length ? 1 : 0); })();
