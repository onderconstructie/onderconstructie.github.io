// Samen beslissen: één voorstel, iedereen toont tegelijk een kaart van 0 tot 5, en de telling zegt of de groep verder kan.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true }), p = await c.newPage();
  p.on('pageerror', e => ok(false, 'paginafout ' + e.message));
  const S = () => p.evaluate(() => { const s = samenBeslissen.staat(); return s.sessies.find(x => x.id === s.huidig); });
  const plus = async (i, n) => { for (let k = 0; k < n; k++) { await p.locator(`[data-plus="${i}"]`).click(); await p.waitForTimeout(40); } };
  await p.goto(BASE + '/samen-beslissen/'); await p.waitForTimeout(1000);
  ok(await p.locator('h1.title').innerText() === 'Samen beslissen', 'de tool heet Samen beslissen');
  // de regels van de uitslag, los van het scherm
  const R = await p.evaluate(() => [[0,0,0,1,3,2],[0,0,1,0,3,2],[0,1,1,0,3,2],[1,0,0,0,0,5],[0,0,0,0,0,0]].map(t => samenBeslissen.oordeel(t).soort));
  ok(R.join() === 'ja,bijna,nee,nee,', 'regels: niemand onder 3 is beslist, een 2 is bijna, een 0 of 1 is nog niet (' + R.join() + ')');
  const beg = p.locator('.oc-begin:visible'); if (await beg.count()) { await beg.first().click(); await p.waitForTimeout(300); }
  await p.locator('#sb-start').click(); await p.waitForTimeout(200);
  ok((await S()).fase === 'zet' && (await p.locator('#status').innerText()).includes('voorstel'), 'zonder voorstel start de stemming niet');
  await p.locator('#sb-voorstel').fill('We starten in maart met de proef.'); await p.locator('#sb-start').click(); await p.waitForTimeout(300);
  ok((await S()).fase === 'tel' && await p.locator('#sb-toon').isDisabled(), 'tellen: de uitslag kan pas als er iets geteld is');
  ok(await p.evaluate(() => [...document.querySelectorAll('.sb-stap button')].every(k => { const r = k.getBoundingClientRect(); return r.width >= 44 && r.height >= 44; })), 'plus en min zijn 44 px');
  await plus(5, 2); await plus(4, 3); await plus(2, 2); await p.locator('[data-min="2"]').click(); await p.waitForTimeout(100);
  ok((await S()).tel.join() === '0,0,1,0,3,2' && (await p.locator('#sb-som').innerText()).includes('6 kaarten'), 'de telling klopt, min werkt ook');
  ok(await p.locator('[data-min="0"]').isDisabled(), 'min kan niet onder nul');
  await p.locator('#sb-toon').click(); await p.waitForTimeout(300);
  ok(await p.locator('#sb-u-titel').innerText() === 'Bijna' && (await p.locator('#sb-u-zin').innerText()).includes('1 persoon heeft een bedenking') && !(await p.locator('#sb-log').isVisible()), 'uitslag: Bijna, met wie eerst gehoord moet worden');
  ok(!localStorage_has(await p.evaluate(() => localStorage.getItem('oc.share.samen-beslissen'))), 'wat nog niet beslist is, ligt niet klaar voor het Beslissingslog');
  await p.locator('#sb-nota').fill('Eén team in plaats van twee.'); await p.locator('#sb-opnieuw').click(); await p.waitForTimeout(300);
  let s = await S();
  ok(s.fase === 'tel' && s.rondes.length === 1 && s.rondes[0].nota === 'Eén team in plaats van twee.' && s.tel.join() === '0,0,0,0,0,0' && await p.locator('#sb-ronde').innerText() === 'Ronde 2', 'stem opnieuw: ronde 1 is bewaard met haar nota, ronde 2 begint leeg');
  await plus(5, 2); await plus(4, 3); await plus(3, 1); await p.locator('#sb-toon').click(); await p.waitForTimeout(300);
  ok(await p.locator('#sb-u-titel').innerText() === 'Beslist' && (await p.locator('#sb-u-zin').innerText()).includes('4,2 op 5') && await p.locator('#sb-log').isVisible(), 'ronde 2: Beslist, gemiddeld 4,2 op 5, met de verwijzing naar het Beslissingslog');
  const d = JSON.parse(await p.evaluate(() => localStorage.getItem('oc.share.samen-beslissen')));
  ok(d && d.lists[0].items[0].type === 'besluit' && d.lists[0].items[0].text === 'We starten in maart met de proef.' && /^\d{4}-\d\d-\d\d$/.test(d.lists[0].items[0].when), 'het besluit ligt klaar in de vaste vorm, met datum');
  // herladen bewaart alles
  await p.reload(); await p.waitForTimeout(800);
  ok((await S()).fase === 'uitslag' && (await S()).rondes.length === 1 && await p.locator('#sb-u-titel').innerText() === 'Beslist', 'na herladen staat alles er nog');
  // de stemkaart
  await p.locator('#sb-kaart-open').click(); await p.waitForTimeout(300);
  ok(await p.locator('#sb-kies .sb-kz').count() === 6, 'stemkaart: zes keuzes, van 5 tot 0');
  await p.locator('[data-kaart="1"]').click(); await p.waitForTimeout(250);
  ok(await p.locator('#sb-groot-n').innerText() === '1' && await p.locator('#sb-groot-k').innerText() === 'Groot bezwaar' && await p.evaluate(() => { const r = document.getElementById('sb-groot-n').getBoundingClientRect(); return r.height > innerHeight * 0.2; }), 'een tik toont één groot cijfer met wat het betekent');
  await p.locator('#sb-groot').click(); await p.waitForTimeout(200);
  ok(await p.locator('#sb-kies').isVisible(), 'een tik op het cijfer brengt je terug naar de keuze');
  await p.locator('#sb-kaart-x').click(); await p.waitForTimeout(200);
  ok(!(await p.evaluate(() => document.getElementById('kaart').open)) && (await S()).fase === 'uitslag', 'de stemkaart sluit en verandert niets aan de stemming');
  await p.locator('#sb-klaar').click(); await p.waitForTimeout(300);
  ok(await p.locator('.ov-ronde').count() === 2 && (await p.locator('.ov-ronde').first().innerText()).includes('Bijna') && (await p.locator('.ov-ronde').nth(1).innerText()).includes('Beslist'), 'overzicht: beide rondes onder elkaar');
  const t = await p.evaluate(() => samenBeslissen.tekst());
  ok(t.includes('Voorstel: We starten in maart met de proef.') && t.includes('Ronde 1: Bijna') && t.includes('Nota: Eén team in plaats van twee.') && t.includes('Ronde 2: Beslist (6 kaarten, gemiddeld 4,2 op 5)'), 'de tekst voor het verslag klopt');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'niets loopt buiten het scherm');
  await p.evaluate(() => localStorage.setItem('samen-beslissen.v1', '{"sessies":[{"tel":"x","fase":"uitslag","rondes":[{"tel":[9,9]}]}]}')); await p.reload(); await p.waitForTimeout(800);
  s = await S(); ok(s && s.fase === 'tel' && s.tel.join() === '0,0,0,0,0,0' && s.rondes.length === 0, 'vreemde opslag wordt opgeschoond in plaats van te crashen');
  ok(await p.locator('footer a.oc-citaat .oc-citaat-wie').innerText() === 'Seneca', 'onderaan staat de uitspraak van Seneca');
  await c.close();
  // in de app, en het Beslissingslog neemt het besluit over
  const e = await b.newContext({ viewport:{ width:1366, height:900 }, serviceWorkers:'block' }), q = await e.newPage();
  q.on('pageerror', x => ok(false, 'app: paginafout ' + x.message));
  await q.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('citaten.gezien', '1'); } catch {} });
  await q.goto(BASE + '/'); await q.waitForTimeout(1300);
  ok(await q.evaluate(() => !!byId['samen-beslissen'] && MEET_SUB.find(g => g.id === 'faciliteren').tools.indexOf('samen-beslissen') === 2), 'app: de tool staat onder Faciliteer, na Rondje en Eerst alleen');
  await q.evaluate(() => localStorage.setItem('oc.share.samen-beslissen', JSON.stringify({ id:'samen-beslissen', tool:'Samen beslissen', updated:Date.now(), lists:[{ name:'Stemming', project:'', items:[{ type:'besluit', text:'We starten in maart met de proef.', note:'Samen beslist: 6 kaarten, gemiddeld 4,2 op 5', when:'2026-11-22', ref:'s1' }] }] })));
  await q.goto(BASE + '/beslissingen/'); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => ocShare.sources(['besluit'], 'beslissingen').some(s => /Samen beslissen/.test(s.tool || s.naam || s.source || JSON.stringify(s)))), 'het Beslissingslog ziet het besluit klaarliggen bij Overnemen');
  await q.goto(BASE + '/samen-beslissen/'); await q.waitForTimeout(700); await q.locator('footer a.oc-citaat').click();
  try { await q.waitForFunction(() => { const x = document.getElementById('bib'); return x && x.open && x.innerText.includes('zonder de andere kant te horen'); }, null, { timeout:6000 }); ok(true, 'de uitspraak opent in Citaten'); } catch { ok(false, 'de uitspraak opent in Citaten'); }
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
  function localStorage_has(v) { return !!v; }
})();
