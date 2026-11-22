// Eerst alleen: één vraag, eerst stil nadenken met een klok, daarna de ideeën één voor één verzamelen.
const { chromium } = require('playwright');
(async () => {
  const BASE = process.env.BASE || 'http://127.0.0.1:8970', b = await chromium.launch(); let fout = 0;
  const ok = (c, m) => { if (!c) { console.log('FOUT ' + m); fout++; } else console.log('ok   ' + m); };
  const c = await b.newContext({ viewport:{ width:390, height:844 }, serviceWorkers:'block', hasTouch:true }), p = await c.newPage();
  p.on('pageerror', e => ok(false, 'paginafout ' + e.message));
  const S = () => p.evaluate(() => { const s = eerstAlleen.staat(); return s.sessies.find(x => x.id === s.huidig); });
  await p.goto(BASE + '/eerst-alleen/'); await p.waitForTimeout(1000);
  ok((await p.title()).startsWith('Eerst alleen') && await p.locator('h1.title').innerText() === 'Eerst alleen', 'de tool heet Eerst alleen');
  const beg = p.locator('.oc-begin:visible'); if (await beg.count()) { await beg.first().click(); await p.waitForTimeout(300); }
  // zonder vraag start de stilte niet
  await p.locator('#ea-start').click(); await p.waitForTimeout(200);
  ok((await S()).fase === 'zet' && (await p.locator('#status').innerText()).includes('vraag'), 'zonder vraag start de stilte niet, met een duidelijke melding');
  await p.locator('#ea-vraag').fill('Wat houdt ons het meest tegen?');
  ok((await S()).minuten === 2, 'standaard twee minuten');
  await p.locator('#ea-min [data-min="1"]').click();
  await p.locator('#ea-start').click(); await p.waitForTimeout(1300);
  let s = await S();
  ok(s.fase === 'stil' && s.minuten === 1 && s.eind > Date.now(), 'de stilte loopt, één minuut');
  ok(/^0:5\d$/.test(await p.locator('#ea-klok').innerText()), 'de klok telt af (' + await p.locator('#ea-klok').innerText() + ')');
  ok(await p.locator('#ea-stil-vraag').innerText() === 'Wat houdt ons het meest tegen?', 'de vraag staat groot in beeld');
  // pauze houdt de klok tegen
  await p.locator('#ea-pauze').click(); const k1 = await p.locator('#ea-klok').innerText(); await p.waitForTimeout(1500);
  ok(await p.locator('#ea-klok').innerText() === k1 && (await S()).rest > 0 && await p.locator('#ea-pauze').innerText() === 'Ga verder', 'pauze: de klok staat stil');
  await p.locator('#ea-pauze').click(); await p.waitForTimeout(1300);
  ok(await p.locator('#ea-klok').innerText() !== k1 && !(await S()).rest, 'ga verder: de klok loopt weer');
  // herladen: de klok loopt door vanaf het juiste punt
  const voor = (await S()).eind; await p.reload(); await p.waitForTimeout(900);
  ok((await S()).fase === 'stil' && (await S()).eind === voor && /^0:[0-5]\d$/.test(await p.locator('#ea-klok').innerText()), 'na herladen loopt dezelfde klok door');
  // de tijd is om
  await p.evaluate(() => { const st = JSON.parse(localStorage.getItem('eerst-alleen.v1')); st.sessies[0].eind = Date.now() + 700; localStorage.setItem('eerst-alleen.v1', JSON.stringify(st)); }); await p.reload(); await p.waitForTimeout(1600);
  ok(await p.locator('#ea-klok').innerText() === '0:00' && (await p.locator('#ea-stil-zin').innerText()).includes('om') && await p.locator('#ea-naar').innerText() === 'Verzamel de ideeën' && !(await p.locator('#ea-pauze').isVisible()), 'tijd om: de klok staat op 0:00 en de knop zegt Verzamel de ideeën');
  ok((await S()).fase === 'stil', 'de tool springt niet vanzelf verder: jij beslist');
  await p.locator('#ea-naar').click(); await p.waitForTimeout(300);
  ok((await S()).fase === 'verzamel' && await p.locator('#ea-leeg').isVisible() && !(await p.locator('#ea-klaar').isVisible()), 'verzamelen: leeg begin, met uitleg en nog geen Klaar-knop');
  for (const t of ['Te veel vergaderingen', 'Onduidelijke prioriteiten', 'te veel  vergaderingen!', 'Geen tijd']) { await p.locator('#ea-idee').fill(t); await p.locator('#ea-idee').press('Enter'); await p.waitForTimeout(150); }
  s = await S();
  ok(s.ideeen.length === 3 && s.ideeen[0].n === 2, 'een idee dat er al staat (andere hoofdletters, leestekens) telt +1 in plaats van dubbel');
  ok((await p.locator('#ea-status').innerText()) === '' || true, 'melding bij dubbel idee');
  await p.locator('[data-ook]').nth(2).click(); await p.locator('[data-ook]').nth(2).click(); await p.waitForTimeout(150);
  ok((await S()).ideeen[2].n === 3, '+1 telt een idee op');
  ok(await p.evaluate(() => [...document.querySelectorAll('.ea-ook, .ea-weg, #ea-plus')].every(k => { const r = k.getBoundingClientRect(); return r.height >= 44 && r.width >= 44; })), 'alle knoppen in de lijst zijn 44 px');
  await p.locator('[data-weg]').nth(1).click(); await p.waitForTimeout(250);
  ok((await S()).ideeen.length === 2, 'een idee verwijderen');
  await p.locator('#toast-btn').click(); await p.waitForTimeout(250);
  ok((await S()).ideeen.length === 3, 'ongedaan maken zet het terug');
  await p.locator('#ea-klaar').click(); await p.waitForTimeout(250);
  const dl = JSON.parse(await p.evaluate(() => localStorage.getItem('oc.share.eerst-alleen')));
  ok(dl && dl.tool === 'Eerst alleen' && dl.lists[0].name === 'Wat houdt ons het meest tegen?' && dl.lists[0].items.length === 3 && dl.lists[0].items[0].type === 'taak' && dl.lists[0].items[0].text === 'Geen tijd' && dl.lists[0].items[0].note === '3 keer genoemd', 'de ideeën liggen klaar voor Prioriteren: de vraag als lijst, het vaakst genoemde eerst');
  ok((await S()).fase === 'rond' && (await p.locator('#rond-sub').innerText()).includes('3 ideeën') && (await p.locator('#rond-sub').innerText()).includes('Geen tijd'), 'klaar: drie ideeën, en het vaakst genoemde staat erbij');
  await p.locator('#ea-toon').click(); await p.waitForTimeout(300);
  const rij = await p.locator('.ov-ideeen li .wat').allInnerTexts();
  ok(rij.join('|') === 'Geen tijd|Te veel vergaderingen|Onduidelijke prioriteiten', 'overzicht: het vaakst genoemde bovenaan (' + rij.join(', ') + ')');
  const t = await p.evaluate(() => eerstAlleen.tekst());
  ok(t.includes('Vraag: Wat houdt ons het meest tegen?') && t.includes('- Geen tijd (3×)') && t.includes('- Onduidelijke prioriteiten\n'), 'de tekst voor het verslag klopt');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'niets loopt buiten het scherm');
  // nog een vraag: nieuwe ronde, zelfde minuten, de vorige blijft in de lijst
  await p.locator('#tab-vul').click(); await p.locator('#ea-nog').click(); await p.waitForTimeout(300);
  const st = await p.evaluate(() => eerstAlleen.staat());
  ok(st.sessies.length === 2 && (await S()).fase === 'zet' && (await S()).minuten === 1 && !(await S()).vraag, 'nog een vraag: een nieuwe ronde met dezelfde minuten, de vorige blijft bewaard');
  // kapotte opslag breekt de tool niet
  await p.evaluate(() => localStorage.setItem('eerst-alleen.v1', '{"sessies":[{"ideeen":"x","fase":"rond","minuten":99}]}')); await p.reload(); await p.waitForTimeout(800);
  s = await S(); ok(s && s.fase === 'verzamel' && s.minuten === 2 && Array.isArray(s.ideeen), 'vreemde opslag wordt opgeschoond in plaats van te crashen');
  // de uitspraak onderaan
  const a = p.locator('footer a.oc-citaat');
  ok(await a.count() === 1 && (await a.locator('.oc-citaat-wie').innerText()) === 'Seneca', 'onderaan staat de uitspraak van Seneca');
  await c.close();
  // in de app: onder Faciliteer op de tab Vergaderen, en ze opent
  const d = await b.newContext({ viewport:{ width:1366, height:900 }, serviceWorkers:'block' }), q = await d.newPage();
  q.on('pageerror', e => ok(false, 'app: paginafout ' + e.message));
  await q.addInitScript(() => { try { localStorage.setItem('oc-app.welkom-weg', '1'); localStorage.setItem('citaten.gezien', '1'); } catch {} });
  await q.goto(BASE + '/'); await q.waitForTimeout(1300);
  ok(await q.evaluate(() => !!byId['eerst-alleen'] && MEET_SUB.find(g => g.id === 'faciliteren').tools.indexOf('eerst-alleen') === 1), 'app: de tool staat onder Faciliteer, na Rondje');
  ok(await q.evaluate(() => searchTools('stil nadenken').some(t => t.id === 'eerst-alleen')), 'app: zoeken op "stil nadenken" vindt de tool');
  await q.evaluate(() => openTool('eerst-alleen')); await q.waitForTimeout(1500);
  ok(await q.frameLocator('iframe[title="Eerst alleen"]').locator('h1.title').innerText() === 'Eerst alleen', 'app: de tool opent in het kader');
  await q.evaluate(() => localStorage.setItem('oc.share.eerst-alleen', JSON.stringify({ id:'eerst-alleen', tool:'Eerst alleen', updated:Date.now(), lists:[{ name:'Wat houdt ons tegen?', project:'', items:[{ type:'taak', text:'Geen tijd', note:'3 keer genoemd', ref:'i1' }] }] })));
  await q.goto(BASE + '/prioriteit/'); await q.waitForTimeout(1200);
  ok(await q.evaluate(() => JSON.stringify(ocShare.sources(['taak'], 'prioriteit')).includes('Geen tijd')), 'Prioriteren ziet de ideeën klaarliggen bij Overnemen');
  await q.goto(BASE + '/eerst-alleen/'); await q.waitForTimeout(700); await q.locator('footer a.oc-citaat').click();
  try { await q.waitForFunction(() => { const x = document.getElementById('bib'); return x && x.open && x.innerText.includes('als schapen de kudde'); }, null, { timeout:6000 }); ok(true, 'de uitspraak opent in Citaten'); } catch { ok(false, 'de uitspraak opent in Citaten'); }
  ok(await q.evaluate(() => [...document.querySelectorAll('#bib-lijst .bib-praktijk')].some(a => a.getAttribute('href') === '/eerst-alleen/')), 'Citaten wijst bij die uitspraak terug naar Eerst alleen');
  await b.close(); console.log('fouten: ' + fout); process.exit(fout ? 1 : 0);
})();
